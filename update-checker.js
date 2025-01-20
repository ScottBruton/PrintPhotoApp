const { app } = require("electron");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

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
    this.logFile = path.join(app.getPath("userData"), "update.log");
    this.log("Update checker initialized");
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
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
      // Extract the filename from the URL
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      const tempPath = path.join(
        app.getPath("temp"),
        filename  // Use the actual filename from the URL
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
          file.close(() => {
            if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
              console.log("Download completed successfully");
              resolve({ installerPath: tempPath });
            } else {
              reject(new Error("Downloaded file is empty or missing"));
            }
          });
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
        this.log("Starting installation process...");
        
        // Handle if installerPath is passed as an object
        const actualPath = typeof installerPath === 'object' ? installerPath.installerPath : installerPath;
        
        if (!actualPath || !fs.existsSync(actualPath)) {
          const error = `Installer not found at path: ${actualPath}`;
          this.log(error);
          reject(new Error(error));
          return;
        }

        const fullPath = path.resolve(actualPath);
        const isDevMode = process.defaultApp || /[\\/]electron/i.test(process.execPath);
        const tempDir = app.getPath("temp");
        const batPath = path.join(tempDir, `printphoto_update_${Date.now()}.bat`);
        const logFile = this.logFile;  // Store log file path for batch script

        this.log("Installation details:");
        this.log(`- Installer path: ${fullPath}`);
        this.log(`- Batch file path: ${batPath}`);
        this.log(`- Temp directory: ${tempDir}`);
        this.log(`- Log file: ${logFile}`);
        this.log(`- Is dev mode: ${isDevMode}`);

        // Create batch file content with logging
        const currentInstallPath = isDevMode ? process.cwd() : path.dirname(app.getPath("exe"));
        this.log(`- Current install path: ${currentInstallPath}`);

        const batContent = `
@echo on
title PrintPhotoApp Update Process
color 0A
setlocal EnableDelayedExpansion

echo Starting update process...
call :log "Update script started"
call :log "Current directory: %CD%"

echo.
echo ========================================
echo PrintPhotoApp Update Installation Process
echo ========================================
echo.

echo Checking for running instances...
call :log "Waiting for PrintPhotoApp to close..."
echo Waiting for application to close...

:CheckProcess
tasklist | find /i "PrintPhotoApp.exe" >nul 2>&1
if !errorlevel! equ 0 (
    call :log "PrintPhotoApp is still running, waiting..."
    echo Application is still running, please wait...
    timeout /t 2 /nobreak >nul
    goto CheckProcess
)

call :log "PrintPhotoApp has closed"
echo Application has closed, proceeding with installation...
echo.

call :log "Starting installer: ${fullPath.replace(/\\/g, '\\\\')}"
echo Running installer from: ${fullPath.replace(/\\/g, '\\\\')}
echo.

echo Attempting to run installer...
"${fullPath.replace(/\\/g, '\\\\')}" /S /allusers /D="${currentInstallPath.replace(/\\/g, '\\\\')}"
set INSTALLER_ERROR=!errorlevel!
if !INSTALLER_ERROR! neq 0 (
    call :log "Installation failed with error code !INSTALLER_ERROR!"
    echo Installation failed with error code !INSTALLER_ERROR! > "${tempDir}\\printphoto_update_error.log"
    color 0C
    echo.
    echo ========================================
    echo ERROR: Installation failed!
    echo Error code: !INSTALLER_ERROR!
    echo ========================================
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b !INSTALLER_ERROR!
)

call :log "Installation completed successfully"
echo.
echo Installation completed successfully!
call :log "Waiting for installation to finish..."
echo Waiting for processes to complete...
timeout /t 5 /nobreak >nul

call :log "Searching for new executable..."
echo Looking for new application...
set FOUND_APP=0

echo Checking in current installation directory...
if exist "${currentInstallPath.replace(/\\/g, '\\\\')}\PrintPhotoApp.exe" (
    call :log "Found new application at: ${currentInstallPath.replace(/\\/g, '\\\\')}\PrintPhotoApp.exe"
    echo Found new application at: ${currentInstallPath.replace(/\\/g, '\\\\')}\PrintPhotoApp.exe
    echo Found application: ${currentInstallPath.replace(/\\/g, '\\\\')}\PrintPhotoApp.exe > "${tempDir}\\printphoto_update_success.log"
    start "" "${currentInstallPath.replace(/\\/g, '\\\\')}\PrintPhotoApp.exe"
    set FOUND_APP=1
    goto LaunchComplete
)

echo Checking in Program Files...
for /f "tokens=*" %%i in ('dir /b /s "C:\\Program Files*\\PrintPhotoApp\\PrintPhotoApp.exe" 2^>nul') do (
    call :log "Found new application at: %%i"
    echo Found new application at: %%i
    echo Found application: %%i > "${tempDir}\\printphoto_update_success.log"
    start "" "%%i"
    set FOUND_APP=1
    goto LaunchComplete
)

:LaunchComplete
if !FOUND_APP! equ 0 (
    color 0C
    echo.
    echo ========================================
    echo WARNING: Could not find new application!
    echo The installation may have failed.
    echo Installation path: ${currentInstallPath.replace(/\\/g, '\\\\')}
    echo ========================================
    echo.
    echo Press any key to exit...
    pause >nul
)

call :log "Update process complete"
echo.
echo ========================================
echo Update process complete!
echo The new version will start automatically.
echo ========================================
echo.

call :log "Cleaning up..."
echo Cleaning up...
timeout /t 5 /nobreak >nul

echo Process completed. Window will close in 10 seconds...
timeout /t 10
(goto) 2>nul & del "%~f0"
exit /b 0

:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1 >> "${logFile.replace(/\\/g, '\\\\')}"
exit /b 0
`.trim();

        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        this.log("Writing batch file...");
        fs.writeFileSync(batPath, batContent, { encoding: 'utf8' });
        this.log("Batch file created successfully");

        // Verify batch file was created
        if (!fs.existsSync(batPath)) {
          const error = "Failed to create batch file";
          this.log(error);
          reject(new Error(error));
          return;
        }

        // In development mode, just show what would happen
        if (isDevMode) {
          this.log("=== Development Mode - Update Simulation ===");
          this.log(`Would execute batch file at: ${batPath}`);
          this.log("Batch file contents:");
          this.log(batContent);
          this.log("=====================================");
          resolve();
          return;
        }

        // Execute batch file with visible window
        this.log("Executing batch file...");
        
        // Create a visible command prompt and run the batch file
        const child = spawn('cmd.exe', ['/C', 'start', 'cmd.exe', '/K', `"${batPath}"`], {
          detached: true,
          stdio: 'ignore',
          windowsVerbatimArguments: true,
          shell: true
        });

        child.on('error', (error) => {
          this.log(`Failed to start batch process: ${error.message}`);
          reject(error);
        });

        // Unref the child to allow the parent process to exit
        child.unref();

        // Give the batch file time to start
        setTimeout(() => {
          this.log("Quitting application...");
          app.quit();
          resolve();
        }, 2000);

      } catch (error) {
        this.log(`Installation error: ${error.message}`);
        reject(error);
      }
    });
  }
}

module.exports = UpdateChecker;