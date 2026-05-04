const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onGlobalKey: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('global-key', subscription);
    return () => ipcRenderer.removeListener('global-key', subscription);
  },
  onToggleOverlay: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('toggle-overlay-hotkey', subscription);
    return () => ipcRenderer.removeListener('toggle-overlay-hotkey', subscription);
  },
  onGTAStatus: (callback) => {
    const subscription = (_event, status) => callback(status);
    ipcRenderer.on('gta-status', subscription);
    return () => ipcRenderer.removeListener('gta-status', subscription);
  },
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  setWindowSize: (width, height) => ipcRenderer.send('set-window-size', width, height),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onDisplayResize: (callback) => {
    const subscription = (_event, size) => callback(size);
    ipcRenderer.on('display-resize', subscription);
    return () => ipcRenderer.removeListener('display-resize', subscription);
  },
});
