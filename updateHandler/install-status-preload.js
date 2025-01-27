const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installStatus', {
    onStatusUpdate: (callback) => {
        ipcRenderer.on('installation-status', (event, message) => callback(message));
    }
}); 