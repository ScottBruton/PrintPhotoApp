let mainWindow = null;

console.log("Update.js loaded");

async function checkForUpdates() {
  console.log("Checking for updates...");
  try {
    const result = await window.electron.invoke("check-for-updates");
    console.log("Update check result:", result);

    if (result.error) {
      console.error("Update check error:", result.error);
      showError(result.error);
      return;
    }

    if (result.needsUpdate) {
      console.log("Update available:", result);
      showUpdateAvailable(result);
    } else {
      console.log("No update needed");
      showUpToDate();
    }
  } catch (error) {
    console.error("Update check failed:", error);
    showError(error.message);
  }
}

function showUpdateAvailable(updateInfo) {
  const loader = document.querySelector(".loader");
  const message = document.querySelector(".update-message");
  const buttons = document.querySelector(".buttons");
  const progress = document.querySelector(".progress");

  loader.classList.add("hidden");
  message.textContent = `Update available! Current version: ${updateInfo.currentVersion}, New version: ${updateInfo.latestVersion}`;
  buttons.classList.remove("hidden");

  // Add button handlers
  document
    .querySelector(".update-btn")
    .addEventListener("click", () => installUpdate(updateInfo.downloadUrl));
  document.querySelector(".skip-btn").addEventListener("click", skipUpdate);
}

async function installUpdate(downloadUrl) {
  try {
    const loader = document.querySelector(".loader");
    const message = document.querySelector(".update-message");
    const buttons = document.querySelector(".buttons");
    const progress = document.querySelector(".progress");

    loader.classList.remove("hidden");
    buttons.classList.add("hidden");
    progress.classList.remove("hidden");
    message.textContent = "Downloading update...";

    // Setup progress listener
    window.electron.on("download-progress", (percent) => {
      progress.style.setProperty("--progress", `${percent}%`);
      progress.setAttribute("data-progress", `${Math.round(percent)}%`);
    });

    // Start download
    const installerPath = await window.electron.invoke("download-update", downloadUrl);

    message.textContent = "Installing update...";
    progress.classList.add("hidden");

    await window.electron.invoke("install-update", installerPath);

    message.textContent = "Update installed! Restarting...";
    setTimeout(() => {
      window.electron.invoke("restart-app");
    }, 1500);
  } catch (error) {
    showError(error.message);
  }
}

function skipUpdate() {
  createMainWindow();
}

function showError(message) {
  const loader = document.querySelector(".loader");
  const messageEl = document.querySelector(".update-message");
  const okButton = document.querySelector(".ok-btn");
  const progress = document.querySelector(".progress");

  loader.classList.add("hidden");
  progress.classList.add("hidden");
  messageEl.textContent = `Error: ${message}`;
  messageEl.style.color = "#e74c3c";
  okButton.classList.remove("hidden");

  okButton.addEventListener("click", () => {
    createMainWindow();
  });
}

function showUpToDate() {
  const loader = document.querySelector(".loader");
  const message = document.querySelector(".update-message");
  const okButton = document.querySelector(".ok-btn");
  const progress = document.querySelector(".progress");

  loader.classList.add("hidden");
  progress.classList.add("hidden");
  message.textContent = "Application is up to date!";
  okButton.classList.remove("hidden");

  okButton.addEventListener("click", () => {
    createMainWindow();
  });
}

function createMainWindow() {
  window.close();
}

// Start update check when window loads
window.addEventListener("DOMContentLoaded", checkForUpdates);
