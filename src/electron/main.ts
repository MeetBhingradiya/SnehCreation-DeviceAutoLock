#!/usr/bin/env node

import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, shell, Notification } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SecureConfig } from '../config/secure-config.js';
import { DeviceProtector } from '../core/protector.js';
import { SecurityManager } from '../shared/security.js';
import { EmailService } from '../shared/email.js';
import { AutoUpdater } from '../core/auto-updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger utility
const logger = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
};

class SnehDeviceProtectorApp {
    private mainWindow: BrowserWindow | null = null;
    private settingsWindow: BrowserWindow | null = null;
    private tray: Tray | null = null;
    private config: SecureConfig;
    private deviceProtector: DeviceProtector;
    private securityManager: SecurityManager;
    private emailService: EmailService;
    private autoUpdater: AutoUpdater;
    private isQuitting = false;

    constructor() {
        this.config = new SecureConfig();
        this.deviceProtector = new DeviceProtector(this.config);
        this.securityManager = new SecurityManager(this.config);
        this.emailService = new EmailService(this.config);
        this.autoUpdater = new AutoUpdater(this.config);

        this.setupDeviceProtectorEvents();
        this.setupAutoUpdaterEvents();
        // Move setupApp to happen after ready
        this.setupAppWhenReady();
    }

    private setupAppWhenReady(): void {
        // Single instance check - but only when app is ready
        if (app && app.whenReady) {
            app.whenReady().then(() => {
                if (!app.requestSingleInstanceLock()) {
                    app.quit();
                    return;
                }

                this.setupApp();
            });
        } else {
            console.error('❌ Electron app object is not available');
        }
    }

    private setupDeviceProtectorEvents(): void {
        this.deviceProtector.on('started', () => {
            logger.info('🚀 Device protection started');
            this.updateTrayMenu();
        });

        this.deviceProtector.on('stopped', () => {
            logger.info('🛑 Device protection stopped');
            this.updateTrayMenu();
        });

        this.deviceProtector.on('paused', () => {
            logger.info('⏸️ Device monitoring paused');
            this.updateTrayMenu();
        });

        this.deviceProtector.on('resumed', () => {
            logger.info('▶️ Device monitoring resumed');
            this.updateTrayMenu();
        });

        this.deviceProtector.on('locked', () => {
            logger.info('🔒 Device locked');
            this.updateTrayMenu();
            this.showNotification('Device Locked', 'Your device has been locked due to inactivity.');
        });

        this.deviceProtector.on('unlocked', () => {
            logger.info('🔓 Device unlocked');
            this.updateTrayMenu();
            this.showNotification('Device Unlocked', 'Device protection resumed.');
        });

        this.deviceProtector.on('activity-detected', () => {
            // Silent activity logging
        });

        this.deviceProtector.on('lock-failed', (error) => {
            logger.error('❌ Lock failed:', error);
            this.showNotification('Lock Failed', 'Failed to lock the device.', 'error');
        });

        this.deviceProtector.on('unlock-failed', () => {
            logger.warn('⚠️ Unlock attempt failed');
        });
    }

