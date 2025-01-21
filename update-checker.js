const { app } = require("electron");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Add logging functionality
function writeLog(message) {
  const logPath = path.join(app.getPath("temp"), "PrintPhotoApp-UpdateChecker.log");
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Write to file
  fs.appendFileSync(logPath, logMessage);
  // Also log to console
  console.log(message);
}

class DownloadCancelledError extends Error {
  constructor() {
    super("Download cancelled");
    this.name = "DownloadCancelledError";
  }
}

class UpdateChecker {
  constructor() {
    this.owner = "ScottBruton";
    this.repo = "PrintPhotoApp";
    this.currentVersion = app.getVersion();
    this.abortController = null;
  }

  cancelDownload() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async checkForUpdates() {
    try {
      const latestRelease = await this.getLatestRelease();

      if (!latestRelease) {
        throw new Error("Could not fetch latest release information");
      }

      const latestVersion = latestRelease.tag_name.replace("v", "");
      const needsUpdate =
        this.compareVersions(latestVersion, this.currentVersion) > 0;

      return {
        needsUpdate,
        currentVersion: this.currentVersion,
        latestVersion: latestVersion,
        downloadUrl: needsUpdate ? this.getInstallerUrl(latestRelease) : null,
      };
    } catch (error) {
      console.error("Error checking for updates:", error);
      throw error;
    }
  }

  getInstallerUrl(release) {
    const asset = release.assets.find(
      (asset) => asset.name.endsWith(".exe") && asset.name.includes("Setup")
    );
    return asset ? asset.browser_download_url : null;
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  getLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.github.com",
        path: `/repos/${this.owner}/${this.repo}/releases/latest`,
        headers: {
          "User-Agent": "PrintPhotoApp-UpdateChecker",
        },
      };

