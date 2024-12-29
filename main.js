try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  });
} catch (_) { console.log('Error loading electron-reloader'); }

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Add error logging setup
const errorLogPath = path.join(__dirname, 'error.txt');

// Clear error log on startup
fs.writeFileSync(errorLogPath, '', 'utf8');

// Create a logging function
function logError(source, error) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${source}: ${error}\n`;
  fs.appendFileSync(errorLogPath, logMessage);
}

// Override console.error
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorMessage = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  logError('Console', errorMessage);
  originalConsoleError.apply(console, args);
};

// Add global error handlers
process.on('uncaughtException', (error) => {
  logError('UncaughtException', error.stack || error);
});

process.on('unhandledRejection', (error) => {
  logError('UnhandledRejection', error.stack || error);
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  // Add window error handler
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 2) { // error level
      logError('Renderer', `${message} (${sourceId}:${line})`);
    }
  });
}

// Handle save layout
ipcMain.handle('save-layout', async (event, layoutData) => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(layoutData));
    return true;
  }
  return false;
});

// Handle load layout
ipcMain.handle('load-layout', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (filePaths.length > 0) {
    const data = fs.readFileSync(filePaths[0], 'utf8');
    return JSON.parse(data);
  }
  return null;
});

// Add this new print handler
ipcMain.handle('print-preview', async (event, htmlContent) => {
  console.log('Main Process: Received print-preview request');
  
  // Create a temporary file
  const tempPath = path.join(os.tmpdir(), `print-${Date.now()}.html`);
  console.log('Main Process: Creating temp file at:', tempPath);
  
  try {
    // Write the HTML content to the temp file
    fs.writeFileSync(tempPath, htmlContent, 'utf8');
    
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: true, // Keep true for debugging
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        javascript: true,
        webSecurity: false
      }
    });

    return new Promise((resolve) => {
      console.log('Main Process: Setting up print window...');

      printWindow.webContents.on('did-finish-load', async () => {
        console.log('Main Process: Window finished loading content');
        
        try {
          console.log('Main Process: Attempting to print...');
          
          printWindow.webContents.print({
            silent: false,
            printBackground: true,
            deviceName: '',
            color: true,
            margins: {
              marginType: 'none'
            },
            landscape: false,
            scaleFactor: 100,
            shouldPrintBackgrounds: true
          }, (success, errorType) => {
            console.log('Main Process: Print callback received:', { success, errorType });
            printWindow.close();
            // Clean up the temp file
            try {
              fs.unlinkSync(tempPath);
              console.log('Main Process: Cleaned up temp file');
            } catch (cleanupError) {
              console.error('Main Process: Error cleaning up temp file:', cleanupError);
            }
            resolve(success);
          });

        } catch (error) {
          console.error('Main Process: Print error:', error);
          printWindow.close();
          resolve(false);
        }
      });

      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Main Process: Failed to load content:', errorCode, errorDescription);
        printWindow.close();
        resolve(false);
      });

      console.log('Main Process: Loading content from temp file...');
      printWindow.loadFile(tempPath).catch(error => {
        console.error('Main Process: Load file error:', error);
        printWindow.close();
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Main Process: Error creating temp file:', error);
    return false;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 