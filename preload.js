const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    print: (content, settings) => ipcRenderer.invoke('print', content, settings),
    log: {
        error: (message) => ipcRenderer.invoke('log-error', message)
    }
}); 