require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { spawn } = require("child_process");
const os = require("os");
const { jsPDF } = require("jspdf");
const html2canvas = require("html2canvas");
const { setupIpcHandlers } = require("./electron-utils");

// Setup IPC handlers
setupIpcHandlers();

try {
  if (process.argv.includes("--dev-reload")) {
    require("electron-reloader")(module, {
      debug: true,
      watchRenderer: true,
    });
  }
} catch (_) {
  console.log("Error loading electron-reloader");
}

// Store mainWindow reference
let mainWindow = null;

function createWindow() {
  console.log("Creating main window...");
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, "asset/scoBroPrints.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");

  // Wait for window to be ready
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Main window loaded and ready");
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Handle IPC call to send the GitHub key

// Handle save layout
ipcMain.handle("save-layout", async (event, layoutData) => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(layoutData));
    return true;
  }
  return false;
});

// Handle load layout
ipcMain.handle("load-layout", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (filePaths.length > 0) {
    const data = fs.readFileSync(filePaths[0], "utf8");
    return JSON.parse(data);
  }
  return null;
});

// Get printers handler using Windows command
ipcMain.handle("get-printers", async (event) => {
  try {
    // Use Windows command to get printer list
    const { stdout } = await execPromise("wmic printer get name");
    const printerNames = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== "Name")
      .map((name) => ({
        name: name,
        displayName: name,
        isDefault: false,
        status: 0,
      }));

    // Add PDF printer option and Test Printer
    const allPrinters = [
      {
        name: "Save as PDF",
        displayName: "Save as PDF",
        isDefault: false,
        status: 0,
      },
      {
        name: "Test Printer",
        displayName: "Test Printer (Debug)",
        isDefault: false,
        status: 0,
      },
      ...printerNames,
    ];

    console.log("Available printers:", allPrinters);
    return allPrinters;
  } catch (error) {
    console.error("Error getting printers:", error);
    return [
      {
        name: "Save as PDF",
        displayName: "Save as PDF",
        isDefault: false,
        status: 0,
      },
    ];
  }
});

// Print handler
ipcMain.handle("print", async (event, content, settings) => {
  try {
    console.log("Print settings:", settings);

    // Create print window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const tempPath = path.join(app.getPath("temp"), "print-content.html");
    console.log("Writing content to:", tempPath);
    fs.writeFileSync(tempPath, content, "utf8");

    if (!fs.existsSync(tempPath)) {
      throw new Error("Failed to create temp file");
    }

    // Load the content into the window
    await printWindow.loadFile(tempPath);

    // Handle Test Printer
    if (settings.printer === "Test Printer") {
      console.log("\n=== TEST PRINTER DEBUG INFO ===");
      console.log("Print settings:", settings);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      printWindow.close();
      fs.unlinkSync(tempPath);
      return true;
    }

    // Handle PDF printing
    if (settings.printer === "Save as PDF") {
      const { filePath } = await dialog.showSaveDialog({
        title: "Save PDF",
        defaultPath: path.join(app.getPath("documents"), "print-output.pdf"),
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });

      if (!filePath) {
        printWindow.close();
        fs.unlinkSync(tempPath);
        return false;
      }

      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        landscape: settings.layout === "landscape",
        pageRanges:
          settings.pages === "custom" ? settings.pageRanges : undefined,
        margins: { marginType: "none" },
        dpi: settings.quality || 600,
      });

      fs.writeFileSync(filePath, pdfData);
      printWindow.close();
      fs.unlinkSync(tempPath);
      return true;
    }

    // Regular printer
    const success = await printWindow.webContents.print({
      silent: false,
      printBackground: true,
      deviceName: settings.printer,
      copies: settings.copies,
      landscape: settings.layout === "landscape",
      pageRanges: settings.pages === "custom" ? settings.pageRanges : undefined,
      dpi: settings.quality || 600,
      printOptions: {
        quality: settings.quality || 600,
        resolution: settings.quality || 600,
        dpi: {
          horizontal: settings.quality || 600,
          vertical: settings.quality || 600,
        },
        mediaType: settings.paperType,
      },
    });

    printWindow.close();
    fs.unlinkSync(tempPath);
    return success;
  } catch (error) {
    console.error("Print error:", error);
    return false;
  }
});

// Handle save PDF
ipcMain.handle("save-pdf", async (event, { data, defaultPath }) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      properties: ["showOverwriteConfirmation"],
    });

    if (filePath) {
      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(data);
      fs.writeFileSync(filePath, buffer);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error saving PDF:", error);
    return false;
  }
});

