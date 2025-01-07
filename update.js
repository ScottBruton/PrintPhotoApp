let mainWindow = null;

async function checkForUpdates() {
  try {
    const result = await window.electron.invoke("check-for-updates");

    if (result.error) {
      showError(result.error);
      return;
    }

    if (result.needsUpdate) {
      showUpdateAvailable(result);
    } else {
      showUpToDate();
    }
  } catch (error) {
    showError(error.message);
  }
}

function showUpdateAvailable(updateInfo) {
  const loader = document.querySelector(".loader");
  const message = document.querySelector(".update-message");
  const buttons = document.querySelector(".buttons");

  loader.classList.add("hidden");
  message.textContent = `Update available! Current version: ${updateInfo.currentVersion}, New version: ${updateInfo.remoteVersion}`;
  buttons.classList.remove("hidden");

  // Add button handlers
  document
    .querySelector(".update-btn")
    .addEventListener("click", installUpdate);
  document.querySelector(".skip-btn").addEventListener("click", skipUpdate);
}

async function installUpdate() {
  try {
    const loader = document.querySelector(".loader");
    const message = document.querySelector(".update-message");
    const buttons = document.querySelector(".buttons");

    loader.classList.remove("hidden");
    buttons.classList.add("hidden");
    message.textContent = "Installing update...";

    const result = await window.electron.invoke("install-update");

    if (result.error) {
      showError(result.error);
      return;
    }

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

  loader.classList.add("hidden");
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

  loader.classList.add("hidden");
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
