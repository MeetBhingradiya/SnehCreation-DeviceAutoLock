// Global type declarations for renderer process
export {};

declare global {
    interface Window {
        electronAPI: {
            ipcRenderer: {
                invoke: (channel: string, ...args: any[]) => Promise<any>;
                on: (channel: string, callback: (...args: any[]) => void) => void;
                removeAllListeners: (channel: string) => void;
            };
            minimize: () => void;
            close: () => void;
        };
    }
}
