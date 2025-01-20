const { contextBridge, ipcRenderer } = require("electron");

// Add console log to verify preload script is running
console.log("Preload script running");

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => {
    console.log("IPC invoke called:", channel, data);
    const validChannels = [
      "check-for-updates",
      "download-update",
      "install-update",
      "restart-app",
      "save-temp-html",
      "save-layout",
      "load-layout",
      "cancel-download",
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
  },
  createTempPDF: (htmlContent) =>
    ipcRenderer.invoke("create-temp-pdf", htmlContent),
  saveTempHtml: (html) => ipcRenderer.invoke("save-temp-html", html),
  saveLayout: (layoutData) => ipcRenderer.invoke("save-layout", layoutData),
  loadLayout: () => ipcRenderer.invoke("load-layout"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  removeAllListeners: (channel) => {
    const validChannels = ["download-progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  cancelDownload: () => ipcRenderer.invoke("cancel-download"),
});
