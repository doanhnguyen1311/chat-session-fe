import path from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, shell } from "electron";
import { configureAutoUpdater } from "./updater";

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (url !== currentUrl && (url.startsWith("http://") || url.startsWith("https://"))) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function configureLaunchOnStartup(): void {
  if (!app.isPackaged || process.platform !== "win32") return;

  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false,
    path: process.execPath
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  configureAutoUpdater();
  configureLaunchOnStartup();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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

ipcMain.handle("app:open-external", async (_event, url: string) => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("app:set-unread-badge", (_event, count: number) => {
  const unread = Math.max(0, Math.floor(Number(count) || 0));
  if (process.platform === "win32") {
    if (unread > 0) {
      const label = unread > 99 ? "99+" : String(unread);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="10" y="10" width="236" height="236" rx="118" fill="#ef2029"/><text x="128" y="154" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#ffffff">${label}</text></svg>`;
      mainWindow?.setOverlayIcon(nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`), `${unread} unread messages`);
    } else {
      mainWindow?.setOverlayIcon(null, "");
    }
  }
  app.setBadgeCount(unread);
  return true;
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