      https
        .get(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        })
        .on("error", reject);
    });
  }

  async downloadUpdate(url, progressCallback) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(
        app.getPath("temp"),
        "PrintPhotoApp-Setup.exe"
      );
      console.log("Downloading to:", tempPath);

      // Delete existing file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
          console.log("Removed existing installer file");
        } catch (err) {
          console.error("Error removing existing file:", err);
        }
      }

      const file = fs.createWriteStream(tempPath);
      this.abortController = new AbortController();

      const handleResponse = (response) => {
        if (this.abortController.signal.aborted) {
          file.end();
          fs.unlink(tempPath, () => {});
          reject(new DownloadCancelledError());
          return;
        }

        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          console.log("Following redirect to:", response.headers.location);
          https
            .get(response.headers.location, handleResponse)
            .on("error", (err) => {
              file.end();
              fs.unlink(tempPath, () => {});
              console.error("Redirect error:", err);
              reject(err);
            });
          return;
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Download failed with status code: ${response.statusCode}`
            )
          );
          return;
        }

        const totalLength = parseInt(response.headers["content-length"], 10);
        console.log("Total download size:", totalLength, "bytes");
        let downloadedLength = 0;

        response.pipe(file);

        response.on("data", (chunk) => {
          downloadedLength += chunk.length;
          const progress = (downloadedLength / totalLength) * 100;
          console.log(`Download progress: ${Math.round(progress)}%`);
          if (progressCallback) {
            progressCallback(progress);
          }
        });

        file.on("finish", () => {
          file.end();
          setTimeout(() => {
            if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
              console.log("Download completed successfully");
              resolve(tempPath);
            } else {
              reject(new Error("Downloaded file is empty or missing"));
            }
          }, 1000);
        });
      };

      const request = https.get(url, handleResponse).on("error", (err) => {
        file.end();
        fs.unlink(tempPath, () => {});
        console.error("Download error:", err);
        reject(err);
      });

      this.abortController.signal.addEventListener("abort", () => {
        request.destroy();
        file.end();
        fs.unlink(tempPath, () => {});
        reject(new DownloadCancelledError());
      });
    });
  }

  async installUpdate(installerPath) {
    return new Promise((resolve, reject) => {
      try {
        writeLog("=== Installation Process Started ===");
        
        if (!fs.existsSync(installerPath)) {
          const error = `Installer not found at path: ${installerPath}`;
          writeLog(error);
          reject(new Error(error));
          return;
        }

        const fullPath = path.resolve(installerPath);
        const isDevMode = process.defaultApp || /[\\/]electron/i.test(process.execPath);
        const currentInstallPath = isDevMode
          ? process.cwd()
          : path.dirname(app.getPath("exe"));

        writeLog("Installation details:");
        writeLog(`- Installer path: ${fullPath}`);
        writeLog(`- Current install path: ${currentInstallPath}`);
        writeLog(`- Is dev mode: ${isDevMode}`);

        // Copy UpdateScript.ps1 to temp directory
        const psScriptPath = path.join(app.getPath("temp"), "UpdateScript.ps1");
        
        // Try different locations for the PowerShell script
        let psSourcePath;
        const possiblePaths = [
          path.join(__dirname, "UpdateScript.ps1"), // Development
          path.join(process.resourcesPath, "UpdateScript.ps1"), // Production
          path.join(app.getAppPath(), "UpdateScript.ps1"), // Alternative
        ];

        writeLog("\nSearching for UpdateScript.ps1 in:");
        possiblePaths.forEach(p => writeLog(`- ${p}`));
        
        psSourcePath = possiblePaths.find(p => fs.existsSync(p));
        
        if (!psSourcePath) {
          const error = "PowerShell script not found in any of the expected locations!";
          writeLog(error);
          reject(new Error(error));
          return;
        }

        writeLog(`\nFound script at: ${psSourcePath}`);
        writeLog(`Will copy to: ${psScriptPath}`);

        // Copy the script
        try {
          fs.copyFileSync(psSourcePath, psScriptPath);
          writeLog("PowerShell script copied successfully");
        } catch (copyError) {
          writeLog(`Error copying PowerShell script: ${copyError}`);
          reject(copyError);
          return;
        }

        // Verify the script was copied
        if (!fs.existsSync(psScriptPath)) {
          const error = "PowerShell script not found at destination after copy!";
          writeLog(error);
          reject(new Error(error));
          return;
        }

        // In development mode, just show what would happen
        if (isDevMode) {
          writeLog("\n=== Development Mode - Update Simulation ===");
          writeLog(`Would execute PowerShell script at: ${psScriptPath}`);
          writeLog("\nIn production:");
          writeLog("1. App would quit");
          writeLog("2. PowerShell script would handle the update");
          writeLog("3. New version would start automatically");
          writeLog("=====================================");
          resolve();
          return;
        }

        // Execute PowerShell script using spawn
        writeLog("\nLaunching PowerShell script...");
        
        // Create a batch file to run PowerShell elevated
        const batchPath = path.join(app.getPath("temp"), "RunUpdate.bat");
        const batchContent = `@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -InstallerPath "${fullPath}"
`;
        
        writeLog("Creating batch file:");
        writeLog(batchContent);
        fs.writeFileSync(batchPath, batchContent);

        const ps = spawn('runas', [
          '/user:Administrator',
          `cmd.exe /c "${batchPath}"`
        ], {
          windowsHide: false,
          stdio: 'pipe',
          shell: true,
          windowsVerbatimArguments: true
        });

        ps.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) {
            writeLog(`PowerShell output: ${output}`);
          }
        });

        ps.stderr.on('data', (data) => {
          const error = data.toString().trim();
          if (error) {
            writeLog(`PowerShell error: ${error}`);
          }
        });

        ps.on('error', (error) => {
          writeLog(`Failed to start PowerShell: ${error.message}`);
          reject(error);
        });

        ps.on('close', (code) => {
          try {
            // Clean up batch file
            fs.unlinkSync(batchPath);
          } catch (error) {
            writeLog(`Error cleaning up batch file: ${error.message}`);
          }

          if (code === 0) {
            writeLog('PowerShell script completed successfully');
            app.quit();
            resolve();
          } else {
            const error = `PowerShell script exited with code ${code}`;
            writeLog(error);
            reject(new Error(error));
          }
        });

      } catch (error) {
        writeLog(`Installation error: ${error}`);
        reject(error);
      }
    });
  }
}

module.exports = UpdateChecker;
