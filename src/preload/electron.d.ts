declare global {
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

  interface Window {
    electronAPI: {
      isWindowActive: () => Promise<boolean>;
      showNotification: (payload: { title: string; body: string }) => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;
      setUnreadBadge: (count: number) => Promise<boolean>;
      updater: {
        getStatus: () => Promise<UpdateStatus>;
        check: () => Promise<UpdateStatus>;
        download: () => Promise<UpdateStatus>;
        restartAndInstall: () => Promise<boolean>;
        onStatus: (callback: (status: UpdateStatus) => void) => () => void;
      };
    };
  }
}

export {};
