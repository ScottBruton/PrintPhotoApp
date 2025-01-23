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

    // Add error handling for window loading
    updateWindow.webContents.on('did-fail-load', (error) => {
        console.error('Failed to load update window:', error);
    });

    // Handle window close
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

// Add this helper function at the top
function logUpdateConfig(key) {
    console.log('Update Configuration:', {
        provider: 'github',
        repo: 'PrintPhotoApp',
        owner: 'ScottBruton',
        private: true,
        tokenLength: key ? key.length : 0,
        isPackaged: app.isPackaged,
        currentVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch
    });
}

// Function to check for updates
async function checkForUpdates(ipcMain) {
    console.log('Starting update check...');
    console.log('App version:', app.getVersion());
    console.log('Is packaged:', app.isPackaged);

    // Create update window first
    createUpdateWindow();

    // Add development mode warning
    if (!app.isPackaged) {
        console.log('Running in development mode - updates are disabled');
        if (updateWindow) {
            updateWindow.webContents.send('update-message', 
                'Updates are disabled in development mode. Package the app to enable updates.');
        }
        return;
    }

    // Configure logger with more detail
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'debug';
    console.log('Update log file:', autoUpdater.logger.transports.file.getFile());

    // Fetch the GitHub repo key dynamically
    const key = process.env.GITHUB_REPO_KEY;
    if (!key) {
        const error = 'No GitHub repo key found. Skipping update check.';
        console.error(error);
        if (updateWindow) {
            updateWindow.webContents.send('update-message', error);
        }
        return;
    }

    // Log configuration (but not the actual token)
    logUpdateConfig(key);

    // Use the key directly in electron-updater
    try {
        console.log('Configuring autoUpdater with GitHub repo details...');
        autoUpdater.setFeedURL({
            provider: 'github',
            repo: 'PrintPhotoApp',
            owner: 'ScottBruton',
            private: true,
            token: key,
            releaseType: 'release' // Explicitly set release type
        });
        console.log('autoUpdater configured successfully.');
    } catch (error) {
        console.error('Failed to configure autoUpdater:', error);
        if (updateWindow) {
            updateWindow.webContents.send('update-message', `Configuration error: ${error.message}`);
        }
        return;
    }

    // Configure update behavior
    autoUpdater.autoDownload = false;
    autoUpdater.forceDevUpdateConfig = true;

    // Move this event handler up before checking for updates
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info);
        if (updateWindow) {
            updateWindow.webContents.send('update-available', info);
        }
    });

    // Update the download handler with better error handling
    ipcMain.on('download-update', async () => {
        console.log('Starting update download...');
        try {
            // Log available releases before downloading
            const updateCheckResult = await autoUpdater.checkForUpdates();
            console.log('Update check result:', updateCheckResult);
            
            await autoUpdater.downloadUpdate();
        } catch (error) {
            console.error('Download error:', error);
            let errorMessage = error.message;
            
            // Provide more specific error messages
            if (error.code === 'ERR_UPDATER_ASSET_NOT_FOUND') {
                errorMessage = 'Update package not found. Please ensure a release with assets exists in the repository.';
            }
            
            if (updateWindow) {
                updateWindow.webContents.send('update-message', `Error: ${errorMessage}`);
            }
        }
    });

    // Handle cancel-update request
    ipcMain.on('cancel-update', () => {
        console.log('Update cancelled by user');
        if (updateWindow) {
            updateWindow.close();
        }
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
        }
    });

    // Check for updates with error handling
    console.log('Triggering autoUpdater to check for updates...');
    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        console.error('Error checking for updates:', error);
        if (updateWindow) {
            updateWindow.webContents.send('update-message', `Error checking for updates: ${error.message}`);
        }
    }
}

module.exports = {
    checkForUpdates,
    fetchGitHubKey,
    createUpdateWindow,
};
