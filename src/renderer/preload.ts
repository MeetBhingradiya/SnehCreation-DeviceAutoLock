#!/usr/bin/env bun

import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer
const electronAPI = {
    // Window controls
    minimize: () => ipcRenderer.invoke('minimize-window'),
    close: () => ipcRenderer.invoke('close-window'),

    // Configuration management
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (updates: any) => ipcRenderer.invoke('update-config', updates),
    
    // Protection controls
    getStatus: () => ipcRenderer.invoke('get-status'),
    startProtection: () => ipcRenderer.invoke('start-protection'),
    stopProtection: () => ipcRenderer.invoke('stop-protection'),
    testLock: () => ipcRenderer.invoke('test-lock'),
    
    // Security
    generatePin: () => ipcRenderer.invoke('generate-pin'),
    testEmail: (email: string) => ipcRenderer.invoke('test-email', email),
    
    // Config backup/restore
    exportConfig: () => ipcRenderer.invoke('export-config'),
    importConfig: (configData: any) => ipcRenderer.invoke('import-config', configData),
    
    // Windows startup management
    getStartupStatus: () => ipcRenderer.invoke('get-startup-status'),
    setStartupStatus: (enabled: boolean) => ipcRenderer.invoke('set-startup-status', enabled),
    
    // Auto-updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    // Event listeners
    onUpdateAvailable: (callback: (info: any) => void) => {
        ipcRenderer.on('update-available', (event, info) => callback(info));
    },
    onUpdateDownloaded: (callback: () => void) => {
        ipcRenderer.on('update-downloaded', () => callback());
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
        ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },
    
    // Remove listeners
    removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose for legacy compatibility (if needed)
contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer),
    removeAllListeners: ipcRenderer.removeAllListeners.bind(ipcRenderer)
});
