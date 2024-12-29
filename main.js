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

// Add near the top with other logging setup
const consoleLogPath = path.join(__dirname, 'console.txt');

// Clear console log on startup
fs.writeFileSync(consoleLogPath, '', 'utf8');

// Create a logging function for console
function logConsole(source, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  const logMessage = `[${timestamp}] ${source}: ${message}\n`;
  fs.appendFileSync(consoleLogPath, logMessage);
}

// Override console.log
const originalConsoleLog = console.log;
console.log = function(...args) {
  logConsole('Console', ...args);
  originalConsoleLog.apply(console, args);
};

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

// Add this to your existing ipcMain handlers
ipcMain.handle('print-preview', async (event, htmlContent) => {
    logConsole('Print', 'Received print-preview request');
    
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            javascript: true,
            webSecurity: false
        }
    });

    return new Promise((resolve) => {
        logConsole('Print', 'Setting up print window...');

        printWindow.webContents.on('did-finish-load', async () => {
            logConsole('Print', 'Window finished loading content');
            
            try {
                // Generate PDF
                const pdfData = await printWindow.webContents.printToPDF({
                    printBackground: true,
                    pageSize: 'A4',
                    margins: {
                        marginType: 'none'
                    }
                });

                // Save PDF temporarily
                const tempPdfPath = path.join(os.tmpdir(), `print-preview-${Date.now()}.pdf`);
                fs.writeFileSync(tempPdfPath, pdfData);
                logConsole('Print', 'Generated PDF preview at:', tempPdfPath);

                // Create a new window to show the PDF
                const pdfWindow = new BrowserWindow({
                    width: 800,
                    height: 600,
                    show: true,
                    webPreferences: {
                        plugins: true
                    }
                });

                // Load the PDF
                pdfWindow.loadURL(`file://${tempPdfPath}`);

                pdfWindow.webContents.on('did-finish-load', () => {
                    // Wait a bit for the PDF to render
                    setTimeout(() => {
                        pdfWindow.webContents.print({ silent: false }, (success, errorType) => {
                            logConsole('Print', 'Print callback received:', { success, errorType });
                            
                            // Cleanup
                            pdfWindow.close();
                            printWindow.close();
                            
                            try {
                                fs.unlinkSync(tempPdfPath);
                                logConsole('Print', 'Cleaned up temporary PDF');
                            } catch (err) {
                                logConsole('Print', 'Error cleaning up PDF:', err);
                            }
                            
                            resolve(success);
                        });
                    }, 1000);
                });

            } catch (error) {
                logConsole('Print', 'Print error:', error);
                printWindow.close();
                resolve(false);
            }
        });

        // Load the initial content
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        logConsole('Print', 'Loading URL length:', dataUrl.length);
        printWindow.loadURL(dataUrl);
    });
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