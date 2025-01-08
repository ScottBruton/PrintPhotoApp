const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => {
    const validChannels = [
      "check-for-updates",
      "install-update",
      "restart-app",
      "create-main-window",
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
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
  createTempPDF: (htmlContent) => ipcRenderer.invoke("create-temp-pdf", htmlContent)
});
