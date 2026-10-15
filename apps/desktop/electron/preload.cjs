const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('lumo', {
  urlFor: (p) => `lumo://media/${encodeURIComponent(p)}`,
  openFiles: (exts) => ipcRenderer.invoke('files:open', exts),
  openFolder: (exts) => ipcRenderer.invoke('folder:open', exts),
  ingest: (paths, exts) => ipcRenderer.invoke('files:ingest', paths, exts),
  pathsForFiles: (files) => Array.from(files).map((f) => webUtils.getPathForFile(f)),
  readText: (p) => ipcRenderer.invoke('text:read', p),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (s) => ipcRenderer.invoke('state:save', s),
});
