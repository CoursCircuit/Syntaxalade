const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("syntaxalade", {
  setFullscreen: (enabled) =>
    ipcRenderer.invoke("set-fullscreen", Boolean(enabled)),
  copyText: (text) => ipcRenderer.invoke("copy-text", String(text)),
  saveTextFile: (name, content) =>
    ipcRenderer.invoke("save-text-file", { name, content }),
  onFullscreenChanged: (callback) => {
    const handler = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("fullscreen-changed", handler);
    return () => ipcRenderer.removeListener("fullscreen-changed", handler);
  },
});
