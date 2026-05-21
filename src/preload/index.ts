import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  isWindowActive: (): Promise<boolean> => ipcRenderer.invoke("app:is-window-active"),
  showNotification: (payload: { title: string; body: string }): Promise<boolean> =>
    ipcRenderer.invoke("notification:show", payload)
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
