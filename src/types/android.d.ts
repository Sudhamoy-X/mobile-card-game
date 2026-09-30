export interface AndroidBridge {
  setFullscreen?: (fullscreen: boolean) => void;
}

declare global {
  interface Window {
    AndroidInterface?: AndroidBridge;
  }
}
