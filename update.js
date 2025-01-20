let updateAvailable = false;
let downloadUrl = null;
let isUpdating = false;
let isCancelled = false;

const updateStatus = document.getElementById("updateStatus");
const progressBar = document.getElementById("progressFill");
const installButton = document.getElementById("installButton");
const closeButton = document.getElementById("closeButton");
const errorDiv = document.getElementById("error");

// Check for updates when the window loads
window.addEventListener("DOMContentLoaded", async () => {
  try {
    updateStatus.textContent = "Checking for updates...";
    const result = await window.electron.invoke("check-for-updates");

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.needsUpdate) {
      updateStatus.textContent = `Update available: ${result.latestVersion}`;
      updateAvailable = true;
      downloadUrl = result.downloadUrl;
      installButton.style.display = "inline-block";
      closeButton.textContent = "Skip Update";
    } else {
      updateStatus.textContent = "You are up to date!";
      setTimeout(() => window.electron.invoke("create-main-window"), 1500);
    }
  } catch (error) {
    console.error("Update check failed:", error);
    errorDiv.textContent = `Error checking for updates: ${error.message}`;
    updateStatus.textContent = "Update check failed";
  }
});

// Handle install button click
installButton.addEventListener("click", async () => {
  try {
    isUpdating = true;
    isCancelled = false;
    installButton.disabled = true;
    closeButton.textContent = "Cancel";
    updateStatus.textContent = "Downloading update...";

    // Remove any existing progress listeners
    window.electron.removeAllListeners?.("download-progress");

    // Listen for download progress
    window.electron.on("download-progress", (progress) => {
      if (!isCancelled) {
        progressBar.style.width = `${progress}%`;
      }
    });

    // Download the update
    const result = await window.electron.invoke("download-update", downloadUrl);

    if (result.cancelled || isCancelled) {
      console.log("Update was cancelled");
      return;
    }

    if (!result.installerPath) {
      throw new Error("No installer path received from download");
    }

    updateStatus.textContent = "Installing update...";

    // Install the update
    await window.electron.invoke("install-update", result.installerPath);

    // Show development mode message or handle production quit
    if (window.electron.isDevMode()) {
      updateStatus.textContent =
        "Update simulation complete (Development Mode)";
      setTimeout(() => {
        window.close();
      }, 2000);
    }
    // The app will quit automatically in production mode
  } catch (error) {
    if (!isCancelled) {
      console.error("Update failed:", error);
      errorDiv.textContent = `Update failed: ${error.message}`;
      installButton.disabled = false;
      updateStatus.textContent = "Update failed";
      isUpdating = false;
      closeButton.textContent = "Skip Update";
    }
  }
});

// Handle close/cancel button click
closeButton.addEventListener("click", async () => {
  if (isUpdating) {
    // Cancel the update process
    isCancelled = true;
    isUpdating = false;

    // Cancel the download
    try {
      await window.electron.cancelDownload();
    } catch (error) {
      // Ignore the cancellation error as it's expected
      console.log("Download cancelled");
    }

    updateStatus.textContent = "Update cancelled";
    installButton.disabled = false;
    progressBar.style.width = "0%";
    closeButton.textContent = "Skip Update";

    // Remove progress listener
    window.electron.removeAllListeners?.("download-progress");
  }

  // Create main window and close update window
  try {
    // Instead of using create-main-window, let's just close the update window
    // The main window will be created by the main process
    window.close();
  } catch (error) {
    console.error("Error closing update window:", error);
  }
});
