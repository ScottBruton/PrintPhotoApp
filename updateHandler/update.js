const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow, app } = require('electron');
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
            preload: path.join(__dirname, 'preload.js'),
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
            const key = process.env.GITHUB_REPO_KEY;
            if (!key) throw new Error('GitHub key is not defined in .env');
            console.log('GitHub Repo Key fetched successfully:', key);
            return key;
        } catch (error) {
            console.error('Failed to fetch GitHub Repo Key:', error);
            return null;
        }
    });
}

// Function to check for updates
async function checkForUpdates(ipcMain) {
    console.log('Starting update check...');
    console.log('App version:', app.getVersion());
    console.log('Is packaged:', app.isPackaged);

    // Configure logger
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'debug';
    console.log('Update log file:', autoUpdater.logger.transports.file.getFile());

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
            repo: 'PrintPhotoApp',
            owner: 'ScottBruton',
            private: true,
            token: key,
        });
        console.log('autoUpdater configured successfully.');
    } catch (error) {
        console.error('Failed to configure autoUpdater:', error);
        return;
    }

    // Configure update behavior
    autoUpdater.autoDownload = false;
    autoUpdater.forceDevUpdateConfig = true;

    // Set up event handlers before checking for updates
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        createUpdateWindow(); // Create window when check starts
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
                    if (updateWindow) {
                        updateWindow.close();
                    }
                }
            });
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('No updates available:', info);
        if (updateWindow) {
            updateWindow.webContents.send('update-message', 'No updates available.');
            // Close the window after a short delay
            setTimeout(() => {
                if (updateWindow) {
                    updateWindow.close();
                }
            }, 3000);
        }
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`Download progress: ${progress.percent}%`);
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
            // Close the window after a short delay on error
            setTimeout(() => {
                if (updateWindow) {
                    updateWindow.close();
                }
            }, 5000);
        }
    });

    // Check for updates
    console.log('Triggering autoUpdater to check for updates...');
    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

module.exports = {
    checkForUpdates,
    fetchGitHubKey,
    createUpdateWindow,
};
