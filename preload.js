const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    }
}); 