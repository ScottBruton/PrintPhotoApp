const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const path = require('path');

let updateWindow = null;

// Function to create the update window
function createUpdateWindow() {
    console.log('Creating update window...');
    if (updateWindow) {
        console.log('Update window already exists. Focusing on the existing window.');
        updateWindow.focus();
        return;
    }

    updateWindow = new BrowserWindow({
        width: 400,
        height: 300,
        title: 'Application Update',
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'), // Optional preload script
        },
    });

    updateWindow.loadFile(path.join(__dirname, 'update.html'));
    console.log('Update window loaded.');

    updateWindow.on('closed', () => {
        console.log('Update window closed.');
        updateWindow = null;
    });
}

// Function to fetch the GitHub key
function fetchGitHubKey(ipcMain) {
    ipcMain.handle('get-github-repo-key', async () => {
        console.log('Fetching GitHub repo key...');
        try {
            const key = process.env.GITHUB_REPO_KEY; // Retrieve directly from .env
            if (!key) throw new Error('GitHub key is not defined in .env');
            console.log('GitHub Repo Key fetched successfully:', key);
            return key; // Return the key for use
        } catch (error) {
            console.error('Failed to fetch GitHub Repo Key:', error);
            return null;
        }
    });
}

// Function to check for updates
async function checkForUpdates(ipcMain) {
    console.log('Starting update check...');

    // Fetch the GitHub repo key dynamically
    const key = process.env.GITHUB_REPO_KEY;
    if (!key) {
        console.error('No GitHub repo key found. Skipping update check.');
        return;
    }

    console.log('GitHub repo key found:', key);

    // Use the key directly in electron-updater
    try {
        console.log('Configuring autoUpdater with GitHub repo details...');
        autoUpdater.setFeedURL({
            provider: 'github',
            repo: 'PrintPhotoApp', // Replace with your GitHub repo name
            owner: 'ScottBruton', // Replace with your GitHub username
            private: false, // If the repo is public, this should remain false
            token: key, // Use the key dynamically
        });
        console.log('autoUpdater configured successfully.');
    } catch (error) {
        console.error('Failed to configure autoUpdater:', error);
        return;
    }

    // Force the update check even in development mode
    autoUpdater.autoDownload = false;
    autoUpdater.forceDevUpdateConfig = true; // Force updates in development mode

    // Open the update window
    createUpdateWindow();

    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info);

        if (updateWindow) {
            updateWindow.webContents.send('update-message', `Update available: ${info.version}`);
        }

        dialog
            .showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available. Do you want to download it now?`,
                buttons: ['Yes', 'No'],
            })
            .then((result) => {
                if (result.response === 0) {
                    console.log('User agreed to download the update.');
                    autoUpdater.downloadUpdate();
                } else {
                    console.log('User declined to download the update.');
                }
            });
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('No updates available:', info);
        if (updateWindow) {
            updateWindow.webContents.send('update-message', 'No updates available.');
        }
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`Download progress: ${progress.percent}%`);
        console.log(`Downloaded ${progress.transferred} of ${progress.total} bytes at ${progress.bytesPerSecond} bytes/sec.`);

        if (updateWindow) {
            const percentage = Math.floor(progress.percent);
            updateWindow.webContents.send('update-progress', percentage);
        }
    });

    autoUpdater.on('update-downloaded', () => {
        console.log('Update downloaded successfully.');

        if (updateWindow) {
            updateWindow.webContents.send('update-message', 'Update downloaded. Restarting...');
        }

        dialog
            .showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: 'The update has been downloaded. The application will restart to apply the update.',
                buttons: ['Restart Now'],
            })
            .then(() => {
                console.log('Restarting application to apply the update...');
                autoUpdater.quitAndInstall();
            });
    });

    autoUpdater.on('error', (error) => {
        console.error('Error during update process:', error);

        if (updateWindow) {
            updateWindow.webContents.send('update-message', `Error: ${error.message}`);
        }
    });

    // Check for updates
    console.log('Triggering autoUpdater to check for updates...');
    autoUpdater.checkForUpdates();
}


module.exports = {
    checkForUpdates,
    fetchGitHubKey,
    createUpdateWindow,
};
