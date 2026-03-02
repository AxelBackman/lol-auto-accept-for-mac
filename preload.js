const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleAutoAccept: (enabled) => ipcRenderer.send('toggle-auto-accept', enabled),
    onStatusUpdate: (callback) => {
        ipcRenderer.removeAllListeners('status-update');
        ipcRenderer.on('status-update', (_event, status) => callback(status));
    },
});
