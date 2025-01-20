const { app } = require("electron");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

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
        if (!fs.existsSync(installerPath)) {
          reject(new Error(`Installer not found at path: ${installerPath}`));
          return;
        }

        const fullPath = path.resolve(installerPath);
        const isDevMode =
          process.defaultApp || /[\\/]electron/i.test(process.execPath);
        const currentInstallPath = isDevMode
          ? process.cwd()
          : path.dirname(app.getPath("exe")); // Get current installation path

        console.log("Installation details:");
        console.log("- Installer path:", fullPath);
        console.log("- Current install path:", currentInstallPath);
        console.log("- Is dev mode:", isDevMode);

        // Don't force an installation path - let NSIS handle it
        const updateCommand = `"${fullPath}" /S`;
        const batPath = path.join(app.getPath("temp"), "update.bat");

        const batContent = `
@echo off
echo Waiting for application to close...
timeout /t 2 /nobreak >nul
:wait
tasklist | find /i "PrintPhotoApp.exe" >nul 2>&1
if %errorlevel% equ 0 (
    timeout /t 1 /nobreak >nul
    goto :wait
)
echo Installing update...
${updateCommand}
echo Waiting for installation to complete...
timeout /t 10 /nobreak >nul
echo Starting application...
for /f "tokens=*" %%i in ('dir /b /s "C:\\Program Files*\\PrintPhotoApp\\PrintPhotoApp.exe" 2^>nul') do (
    echo Found application at: %%i
    start "" "%%i"
    goto :found
)
echo Error: Application not found
:found
echo Cleaning up...
del "%~f0"
        `.trim();

        // In development mode, just show what would happen
        if (isDevMode) {
          console.log("\n=== Development Mode - Update Simulation ===");
          console.log("Would create batch file at:", batPath);
          console.log("\nBatch file contents would be:");
          console.log(batContent);
          console.log("\nIn production:");
          console.log("1. App would quit");
          console.log("2. Batch file would wait for app to close");
          console.log("3. Installer would run silently");
          console.log("4. New version would start automatically");
          console.log("=====================================\n");
          resolve();
          return;
        }

        // Production mode: Actually create and execute the batch file
        fs.writeFileSync(batPath, batContent, "utf-8");
        console.log("Created update batch file:", batPath);
        exec(`start /min "" "${batPath}"`);
        console.log("Started update batch file");
        app.quit();
        resolve();
      } catch (error) {
        console.error("Installation error:", error);
        reject(error);
      }
    });
  }
}

module.exports = UpdateChecker;
