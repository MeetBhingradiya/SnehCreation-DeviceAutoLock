// Simple system tray implementation without external dependencies
import { Logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import path from 'path';

export class SystemTray {
    constructor(protector) {
        this.protector = protector;
        this.logger = new Logger('SystemTray');
        this.tray = null;
    }

    async create() {
        try {
            const menuItems = [
                {
                    title: "Sneh Creation - Device Protector",
                    enabled: false
                },
                {
                    title: `Version: ${process.env.npm_package_version || '1.0.0'}`,
                    enabled: false
                },
                {
                    title: "----"
                },
                {
                    title: "Status: Protected",
                    enabled: false
                },
                {
                    title: "----"
                },
                {
                    title: "Settings",
                    click: () => this.showSettings()
                },
                {
                    title: "Check for Updates",
                    click: () => this.checkForUpdates()
                },
                {
                    title: "----"
                },
                {
                    title: "Exit",
                    click: () => this.quit()
                }
            ];

            // Create a simple notification-based tray (no external dependencies)
            this.createSimpleTray();

            this.logger.info('✅ System tray created');

        } catch (error) {
            this.logger.error('❌ Failed to create system tray:', error);
            throw error;
        }
    }

    showUpdateNotification(updateInfo) {
        this.updateInfo = updateInfo;

        // Update menu to show update available
        this.updateMenu([
            {
                title: "🎉 Update Available!",
                enabled: false
            },
            {
                title: `New Version: ${updateInfo.version}`,
                enabled: false
            },
            {
                title: "----"
            },
            {
                title: "Download Update",
                click: () => this.downloadUpdate()
            },
            {
                title: "View Release Notes",
                click: () => this.showReleaseNotes()
            },
            {
                title: "----"
            },
            {
                title: "Settings",
                click: () => this.showSettings()
            },
            {
                title: "Exit",
                click: () => this.quit()
            }
        ]);

        // Show system notification
        this.showNotification(
            'Update Available',
            `Device Protector ${updateInfo.version} is available for download.`
        );
    }

    showUpdateReadyNotification(updateInfo) {
        // Update menu to show install option
        this.updateMenu([
            {
                title: "✅ Update Ready!",
                enabled: false
            },
            {
                title: `Version: ${updateInfo.version}`,
                enabled: false
            },
            {
                title: "----"
            },
            {
                title: "Install & Restart",
                click: () => this.installUpdate()
            },
            {
                title: "Install Later",
                click: () => this.resetMenu()
            },
            {
                title: "----"
            },
            {
                title: "Settings",
                click: () => this.showSettings()
            },
            {
                title: "Exit",
                click: () => this.quit()
            }
        ]);

        // Show system notification
        this.showNotification(
            'Update Ready',
            `Device Protector ${updateInfo.version} is ready to install.`
        );
    }

    updateDownloadProgress(progress) {
        if (progress % 10 === 0) { // Update every 10%
            this.showNotification(
                'Downloading Update',
                `Download progress: ${progress}%`
            );
        }
    }

    async checkForUpdates() {
        try {
            this.showNotification('Checking Updates', 'Checking for updates...');

            if (this.updater) {
                const updateInfo = await this.updater.checkForUpdates(true);

                if (!updateInfo) {
                    this.showNotification('No Updates', 'You are running the latest version.');
                }
            }
        } catch (error) {
            this.logger.error('❌ Error checking for updates:', error);
            this.showNotification('Update Error', 'Failed to check for updates.');
        }
    }

    async downloadUpdate() {
        try {
            if (this.updater && this.updateInfo) {
                this.showNotification('Downloading', 'Downloading update...');
                await this.updater.downloadUpdate(this.updateInfo);
            }
        } catch (error) {
            this.logger.error('❌ Error downloading update:', error);
            this.showNotification('Download Error', 'Failed to download update.');
        }
    }

    async installUpdate() {
        try {
            if (this.updater) {
                this.showNotification('Installing', 'Installing update and restarting...');
                await this.updater.quitAndInstall();
            }
        } catch (error) {
            this.logger.error('❌ Error installing update:', error);
            this.showNotification('Install Error', 'Failed to install update.');
        }
    }

    createSimpleTray() {
        // Simple PowerShell-based tray implementation
        console.log('Creating simplified system tray...');
        this.tray = { isActive: true }; // Mock tray object
    }

    showReleaseNotes() {
        if (this.updateInfo && this.updateInfo.releaseNotes) {
            // Open release notes using PowerShell
            const url = `https://github.com/sneh-creation/device-protector/releases/tag/v${this.updateInfo.version}`;
            spawn('powershell.exe', ['-Command', `Start-Process "${url}"`], { detached: true, stdio: 'ignore' });
        }
    }

    updateMenu(newItems) {
        if (this.tray) {
            this.tray.menu = newItems;
        }
    }

    resetMenu() {
        this.create(); // Recreate original menu
    }

    showNotification(title, message) {
        // Use system notifications
        if (typeof window !== 'undefined' && window.Notification) {
            new window.Notification(title, {
                body: message,
                icon: path.join(__dirname, '../assets/icon.png')
            });
        }
    }

    showSettings() {
        // Implementation for settings dialog
        this.protector.showSettings();
    }

    quit() {
        this.protector.quit();
    }

    destroy() {
        if (this.tray) {
            this.tray.kill();
            this.tray = null;
        }
    }
}