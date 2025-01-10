const { contextBridge, ipcRenderer } = require("electron");
const Session = require("./path/to/Session");

const session = new Session();

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
  createTempPDF: (htmlContent) =>
    ipcRenderer.invoke("create-temp-pdf", htmlContent),

  // Exposing session methods
  sessionAPI: {
    addPage: (pageSize) => session.addPage(pageSize),
    getCurrentPage: () => session.getCurrentPage(),
    saveToLocalStorage: () => session.saveToLocalStorage(),
    loadFromLocalStorage: () => Session.loadFromLocalStorage(),
    addCard: (x, y, width, height) =>
      session.getCurrentPage().addCard(x, y, width, height),
    generatePreview: (pageNumber) =>
      session.pages[pageNumber - 1]?.generatePreview(),
    getSessionData: () => session,
  },
});