    private setupApp(): void {
        app.on('second-instance', () => {
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });

        this.createTray();
        this.setupIPC();

        // Check startup status and show warning if needed
        setTimeout(() => {
            this.showStartupWarning();
        }, 3000);

        // Open settings window by default on first launch
        setTimeout(() => {
            this.showSettings();
        }, 1000);

        // Auto-start protection if enabled
        if (this.config.get('enableTray')) {
            setTimeout(() => {
                this.deviceProtector.start();
                logger.info('🚀 Auto-started device protection');
            }, 2000); // Give time for app to fully initialize
        }

        logger.info('🚀 Sneh Creation Device Protector Ready');

        app.on('window-all-closed', (event: Event) => {
            event.preventDefault(); // Prevent default quit behavior
            // Keep app running in system tray
        });

        app.on('before-quit', () => {
            this.isQuitting = true;
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.showSettings();
            }
        });
    }

    private createTray(): void {
        try {
            // Create a simple colored icon programmatically since we don't have assets yet
            const iconPath = this.createTrayIcon();

            // Check if icon file exists
            const fs = require('fs');
            if (!fs.existsSync(iconPath)) {
                logger.warn(`⚠️ Icon file not found at: ${iconPath}`);
                // Use a fallback or create a simple icon
            }

            this.tray = new Tray(iconPath);

            this.updateTrayMenu();

            this.tray.setToolTip('Sneh Creation Device Protector');
            this.tray.on('double-click', () => {
                logger.info('🖱️ Tray double-clicked - opening settings');
                this.showSettings();
            });

            // Add context menu click handler
            this.tray.on('click', () => {
                logger.info('🖱️ Tray clicked - showing context menu');
            });

            logger.info('🔧 System tray created');
        } catch (error) {
            logger.error('❌ Failed to create system tray:', error);
        }
    }

    private createTrayIcon(): string {
        // Use the assets folder for the icon
        const iconPath = join(process.cwd(), 'assets', 'icon.ico');
        logger.info(`🎨 Loading tray icon from: ${iconPath}`);
        return iconPath;
    }

    private updateTrayMenu(): void {
        if (!this.tray) {
            logger.warn('⚠️ Tray not initialized, cannot update menu');
            return;
        }

        const status = this.deviceProtector.getStatus();
        const lockStatus = status.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED';
        const monitorStatus = status.isMonitoring ? '👀 ACTIVE' : '⏸️ PAUSED';

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Device Protector',
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: `Status: ${lockStatus}`,
                type: 'normal',
                enabled: false
            },
            {
                label: `Monitoring: ${monitorStatus}`,
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: '⚙️ Open Settings',
                type: 'normal',
                click: () => {
                    logger.info('📋 Settings menu clicked');
                    this.showSettings();
                }
            },
            {
                label: '🔒 Lock Device',
                type: 'normal',
                enabled: !status.isLocked,
                click: () => {
                    logger.info('🔒 Lock device menu clicked');
                    this.lockDevice();
                }
            },
            {
                label: status.isMonitoring ? '🛑 Stop Protection' : '▶️ Start Protection',
                type: 'normal',
                click: () => {
                    if (status.isMonitoring) {
                        logger.info('🛑 Stop protection menu clicked');
                        this.stopProtection();
                    } else {
                        logger.info('▶️ Start protection menu clicked');
                        this.startProtection();
                    }
                }
            },
            {
                label: status.isMonitoring && !this.deviceProtector.isPaused() ? '⏸️ Pause Monitoring' : '▶️ Resume Monitoring',
                type: 'normal',
                enabled: status.isMonitoring, // Only enable if protection is running
                click: () => {
                    if (this.deviceProtector.isPaused()) {
                        logger.info('▶️ Resume monitoring menu clicked');
                        this.resumeMonitoring();
                    } else {
                        logger.info('⏸️ Pause monitoring menu clicked');
                        this.pauseMonitoring();
                    }
                }
            },
            { type: 'separator' },
            {
                label: '🚪 Exit',
                type: 'normal',
                click: () => {
                    logger.info('🚪 Exit menu clicked');
                    this.quitApplication();
                }
            }
        ]);

        try {
            this.tray.setContextMenu(contextMenu);
            logger.info('📋 Tray context menu updated');
        } catch (error) {
            logger.error('❌ Failed to update tray menu:', error);
        }
    }

    private startProtection(): void {
        try {
            this.deviceProtector.start();
            this.updateTrayMenu();
            this.showNotification('Protection Started', 'Device protection has been started.');
            logger.info('▶️ Protection started via tray');
        } catch (error) {
            logger.error('❌ Failed to start protection:', error);
        }
    }

    private async showSettings(): Promise<void> {
        try {
            logger.info('🔧 showSettings() called');
            
            // Temporarily disable PIN check for testing - you can re-enable this later
            // const requiresPin = this.config.has('settingsPin');
            const requiresPin = false; // TEMPORARY: Disabled for testing tab switching

            if (requiresPin && this.settingsWindow === null) {
                logger.info('📌 PIN verification required');
                const pinResult = await this.showPinDialog();
                if (!pinResult.success) {
                    logger.warn('❌ PIN verification failed');
                    return; // PIN verification failed
                }
            }

            if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
                logger.info('🔄 Settings window already exists, focusing...');
                this.settingsWindow.focus();
                this.settingsWindow.show(); // Ensure it's visible
                return;
            }

            logger.info('🏗️ Creating new settings window...');
            this.settingsWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: join(__dirname, 'renderer/preload.js')
                },
                titleBarStyle: 'hidden',
                titleBarOverlay: {
                    color: '#2f3241',
                    symbolColor: '#74b1be'
                },
                show: false,
                icon: join(process.cwd(), 'assets', 'icon.ico')
            });

            logger.info('🌐 Loading settings HTML...');
            
            try {
                // In production, the HTML files are in the src/renderer folder relative to the working directory
                // In development, try the same path
                const htmlPath = join(process.cwd(), 'src/renderer/settings.html');
                logger.info(`🔍 Loading settings from: ${htmlPath}`);

                // Check if file exists
                const fs = require('fs');
                if (fs.existsSync(htmlPath)) {
                    await this.settingsWindow.loadFile(htmlPath);
                    logger.info('✅ Settings HTML loaded successfully');
                } else {
                    // Try alternative paths for different build configurations
                    const altPaths = [
                        join(__dirname, '../../src/renderer/settings.html'),
                        join(__dirname, '../src/renderer/settings.html'),
                        join(process.resourcesPath, 'src/renderer/settings.html')
                    ];

                    let loaded = false;
                    for (const altPath of altPaths) {
                        if (fs.existsSync(altPath)) {
                            logger.info(`🔍 Loading settings from alternative path: ${altPath}`);
                            await this.settingsWindow.loadFile(altPath);
                            loaded = true;
                            break;
                        }
                    }

                    if (!loaded) {
                        throw new Error('Settings HTML file not found in any expected location');
                    }
                }
            } catch (htmlError) {
                logger.error('❌ Failed to load settings HTML:', htmlError);
                if (this.settingsWindow) {
                    this.settingsWindow.close();
                    this.settingsWindow = null;
                }
                return;
            }

            this.settingsWindow.once('ready-to-show', () => {
                this.settingsWindow?.show();
                // Disable DevTools for now to avoid issues
                // this.settingsWindow?.webContents.openDevTools();
                logger.info('✅ Settings window is now visible');
            });

            this.settingsWindow.on('closed', () => {
                logger.info('⚙️ Settings window closed');
                this.settingsWindow = null;
            });

            logger.info('⚙️ Settings window setup complete');
            
        } catch (error) {
            logger.error('❌ Error in showSettings():', error);
            if (this.settingsWindow) {
                this.settingsWindow.close();
                this.settingsWindow = null;
            }
        }
    }

    private async showPinDialog(): Promise<{ success: boolean; isEmailOtp?: boolean }> {
        return new Promise((resolve) => {
            const pinWindow = new BrowserWindow({
                width: 400,
                height: 300,
                modal: true,
                parent: this.settingsWindow || undefined,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: join(__dirname, 'renderer/preload.js')
                },
                resizable: false,
                maximizable: false,
                minimizable: false,
                show: false
            });

            // Load PIN dialog HTML with proper path handling
            const fs = require('fs');
            const pinHtmlPath = join(process.cwd(), 'src/renderer/pin-dialog.html');
            if (fs.existsSync(pinHtmlPath)) {
                pinWindow.loadFile(pinHtmlPath);
            } else {
                // Try alternative paths
                const altPaths = [
                    join(__dirname, '../../src/renderer/pin-dialog.html'),
                    join(__dirname, '../src/renderer/pin-dialog.html')
                ];
                let loaded = false;
                for (const altPath of altPaths) {
                    if (fs.existsSync(altPath)) {
                        pinWindow.loadFile(altPath);
                        loaded = true;
                        break;
                    }
                }
                if (!loaded) {
                    logger.error('❌ PIN dialog HTML not found');
                }
            }

            pinWindow.once('ready-to-show', () => {
                pinWindow.show();
            });

            // Handle PIN verification
            ipcMain.once('verify-pin', async (event, pin: string) => {
                const isValid = this.securityManager.verifySettingsPin(pin);

                if (isValid) {
                    pinWindow.close();
                    resolve({ success: true });
                } else {
                    event.reply('pin-result', { success: false, message: 'Invalid PIN' });
                }
            });

            // Handle forgot PIN - send OTP
            ipcMain.once('forgot-pin', async (event) => {
                try {
                    const email = this.config.get('recoveryEmail');
                    if (!email) {
                        event.reply('pin-result', {
                            success: false,
                            message: 'No recovery email configured'
                        });
                        return;
                    }

                    const otp = this.securityManager.generateOTP();
                    await this.emailService.sendOTP(email, otp);

                    event.reply('pin-result', {
                        success: false,
                        message: 'OTP sent to recovery email',
                        showOtpInput: true
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    event.reply('pin-result', {
                        success: false,
                        message: 'Failed to send OTP: ' + message
                    });
                }
            });

            // Handle OTP verification
            ipcMain.once('verify-otp', (event, otp: string) => {
                const isValid = this.securityManager.verifyOTP(otp);

                if (isValid) {
                    pinWindow.close();
                    resolve({ success: true, isEmailOtp: true });
                } else {
                    event.reply('pin-result', { success: false, message: 'Invalid OTP' });
                }
            });

            pinWindow.on('closed', () => {
                resolve({ success: false });
            });
        });
    }

    private async lockDevice(): Promise<void> {
        try {
            logger.info('🔒 Manual lock triggered via tray');
            const success = await this.deviceProtector.manualLock();
            if (success) {
                this.updateTrayMenu();
                this.showNotification('Device Locked', 'Your device has been locked for security.');
            } else {
                throw new Error('Lock failed');
            }
        } catch (error) {
            logger.error('❌ Manual lock failed:', error);
            this.showNotification('Lock Failed', 'Failed to lock the device.', 'error');
        }
    }

    private stopProtection(): void {
        try {
            this.deviceProtector.stop();
            this.updateTrayMenu();
            this.showNotification('Protection Stopped', 'Device protection has been stopped.');
            logger.info('🛑 Protection stopped via tray');
        } catch (error) {
            logger.error('❌ Failed to stop protection:', error);
        }
    }

    private pauseMonitoring(): void {
        try {
            this.deviceProtector.pause();
            this.updateTrayMenu();
            this.showNotification('Monitoring Paused', 'Device monitoring has been paused.');
            logger.info('⏸️ Monitoring paused via tray');
        } catch (error) {
            logger.error('❌ Failed to pause monitoring:', error);
        }
    }

    private resumeMonitoring(): void {
        try {
            this.deviceProtector.resume();
            this.updateTrayMenu();
            this.showNotification('Monitoring Resumed', 'Device monitoring has been resumed.');
            logger.info('▶️ Monitoring resumed via tray');
        } catch (error) {
            logger.error('❌ Failed to resume monitoring:', error);
        }
    }

    private setupIPC(): void {
        // Get current config
        ipcMain.handle('get-config', () => {
            return this.config.getAll();
        });

        // Update config
        ipcMain.handle('update-config', (event, updates: any) => {
            try {
                Object.keys(updates).forEach(key => {
                    this.config.set(key as keyof DeviceConfig, updates[key]);
                });

                // Update timeout if changed
                if ('defaultTimeout' in updates) {
                    this.deviceProtector.updateTimeout(updates.defaultTimeout);
                }

                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Get protection status
        ipcMain.handle('get-status', () => {
            return this.deviceProtector.getStatus();
        });

        // Test lock
        ipcMain.handle('test-lock', async () => {
            try {
                const success = await this.deviceProtector.manualLock();
                return { success };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Generate new settings PIN
        ipcMain.handle('generate-pin', () => {
            const pin = this.securityManager.generateSettingsPin();
            return pin;
        });

        // Send test email
        ipcMain.handle('test-email', async (event, email: string) => {
            try {
                const otp = this.securityManager.generateOTP();
                await this.emailService.sendOTP(email, otp);
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Export config
        ipcMain.handle('export-config', () => {
            return this.config.export();
        });

        // Import config
        ipcMain.handle('import-config', (event, configData: any) => {
            try {
                Object.keys(configData).forEach(key => {
                    this.config.set(key as keyof DeviceConfig, configData[key]);
                });
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Start protection
        ipcMain.handle('start-protection', () => {
            try {
                this.deviceProtector.start();
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Stop protection
        ipcMain.handle('stop-protection', () => {
            try {
                this.deviceProtector.stop();
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Windows Startup Management
        ipcMain.handle('get-startup-status', () => {
            return {
                enabled: this.checkStartupStatus(),
                openAtLogin: app.getLoginItemSettings().openAtLogin,
                openAsHidden: app.getLoginItemSettings().openAsHidden
            };
        });

        ipcMain.handle('set-startup-status', (event, enabled: boolean) => {
            try {
                this.setStartupStatus(enabled);
                return { success: true, enabled: this.checkStartupStatus() };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return { success: false, error: message };
            }
        });

        // Window controls
        ipcMain.handle('minimize-window', () => {
            if (this.settingsWindow) {
                this.settingsWindow.minimize();
            }
        });

        ipcMain.handle('close-window', () => {
            if (this.settingsWindow) {
                this.settingsWindow.close();
            }
        });

        // Additional window control methods that the settings UI expects
        ipcMain.handle('window-minimize', () => {
            if (this.settingsWindow) {
                this.settingsWindow.minimize();
            }
        });

        ipcMain.handle('window-close', () => {
            if (this.settingsWindow) {
                this.settingsWindow.close();
            }
        });

        // Auto-update handlers
        ipcMain.handle('check-for-updates', async () => {
            try {
                const updateInfo = await this.autoUpdater.checkForUpdates();
                return updateInfo;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(message);
            }
        });

        ipcMain.handle('download-update', async (event) => {
            try {
                const updateInfo = await this.autoUpdater.checkForUpdates();
                if (updateInfo) {
                    // Set up progress listener
                    this.autoUpdater.on('download-progress', (progress) => {
                        event.sender.send('download-progress', progress);
                    });

                    await this.autoUpdater.downloadUpdate(updateInfo);
                    return { success: true };
                } else {
                    throw new Error('No update available');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(message);
            }
        });

        ipcMain.handle('install-update', async () => {
            try {
                // This will close the app and install the update
                await this.autoUpdater.installUpdate('');
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(message);
            }
        });
    }

    private showNotification(title: string, body: string, type: 'info' | 'error' = 'info'): void {
        if (!this.config.get('enableNotifications')) return;

        if (Notification.isSupported()) {
            const notification = new Notification({
                title: `🛡️ ${title}`,
                body: body,
                silent: false,
                icon: join(process.cwd(), 'assets/icon.ico'),
                urgency: type === 'error' ? 'critical' : 'normal',
                timeoutType: 'default'
            });

            notification.on('click', () => {
                // Focus the settings window if it exists, otherwise open it
                if (this.settingsWindow) {
                    this.settingsWindow.focus();
                } else {
                    this.showSettings();
                }
            });

            notification.show();

            // Auto-close after 5 seconds for info notifications
            if (type === 'info') {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }
        }
    }

    // Windows Startup Integration
    private checkStartupStatus(): boolean {
        return app.getLoginItemSettings().openAtLogin;
    }

    private setStartupStatus(enabled: boolean): void {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true,
            name: 'Sneh Creation Device Protector',
            path: process.execPath
        });

        if (enabled) {
            logger.info('✅ Windows startup integration enabled');
        } else {
            logger.info('❌ Windows startup integration disabled');
        }
    }

    private showStartupWarning(): void {
        if (!this.checkStartupStatus()) {
            // We'll add this to settings UI later - for now just log
            logger.warn('⚠️  Application is not set to start with Windows');
        }
    }

    private async quitApplication(): Promise<void> {
        const response = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 1,
            message: 'Are you sure you want to quit Device Protector?',
            detail: 'This will stop all device protection. Your device will no longer be automatically locked.'
        });

        if (response.response === 0) {
            this.isQuitting = true;
            app.quit();
        }
    }

    private setupAutoUpdaterEvents(): void {
        this.autoUpdater.on('checking-for-update', () => {
            logger.info('🔍 Checking for updates...');
        });

        this.autoUpdater.on('update-available', (info) => {
            logger.info(`🆕 Update available: ${info.version}`);
            this.showNotification('Update Available',
                `Version ${info.version} is available. Click to download.`);
        });

        this.autoUpdater.on('update-not-available', () => {
            logger.info('✅ App is up to date');
        });

        this.autoUpdater.on('update-download-started', () => {
            logger.info('⬬ Downloading update...');
            this.showNotification('Downloading Update', 'Update download started...');
        });

        this.autoUpdater.on('download-progress', (progress) => {
            const percent = Math.round(progress.percent);
            logger.info(`📥 Download progress: ${percent}%`);
        });

        this.autoUpdater.on('update-downloaded', (filePath) => {
            logger.info(`✅ Update downloaded: ${filePath}`);
            this.showNotification('Update Ready',
                'Update has been downloaded and will be installed when you restart the app.');
        });

        this.autoUpdater.on('before-quit-for-update', () => {
            logger.info('🔄 Installing update...');
            this.isQuitting = true;
        });

        this.autoUpdater.on('error', (error) => {
            logger.error('❌ Auto-updater error:', error);
            this.showNotification('Update Error',
                'Failed to check for updates. Please try again later.', 'error');
        });

        // Start auto-updater
        this.autoUpdater.start();
    }
}

// Initialize the application
new SnehDeviceProtectorApp();
