const { app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class UpdateChecker {
  constructor() {
    this.owner = 'ScottBruton';
    this.repo = 'PrintPhotoApp';
    this.currentVersion = app.getVersion();
  }

  async checkForUpdates() {
    try {
      const latestRelease = await this.getLatestRelease();
      
      if (!latestRelease) {
        throw new Error('Could not fetch latest release information');
      }

      const latestVersion = latestRelease.tag_name.replace('v', '');
      const needsUpdate = this.compareVersions(latestVersion, this.currentVersion) > 0;

      return {
        needsUpdate,
        currentVersion: this.currentVersion,
        latestVersion: latestVersion,
        downloadUrl: needsUpdate ? this.getInstallerUrl(latestRelease) : null
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }

  getInstallerUrl(release) {
    const asset = release.assets.find(asset => 
      asset.name.endsWith('.exe') && asset.name.includes('Setup')
    );
    return asset ? asset.browser_download_url : null;
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  getLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.owner}/${this.repo}/releases/latest`,
        headers: {
          'User-Agent': 'PrintPhotoApp-UpdateChecker'
        }
      };

      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  async downloadUpdate(url, progressCallback) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(app.getPath('temp'), 'PrintPhotoApp-Setup.exe');
      const file = fs.createWriteStream(tempPath);

      https.get(url, (response) => {
        const totalLength = parseInt(response.headers['content-length'], 10);
        let downloadedLength = 0;

        response.pipe(file);

        response.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const progress = (downloadedLength / totalLength) * 100;
          if (progressCallback) {
            progressCallback(progress);
          }
        });

        file.on('finish', () => {
          file.close();
          resolve(tempPath);
        });
      }).on('error', (err) => {
        fs.unlink(tempPath, () => {});
        reject(err);
      });
    });
  }

  async installUpdate(installerPath) {
    return new Promise((resolve, reject) => {
      execFile(installerPath, ['--updated'], (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = UpdateChecker;
