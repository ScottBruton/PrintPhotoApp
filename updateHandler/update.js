const { autoUpdater } = require('electron-updater');
const { BrowserWindow, app, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const os = require('os');

// Configure logging
log.transports.file.resolvePathFn = () => path.join(os.tmpdir(), 'PrintPhotoApp-updates.log');
log.transports.file.level = 'debug';
autoUpdater.logger = log;

// State
let mainWindow = null;
let isUpdateChecking = false;
let isUpdateDownloading = false;
let isUpdateDownloaded = false; // Track if update is ready to install
let downloadedUpdateInfo = null; // Store info about downloaded update

/**
 * Initialize auto-updater with proper configuration
 * Called once when app starts in production
 */
function initAutoUpdater(ipcMainRef, mainWindowRef) {
    mainWindow = mainWindowRef;
    
    log.info('=== Initializing Auto-Updater ===');
    log.info('App version:', app.getVersion());
    log.info('Platform:', process.platform);
    log.info('Log file:', log.transports.file.getFile());
    
    // Configure auto-updater
    autoUpdater.autoDownload = false; // We'll control when to download
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Configure GitHub provider
    try {
        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'ScottBruton',
            repo: 'PrintPhotoApp',
            private: false, // Set to true if your repo is private
            token: process.env.GITHUB_REPO_KEY || undefined
        });
        log.info('GitHub feed URL configured');
    } catch (error) {
        log.error('Failed to configure feed URL:', error);
    }
    
    // Set up all event listeners
    setupAutoUpdaterEvents();
    
    // Set up IPC listeners for update actions
    setupUpdateIPC(ipcMainRef);
    
    // Perform initial silent check
    checkForUpdatesSilent();
}

/**
 * Set up all autoUpdater event listeners
 */
function setupAutoUpdaterEvents() {
    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
        sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        isUpdateChecking = false;
        sendToRenderer('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseName: info.releaseName,
            releaseNotes: info.releaseNotes
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('No updates available. Current version:', info.version);
        isUpdateChecking = false;
        sendToRenderer('update-not-available', { currentVersion: info.version });
    });

    autoUpdater.on('error', (error) => {
        log.error('Update error:', error);
        isUpdateChecking = false;
        isUpdateDownloading = false;
        sendToRenderer('update-error', { 
            message: error.message,
            stack: error.stack 
        });
    });

    autoUpdater.on('download-progress', (progressObj) => {
        log.info(`Download progress: ${Math.round(progressObj.percent)}%`);
        sendToRenderer('update-download-progress', {
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded successfully:', info.version);
        isUpdateDownloading = false;
        isUpdateDownloaded = true;
        downloadedUpdateInfo = info;
        sendToRenderer('update-downloaded', {
            version: info.version
        });
    });
}

/**
 * Set up IPC handlers for renderer to trigger update actions
 */
function setupUpdateIPC(ipcMainRef) {
    // Check if update is already downloaded
    ipcMainRef.handle('update-is-downloaded', () => {
        log.info('Renderer checking if update is downloaded');
        return {
            isDownloaded: isUpdateDownloaded,
            updateInfo: downloadedUpdateInfo
        };
    });
    
    // Download update
    ipcMainRef.on('update-download-now', async () => {
        log.info('Renderer requested update download');
        if (!isUpdateDownloading) {
            isUpdateDownloading = true;
            try {
                await autoUpdater.downloadUpdate();
            } catch (error) {
                log.error('Download failed:', error);
                isUpdateDownloading = false;
            }
        }
    });
    
    // Install and restart
    ipcMainRef.on('update-install-now', () => {
        log.info('Renderer requested install and restart');
        if (isUpdateDownloaded) {
            autoUpdater.quitAndInstall(false, true);
        } else {
            log.error('Install requested but no update downloaded');
            sendToRenderer('update-error', {
                message: 'No update file available to install'
            });
        }
    });
    
    // Dismiss/remind later
    ipcMainRef.on('update-remind-later', () => {
        log.info('User chose to be reminded later');
        sendToRenderer('update-dismissed');
    });
}

/**
 * Send message to renderer (main window)
 */
function sendToRenderer(channel, data = {}) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

/**
 * Silent background update check (on app start)
 */
async function checkForUpdatesSilent() {
    if (isUpdateChecking) {
        log.info('Update check already in progress, skipping');
        return;
    }
    
    isUpdateChecking = true;
    log.info('Starting silent update check...');
    
    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        log.error('Silent update check failed:', error);
        isUpdateChecking = false;
    }
}

/**
 * Manual update check (triggered by user)
 */
async function checkForUpdatesManual() {
    if (isUpdateChecking) {
        return { success: false, message: 'Update check already in progress' };
    }
    
    isUpdateChecking = true;
    log.info('Starting manual update check...');
    sendToRenderer('update-checking');
    
    try {
        const result = await autoUpdater.checkForUpdates();
        return { 
            success: true, 
            updateInfo: result.updateInfo,
            currentVersion: app.getVersion()
        };
    } catch (error) {
        log.error('Manual update check failed:', error);
        isUpdateChecking = false;
        return { 
            success: false, 
            error: error.message 
        };
    }
}

module.exports = {
    initAutoUpdater,
    checkForUpdatesManual,
    setupAutoUpdaterEvents,
    checkForUpdatesSilent
};
