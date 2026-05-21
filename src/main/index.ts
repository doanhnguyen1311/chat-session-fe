import path from "node:path";
import { app, BrowserWindow, ipcMain, Menu, Notification } from "electron";
import { checkForUpdates, configureAutoUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: "#f7f5ef",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  configureAutoUpdater();
  createWindow();
  setTimeout(() => {
    void checkForUpdates();
  }, 1500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      setTimeout(() => {
        void checkForUpdates();
      }, 1500);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:is-window-active", () => {
  return Boolean(mainWindow && mainWindow.isFocused() && !mainWindow.isMinimized());
});

ipcMain.handle("notification:show", (_event, payload: { title: string; body: string }) => {
  if (!Notification.isSupported()) {
    return false;
  }

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: true
  });

  notification.on("click", () => {
    if (!mainWindow) {
      createWindow();
    }

    if (mainWindow?.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow?.show();
    mainWindow?.focus();
  });

  notification.show();
  return true;
});
