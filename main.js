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
const { checkForUpdates, fetchGitHubKey, isUpdateAvailable } = require('./updateHandler/update.js');

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

// Add these handlers after your existing ipcMain handlers
ipcMain.handle("win-get-printers", async () => {
  try {
    const pythonProcess = spawn("python", ["print_handler.py", "get_printers"]);
    const result = await new Promise((resolve, reject) => {
      let data = "";
      pythonProcess.stdout.on("data", (chunk) => {
        data += chunk;
      });
      pythonProcess.stderr.on("data", (data) => {
        console.error(`Python Error: ${data}`);
      });
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}`));
        } else {
          resolve(data);
        }
      });
    });
    return JSON.parse(result);
  } catch (error) {
    console.error("Error getting Windows printers:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("win-set-default-printer", async (event, printerName) => {
  try {
    const pythonProcess = spawn("python", [
      "print_handler.py",
      "set_default",
      printerName,
    ]);
    const result = await new Promise((resolve, reject) => {
      let data = "";
      pythonProcess.stdout.on("data", (chunk) => {
        data += chunk;
      });
      pythonProcess.stderr.on("data", (data) => {
        console.error(`Python Error: ${data}`);
      });
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}`));
        } else {
          resolve(data);
        }
      });
    });
    return JSON.parse(result);
  } catch (error) {
    console.error("Error setting default printer:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("win-print-file", async (event, { filePath, printerName }) => {
  try {
    console.log("Printing file:", filePath);

    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    // Use loadFile for app files, but loadURL with file:// protocol for temp files
    await printWindow.loadURL(`file://${filePath}`);

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


ipcMain.handle('manual-update-check', async () => {
    console.log("Manual update check requested");   
    const updateAvailable = await isUpdateAvailable();
    if (updateAvailable) {
        // Only check for updates in production mode
        if (app.isPackaged) {
            // Just check for updates without creating a new window
            checkForUpdates(ipcMain);
        }
    } else {
        // Show message when no updates are available
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Check',
            message: 'No Updates Available - Using Latest Version',
            buttons: ['OK']
        });      
    }
});

// App startup
app.whenReady().then(async () => {
    console.log("App ready");
    const updateAvailable = await isUpdateAvailable();
    if (updateAvailable) {
        // Only check for updates in production mode
        if (app.isPackaged) {
            // Wait a few seconds before checking for updates
            setTimeout(() => {
                // Fetch GitHub key and set up IPC handlers
                fetchGitHubKey(ipcMain);
                // Start checking for updates and pass createWindow as callback
                checkForUpdates(ipcMain, createWindow);
            }, 3000); // Wait 3 seconds after app starts
        }
    } else {
        createWindow();
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
