import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo, UpdateInfo } from "electron-updater";

type UpdateStage =
  | "idle"
  | "disabled"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

type UpdateStatus = {
  stage: UpdateStage;
  message: string;
  version: string;
  availableVersion?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  error?: string;
  updatedAt: string;
};

let status: UpdateStatus = {
  stage: "idle",
  message: "Updater is ready.",
  version: app.getVersion(),
  updatedAt: new Date().toISOString()
};

let checking = false;
let configured = false;
let logFilePath = "";
let checkTimeout: NodeJS.Timeout | null = null;

function clearCheckTimeout(): void {
  if (!checkTimeout) return;
  clearTimeout(checkTimeout);
  checkTimeout = null;
}

function startCheckTimeout(): void {
  clearCheckTimeout();
  checkTimeout = setTimeout(() => {
    if (!checking || status.stage !== "checking") return;

    checking = false;
    publish({
      stage: "error",
      message: "Update check timed out. Please try again.",
      error: "Timed out while checking GitHub Releases for updates."
    });
  }, 45_000);
}

function writeLog(level: "info" | "warn" | "error" | "debug", message: string, metadata?: unknown): void {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${
    metadata ? ` ${JSON.stringify(metadata)}` : ""
  }\n`;

  if (level === "error") {
    console.error(line.trim());
  } else if (level === "warn") {
    console.warn(line.trim());
  } else {
    console.log(line.trim());
  }

  if (!logFilePath) return;

  try {
    fs.appendFileSync(logFilePath, line, "utf8");
  } catch (error) {
    console.error("[updater] Failed to write updater log", error);
  }
}

function publish(next: Omit<UpdateStatus, "version" | "updatedAt">): void {
  status = {
    ...next,
    version: app.getVersion(),
    updatedAt: new Date().toISOString()
  };

  writeLog(status.stage === "error" ? "error" : "info", status.message, {
    stage: status.stage,
    availableVersion: status.availableVersion,
    percent: status.percent,
    error: status.error
  });

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("update:status", status);
  }
}

function toAvailableVersion(info?: UpdateInfo): string | undefined {
  return info?.version;
}

export function configureAutoUpdater(): void {
  if (configured) return;
  configured = true;

  logFilePath = path.join(app.getPath("userData"), "auto-updater.log");

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = {
    info: (message?: unknown) => writeLog("info", String(message ?? "")),
    warn: (message?: unknown) => writeLog("warn", String(message ?? "")),
    error: (message?: unknown) => writeLog("error", String(message ?? "")),
    debug: (message?: unknown) => writeLog("debug", String(message ?? ""))
  };

  autoUpdater.on("checking-for-update", () => {
    checking = true;
    startCheckTimeout();
    publish({
      stage: "checking",
      message: "Checking for updates..."
    });
  });

  autoUpdater.on("update-available", (info) => {
    clearCheckTimeout();
    publish({
      stage: "available",
      message: `Version ${info.version} is available.`,
      availableVersion: toAvailableVersion(info)
    });
  });

  autoUpdater.on("update-not-available", () => {
    checking = false;
    clearCheckTimeout();
    publish({
      stage: "not-available",
      message: "You are running the latest version."
    });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    publish({
      stage: "downloading",
      message: `Downloading update ${Math.round(progress.percent)}%...`,
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
      availableVersion: status.availableVersion
    });
  });

  autoUpdater.on("update-downloaded", (event) => {
    checking = false;
    publish({
      stage: "downloaded",
      message: `Version ${event.version} is ready to install.`,
      availableVersion: event.version
    });
  });

  autoUpdater.on("error", (error) => {
    checking = false;
    clearCheckTimeout();
    publish({
      stage: "error",
      message: "Update failed. Please try again later.",
      error: error instanceof Error ? error.message : String(error)
    });
  });

  ipcMain.handle("update:get-status", () => status);

  ipcMain.handle("update:check", async () => {
    await checkForUpdates();
    return status;
  });

  ipcMain.handle("update:download", async () => {
    await downloadUpdate();
    return status;
  });

  ipcMain.handle("update:restart-and-install", () => {
    if (status.stage !== "downloaded") {
      return false;
    }

    writeLog("info", "Restarting app to install update.");
    autoUpdater.quitAndInstall(false, true);
    return true;
  });
}

export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) {
    publish({
      stage: "disabled",
      message: "Auto update is only enabled in the packaged production app."
    });
    return;
  }

  if (status.stage !== "available") {
    return;
  }

  try {
    publish({
      stage: "downloading",
      message: "Downloading update 0%...",
      percent: 0,
      availableVersion: status.availableVersion
    });
    await autoUpdater.downloadUpdate();
  } catch (error) {
    publish({
      stage: "error",
      message: "Could not download update.",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) {
    publish({
      stage: "disabled",
      message: "Auto update is only enabled in the packaged production app."
    });
    return;
  }

  if (checking) return;

  try {
    checking = true;
    await autoUpdater.checkForUpdates();
  } catch (error) {
    checking = false;
    publish({
      stage: "error",
      message: "Could not check for updates.",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
