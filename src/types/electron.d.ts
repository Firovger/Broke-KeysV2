export interface GlobalKeyEvent {
  key: string;
  type: 'keydown' | 'keyup';
}

declare global {
  interface Window {
    electronAPI?: {
      onGlobalKey: (callback: (event: GlobalKeyEvent) => void) => () => void;
      onGTAStatus: (callback: (isRunning: boolean) => void) => () => void;
      onToggleOverlay: (callback: () => void) => () => void;
      onDisplayResize?: (callback: (size: { width: number; height: number }) => void) => () => void;
      setIgnoreMouse: (ignore: boolean) => void;
      setWindowSize: (width: number, height: number) => void;
      closeApp: () => void;
      minimizeApp: () => void;
    };
  }
}
