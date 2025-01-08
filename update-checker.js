const simpleGit = require("simple-git");
const path = require("path");
const { app } = require("electron");

class UpdateChecker {
  constructor() {
    // Use the repo directory inside installation directory
    const repoPath = path.join(app.getPath("userData"), "repo");
    this.git = simpleGit(repoPath);
    this.appPath = app.getAppPath();
  }

  async checkForUpdates() {
    try {
      // First check if this is a git repository
      const isRepo = await this.git.checkIsRepo().catch(() => false);

      if (!isRepo) {
        return {
          needsUpdate: false,
          currentVersion: app.getVersion(),
          remoteVersion: app.getVersion(),
          error: "Not a git repository - updates disabled",
        };
      }

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
      return {
        needsUpdate: false,
        currentVersion: app.getVersion(),
        remoteVersion: app.getVersion(),
        error: "Update check failed - updates disabled",
      };
    }
  }

  async pullUpdates() {
    try {
      const isRepo = await this.git.checkIsRepo().catch(() => false);

      if (!isRepo) {
        throw new Error("Not a git repository - updates disabled");
      }

      await this.git.pull("origin", "main");
      return true;
    } catch (error) {
      console.error("Error pulling updates:", error);
      throw error;
    }
  }
}

module.exports = UpdateChecker;
