// OrnithChat desktop shell (Electron).
// In dev it loads the Next dev server; when packaged it serves the static
// export (out/) from a tiny in-process HTTP server and loads that.
const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const isDev = !app.isPackaged;
const OUT_DIR = path.join(app.getAppPath(), "out");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        let filePath = path.normalize(path.join(OUT_DIR, urlPath));
        if (!filePath.startsWith(OUT_DIR)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          if (fs.existsSync(filePath + ".html")) filePath += ".html";
          else filePath = path.join(OUT_DIR, "index.html"); // SPA fallback
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr ? addr.port : 0);
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#0d0d0f",
    title: "OrnithChat",
    autoHideMenuBar: true,
    // Windows' default title bar renders as a stark white strip that clashes
    // with the app's dark theme. `titleBarStyle: "hidden"` removes it while
    // `titleBarOverlay` keeps the min/max/close buttons, drawn in colors that
    // match the app instead of the OS default — no visible seam between the
    // window chrome and the content below it.
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#161618",
      symbolColor: "#e8e8ea",
      height: 36,
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Asks before ever leaving the app — nothing opens silently, and nothing
  // ever navigates the app window itself away from its own UI.
  const promptExternal = async (url) => {
    const { response } = await dialog.showMessageBox(win, {
      type: "question",
      buttons: ["Open in Browser", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: "Open external link?",
      message: "This link leaves OrnithChat.",
      detail: url,
    });
    if (response === 0) shell.openExternal(url);
  };

  // target="_blank" / window.open() — never spawn a second window inside the
  // app; either way the request is denied, only the prompt differs by kind.
  win.webContents.setWindowOpenHandler(({ url }) => {
    promptExternal(url);
    return { action: "deny" };
  });

  // Known before the first loadURL below in both branches, so the very first
  // (legitimate) navigation into the app's own UI is never mistaken for an
  // external one.
  let allowedOrigin;

  // Any top-level navigation away from that origin — a plain <a href>, a
  // redirect, `location.href = ...` — is stopped here; the window stays on
  // the app and the user is asked instead of being silently carried away.
  // (Next.js client-side routing uses the History API, not full navigation,
  // so normal in-app links never hit this at all.)
  win.webContents.on("will-navigate", (event, url) => {
    if (allowedOrigin && new URL(url).origin !== allowedOrigin) {
      event.preventDefault();
      promptExternal(url);
    }
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_DEV_URL || "http://localhost:3000";
    allowedOrigin = new URL(devUrl).origin;
    await win.loadURL(devUrl);
  } else {
    const port = await startStaticServer();
    allowedOrigin = `http://127.0.0.1:${port}`;
    await win.loadURL(`${allowedOrigin}/`);
  }
}

// Real native folder picker — the renderer can't do this itself (browsers
// deliberately never expose absolute filesystem paths), so it asks the main
// process over IPC, which has full OS access, to show the real dialog.
ipcMain.handle("pick-directory", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
