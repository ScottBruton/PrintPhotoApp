const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
    onUpdateMessage: (callback) => {
        ipcRenderer.on('update-message', (event, message) => callback(message));
    },
    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (event, progress) => callback(progress));
    }
}); 