// Update the getPrintHandlerPath function
const getPrintHandlerPath = () => {
  const isDev = !app.isPackaged;
  const isWin = process.platform === 'win32';
  
  if (isDev) {
    return isWin ? 
      path.join(__dirname, 'dist', 'print_handler.exe') :
      path.join(__dirname, 'print_handler.py');
  }
  return path.join(process.resourcesPath, 'print_handler.exe');
};

// Add this helper function
const runPrintHandler = async (command, ...args) => {
    const handlerPath = getPrintHandlerPath();
    console.log('Print handler command:', command, 'args:', args);
    
    return new Promise((resolve, reject) => {
        const process = spawn(handlerPath, [command, ...args]);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data;
        });

        process.stderr.on('data', (data) => {
            stderr += data;
            console.error('Print handler stderr:', data.toString());
        });

        process.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse print handler output: ${stdout}`));
                }
            } else {
                reject(new Error(`Print handler exited with code ${code}: ${stderr}`));
            }
        });
    });
};

// Update the win-print-file handler
ipcMain.handle("win-print-file", async (event, { filePath, printerName }) => {
  try {
    console.log("Printing file:", { filePath, printerName });

    // Don't join with app path - filePath is already absolute
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the file using proper file URL format
    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
    console.log("Loading file URL:", fileUrl);
    
    await printWindow.loadURL(fileUrl);

    // Wait a bit for content to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return a promise that resolves when printing is complete
    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          deviceName: printerName,
          color: true,
          margins: { marginType: "none" },
          pageSize: "A4",
          landscape: false,
          scaleFactor: 100,
          copies: 1,
          collate: true,
        },
        (success, errorType) => {
          console.log("Print callback:", success, errorType);
          printWindow.close();

          if (success) {
            resolve({
              success: true,
              message: "Print job sent successfully",
            });
          } else {
            resolve({
              success: false,
              error: errorType || "Print was cancelled or failed",
            });
          }
        }
      );
    });
  } catch (error) {
    console.error("Error in print handler:", error);
    return {
      success: false,
      error: error.message || "Print failed",
      details: error.toString(),
    };
  }
});

// App startup
app.whenReady().then(async () => {
    console.log("App ready");
    
    // ALWAYS create main window first - users need to see the app
    createWindow();
    
    // Check for updates in background (only in production)
    if (app.isPackaged) {
        // Wait a bit for main window to load, then check for updates silently
        setTimeout(() => {
            console.log('Starting background update check...');
            const { initAutoUpdater } = require('./updateHandler/update.js');
            initAutoUpdater(ipcMain, mainWindow);
        }, 5000); // 5 seconds after app starts
    } else {
        console.log('Development mode - auto-updates disabled');
    }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Keep only one version of each handler
ipcMain.handle("create-temp-pdf", async (event, htmlContent) => {
  try {
    const timestamp = new Date().getTime();
    const tempPath = path.join(os.tmpdir(), `print_${timestamp}.pdf`);

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      hotfixes: ["px_scaling"],
    });

    // Convert HTML content to PDF
    const dataUrl = await event.sender.webContents
      .capturePage()
      .then((image) => {
        return image.toDataURL();
      });

    // Add image to PDF
    pdf.addImage(
      dataUrl,
      "PNG",
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight(),
      undefined,
      "FAST"
    );

    // Save PDF
    await fs.promises.writeFile(
      tempPath,
      Buffer.from(pdf.output("arraybuffer"))
    );

    return tempPath;
  } catch (error) {
    console.error("Error creating PDF:", error);
    throw error;
  }
});

ipcMain.handle("get-temp-file", async (event, filename) => {
  return path.join(os.tmpdir(), filename);
});

ipcMain.handle("save-print-pdf", async (event, { path: filePath, data }) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (error) {
    console.error("Error saving PDF:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("restart-app", () => {
  console.log("Restarting app...");
  app.relaunch();
  app.exit();
});

// Add this with your other ipcMain handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Add these handlers back after the runPrintHandler function
ipcMain.handle("win-get-printers", async () => {
    try {
        return await runPrintHandler("get_printers");
    } catch (error) {
        console.error("Error getting printers:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("update-printer-statuses", async () => {
    try {
        return await runPrintHandler("get_printers");
    } catch (error) {
        console.error("Error updating printer statuses:", error);
        return { success: false, error: error.message };
    }
});

// Manual update check IPC handler (for "Check for Updates" menu/button)
ipcMain.handle('check-for-updates-manual', async () => {
  try {
    console.log('Manual update check requested from renderer');
    const { checkForUpdatesManual } = require('./updateHandler/update.js');
    return await checkForUpdatesManual();
  } catch (error) {
    console.error('Error in manual update check:', error);
    return { success: false, error: error.message };
  }
});
