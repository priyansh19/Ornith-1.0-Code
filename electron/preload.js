// Preload runs with context isolation — this is the only safe place to
// expose a narrow, specific bridge from the sandboxed renderer to the main
// process's OS-level APIs (contextIsolation: true means the renderer can't
// reach `require("electron")` directly; that's a security boundary, not a
// bug to work around).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  pickDirectory: () => ipcRenderer.invoke("pick-directory"),
});

// NOTE: deliberately no DOM mutation here. Stamping an attribute on <html>
// at preload time made the server-rendered HTML differ from the client DOM
// and triggered a React hydration mismatch on every launch. The UI detects
// Electron via window.electronAPI (useIsElectron) instead.
