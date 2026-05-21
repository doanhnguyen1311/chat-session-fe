declare global {
  interface Window {
    electronAPI: {
      isWindowActive: () => Promise<boolean>;
      showNotification: (payload: { title: string; body: string }) => Promise<boolean>;
    };
  }
}

export {};
