const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },
    print: {
        preview: (htmlContent) => ipcRenderer.invoke('print-preview', htmlContent)
    },
    log: {
        error: (message) => ipcRenderer.invoke('log-error', message)
    }
}); 