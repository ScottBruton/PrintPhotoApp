const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Store mainWindow reference
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  // Wait for window to be ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded and ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

// Get printers handler using Windows command
ipcMain.handle('get-printers', async (event) => {
    try {
        // Use Windows command to get printer list
        const { stdout } = await execPromise('wmic printer get name');
        const printerNames = stdout
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== 'Name')
            .map(name => ({
                name: name,
                displayName: name,
                isDefault: false,
                status: 0
            }));

        // Add PDF printer option
        const allPrinters = [
            {
                name: 'Save as PDF',
                displayName: 'Save as PDF',
                isDefault: false,
                status: 0
            },
            ...printerNames
        ];

        console.log('Available printers:', allPrinters);
        return allPrinters;
    } catch (error) {
        console.error('Error getting printers:', error);
        return [{
            name: 'Save as PDF',
            displayName: 'Save as PDF',
            isDefault: false,
            status: 0
        }];
    }
});

// Print handler
ipcMain.handle('print', async (event, content, settings) => {
    try {
        console.log('Print settings:', settings);
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);

        // Handle PDF printing
        if (settings.printer === 'Save as PDF') {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Save PDF',
                defaultPath: path.join(app.getPath('documents'), 'print-output.pdf'),
                filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
            });

            if (filePath) {
                const pdfData = await printWindow.webContents.printToPDF({
                    printBackground: true,
                    landscape: settings.layout === 'landscape',
                    pageRanges: settings.pages === 'custom' ? settings.pageRanges : undefined,
                    margins: {
                        marginType: 'none'
                    }
                });

                fs.writeFileSync(filePath, pdfData);
                printWindow.close();
                return true;
            }
            printWindow.close();
            return false;
        }

        // Regular printer
        const success = await printWindow.webContents.print({
            silent: false,
            printBackground: true,
            deviceName: settings.printer,
            copies: settings.copies,
            landscape: settings.layout === 'landscape',
            pageRanges: settings.pages === 'custom' ? settings.pageRanges : undefined
        });

        printWindow.close();
        return success;
    } catch (error) {
        console.error('Print error:', error);
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