const { app } = require("electron");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

class UpdateChecker {
  constructor() {
    this.owner = "ScottBruton";
    this.repo = "PrintPhotoApp";
    this.currentVersion = app.getVersion();
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

      const handleResponse = (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          console.log("Following redirect to:", response.headers.location);
          https
            .get(response.headers.location, handleResponse)
            .on("error", (err) => {
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
          file.close();
          // Verify file exists and has content
          if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
            console.log("Download completed successfully");
            resolve(tempPath);
          } else {
            reject(new Error("Downloaded file is empty or missing"));
          }
        });
      };

      https.get(url, handleResponse).on("error", (err) => {
        fs.unlink(tempPath, () => {});
        console.error("Download error:", err);
        reject(err);
      });
    });
  }

  async installUpdate(installerPath) {
    return new Promise((resolve, reject) => {
      // Check if file exists
      if (!fs.existsSync(installerPath)) {
        reject(new Error(`Installer not found at path: ${installerPath}`));
        return;
      }

      try {
        // On Windows, we need to use the full path to the installer
        const fullPath = path.resolve(installerPath);
        console.log("Installing from path:", fullPath);

        // Use exec instead of spawn
        // Run the installer with start command on Windows
        const command = `start "" "${fullPath}" /SILENT /NORESTART`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("Exec error:", error);
            console.error("Stderr:", stderr);
            reject(error);
            return;
          }

          console.log("Installer started successfully");
          console.log("Stdout:", stdout);

          // Resolve immediately since the installer is running
          resolve();
        });
      } catch (error) {
        console.error("Installation error:", error);
        reject(error);
      }
    });
  }
}

module.exports = UpdateChecker;
