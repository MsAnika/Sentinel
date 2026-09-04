export interface IntelXDesktopBridge {
  isDesktop: boolean;
  platform: string;
  version: string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getAppInfo: () => {
    name: string;
    mode: string;
    authority: string;
  };
}

declare global {
  interface Window {
    intelxDesktop?: IntelXDesktopBridge;
  }
}
