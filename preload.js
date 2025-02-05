const { contextBridge, ipcRenderer } = require("electron");

// Add this at the top to determine dev mode
const isDevMode = process.defaultApp || /[\\/]electron/i.test(process.execPath);

// Add console log to verify preload script is running
console.log("Preload script running");

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => {
    console.log("IPC invoke called:", channel, data);
    const validChannels = [
      "restart-app",
      "save-temp-html",
      "save-layout",
      "load-layout",
   
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  on: (channel, callback) => {
    console.log("IPC on called:", channel);
    const validChannels = ["download-progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  print: (content, settings) => ipcRenderer.invoke("print", content, settings),
  log: {
    error: (message) => ipcRenderer.invoke("log-error", message),
  },
  savePDF: (data) => ipcRenderer.invoke("save-print-pdf", data),
  winPrint: {
    getPrinters: () => ipcRenderer.invoke("win-get-printers"),
    setDefaultPrinter: (printerName) =>
      ipcRenderer.invoke("win-set-default-printer", printerName),
    printFile: (filePath, printerName) =>
      ipcRenderer.invoke("win-print-file", { filePath, printerName }),
    getTempFile: (filename) => ipcRenderer.invoke("get-temp-file", filename),
    updatePrinterStatuses: () => ipcRenderer.invoke("update-printer-statuses"),
  },
  createTempPDF: (htmlContent) =>
    ipcRenderer.invoke("create-temp-pdf", htmlContent),
  saveTempHtml: (html) => ipcRenderer.invoke("save-temp-html", html),
  saveLayout: (layoutData) => ipcRenderer.invoke("save-layout", layoutData),
  loadLayout: () => ipcRenderer.invoke("load-layout"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getGitHubRepoKey: () => ipcRenderer.invoke('get-github-repo-key'),
  manualUpdateCheck: () => ipcRenderer.invoke('manual-update-check'),
  removeAllListeners: (channel) => {
    const validChannels = ["download-progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

});
