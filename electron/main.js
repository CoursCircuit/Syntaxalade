const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  clipboard,
  dialog,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

// This edition starts with its own empty workspace. It never imports legacy data.
app.setPath(
  "userData",
  process.env.SYNTAXALADE_USER_DATA ||
    path.join(app.getPath("appData"), "Syntaxalade"),
);
app.setName("Syntaxalade");
let mainWindow;
const windowFile = path.join(app.getPath("userData"), "window-state.json");
const indexPath = path.join(app.getAppPath(), "index.html");
const indexURL = pathToFileURL(indexPath).href;
function authorized(event) {
  return (
    mainWindow &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === event.sender.mainFrame &&
    event.senderFrame.url === indexURL
  );
}
function createWindow() {
  let bounds = {};
  try {
    bounds = JSON.parse(fs.readFileSync(windowFile, "utf8"));
  } catch (_) {
    /* first launch */
  }
  const win = new BrowserWindow({
    width: Math.min(2200, Math.max(1000, Number(bounds.width) || 1440)),
    height: Math.min(1500, Math.max(680, Number(bounds.height) || 950)),
    minWidth: 840,
    minHeight: 620,
    backgroundColor: "#f7f8fc",
    show: false,
    title: "Syntaxalade",
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  mainWindow = win;
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== indexURL) event.preventDefault();
  });
  win.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  win.loadFile(indexPath);
  win.once("ready-to-show", () => win.show());
  win.on("enter-full-screen", () =>
    win.webContents.send("fullscreen-changed", true),
  );
  win.on("leave-full-screen", () =>
    win.webContents.send("fullscreen-changed", false),
  );
  win.on("close", () => {
    if (!win.isFullScreen()) {
      try {
        fs.mkdirSync(path.dirname(windowFile), { recursive: true });
        fs.writeFileSync(windowFile, JSON.stringify(win.getNormalBounds()));
      } catch (_) {
        /* window persistence must never block close */
      }
    }
  });
  win.on("closed", () => {
    mainWindow = null;
  });
}
ipcMain.handle("set-fullscreen", (event, value) => {
  if (authorized(event) && typeof value === "boolean")
    mainWindow.setFullScreen(value);
});
ipcMain.handle("copy-text", (event, value) => {
  if (authorized(event) && typeof value === "string" && value.length < 50000)
    clipboard.writeText(value);
});
ipcMain.handle("save-text-file", async (event, payload) => {
  if (!authorized(event)) return { canceled: true };
  if (
    !payload ||
    typeof payload.name !== "string" ||
    typeof payload.content !== "string"
  )
    throw new Error("Le fichier à enregistrer est invalide.");
  const name = path.basename(payload.name),
    extension = path.extname(name).slice(1).toLowerCase();
  if (!["json", "txt", "csv"].includes(extension))
    throw new Error("Ce format de fichier n’est pas pris en charge.");
  if (Buffer.byteLength(payload.content, "utf8") > 10 * 1024 * 1024)
    throw new Error("La sauvegarde dépasse 10 Mo.");
  const result = await dialog.showSaveDialog(mainWindow, {
    title:
      extension === "json"
        ? "Enregistrer une copie de mon travail"
        : "Enregistrer le fichier",
    defaultPath: path.join(app.getPath("downloads"), name),
    filters: [
      {
        name: extension === "json" ? "Sauvegarde Syntaxalade" : "Fichier texte",
        extensions: [extension],
      },
    ],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.promises.writeFile(result.filePath, payload.content, "utf8");
  return { canceled: false };
});
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Syntaxalade",
          submenu: [
            { role: "about", label: "À propos de Syntaxalade" },
            { type: "separator" },
            { role: "hide", label: "Masquer Syntaxalade" },
            { role: "hideOthers", label: "Masquer les autres" },
            { role: "unhide", label: "Tout afficher" },
            { type: "separator" },
            { role: "quit", label: "Quitter Syntaxalade" },
          ],
        },
        {
          label: "Édition",
          submenu: [
            { role: "undo", label: "Annuler" },
            { role: "redo", label: "Rétablir" },
            { type: "separator" },
            { role: "cut", label: "Couper" },
            { role: "copy", label: "Copier" },
            { role: "paste", label: "Coller" },
            { role: "selectAll", label: "Tout sélectionner" },
          ],
        },
        {
          label: "Affichage",
          submenu: [
            { role: "resetZoom", label: "Taille réelle" },
            { role: "zoomIn", label: "Agrandir" },
            { role: "zoomOut", label: "Réduire" },
            { type: "separator" },
            { role: "togglefullscreen", label: "Plein écran" },
          ],
        },
        {
          label: "Fenêtre",
          submenu: [
            { role: "minimize", label: "Réduire" },
            { role: "close", label: "Fermer" },
          ],
        },
      ]),
    );
    createWindow();
    app.on("activate", () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
