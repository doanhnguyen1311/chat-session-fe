import { contextBridge, ipcRenderer } from "electron";

type UpdateStatus = {
  stage: "idle" | "disabled" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
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

const electronAPI = {
  isWindowActive: (): Promise<boolean> => ipcRenderer.invoke("app:is-window-active"),
  showNotification: (payload: { title: string; body: string }): Promise<boolean> =>
    ipcRenderer.invoke("notification:show", payload),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke("app:open-external", url),
  setUnreadBadge: (count: number): Promise<boolean> => ipcRenderer.invoke("app:set-unread-badge", count),
  updater: {
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke("update:get-status"),
    check: (): Promise<UpdateStatus> => ipcRenderer.invoke("update:check"),
    download: (): Promise<UpdateStatus> => ipcRenderer.invoke("update:download"),
    restartAndInstall: (): Promise<boolean> => ipcRenderer.invoke("update:restart-and-install"),
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus): void => callback(status);
      ipcRenderer.on("update:status", listener);
      return () => ipcRenderer.off("update:status", listener);
    }
  }
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
