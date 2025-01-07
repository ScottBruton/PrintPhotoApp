const simpleGit = require("simple-git");
const path = require("path");
const { app } = require("electron");

class UpdateChecker {
  constructor() {
    this.git = simpleGit();
    this.appPath = app.getAppPath();
  }

  async checkForUpdates() {
    try {
      // Fetch the latest changes from remote
      await this.git.fetch("origin", "main");

      // Get the current commit hash
      const current = await this.git.revparse(["HEAD"]);

      // Get the latest remote commit hash
      const remote = await this.git.revparse(["origin/main"]);

      // Compare the hashes
      const needsUpdate = current !== remote;

      return {
        needsUpdate,
        currentVersion: current.slice(0, 7),
        remoteVersion: remote.slice(0, 7),
      };
    } catch (error) {
      console.error("Error checking for updates:", error);
      throw error;
    }
  }

  async pullUpdates() {
    try {
      await this.git.pull("origin", "main");
      return true;
    } catch (error) {
      console.error("Error pulling updates:", error);
      throw error;
    }
  }
}

module.exports = UpdateChecker;
