const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
    onUpdateMessage: (callback) => {
        ipcRenderer.on('update-message', (event, message) => callback(message));
    },
    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (event, progress) => callback(progress));
    },
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, info) => callback(info));
    },
    downloadUpdate: () => {
        ipcRenderer.send('download-update');
    },
    cancelUpdate: () => {
        ipcRenderer.send('cancel-update');
    }
}); 