#!/usr/bin/env node

import { EventEmitter } from 'events';
import { join } from 'path';
import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';
import { SecureConfig } from '../config/secure-config.js';
import { Logger } from '../utils/logger.js';

export interface UpdateInfo {
    version: string;
    releaseDate: string;
    downloadUrl: string;
    changelog: string;
    fileSize: number;
    checksum?: string;
}

export interface UpdateProgress {
    total: number;
    transferred: number;
    percent: number;
    bytesPerSecond: number;
}

export class AutoUpdater extends EventEmitter {
    private config: SecureConfig;
    private checkTimer: NodeJS.Timeout | null = null;
    private isChecking = false;
    private isDownloading = false;
    private currentVersion: string;
    private logger: Logger;

    constructor(config: SecureConfig) {
        super();
        this.config = config;
        this.currentVersion = process.env.npm_package_version || '1.0.1';
        this.logger = new Logger('AutoUpdater');
        
        // Bind event handlers
        this.on('update-available', (info: UpdateInfo) => {
            this.logger.info(`🆕 Update available: ${info.version}`);
        });
        
        this.on('update-not-available', () => {
            this.logger.info('✅ App is up to date');
        });
        
        this.on('error', (error: Error) => {
            this.logger.error('❌ Auto-updater error:', error);
        });
    }

    /**
     * Start automatic update checking
     */
    public start(): void {
        if (!this.config.get('autoUpdate') || true) {
            this.logger.info('📋 Auto-updates disabled in configuration');
            return;
        }

        const interval = this.config.get('updateInterval') || 30 * 60 * 1000; // Default 30 minutes
        this.logger.info(`🔄 Starting auto-updater with ${interval/1000/60} minute interval`);
        
        // Check immediately on start
        setTimeout(() => this.checkForUpdates(), 5000);
        
        // Set up periodic checks
        this.checkTimer = setInterval(() => {
            this.checkForUpdates();
        }, interval);
    }

    /**
     * Stop automatic update checking
     */
    public stop(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            this.logger.info('🛑 Auto-updater stopped');
        }
    }

    /**
     * Manually check for updates
     */
    public async checkForUpdates(): Promise<UpdateInfo | null> {
        if (this.isChecking) {
            this.logger.warn('⚠️  Update check already in progress');
            return null;
        }

        this.isChecking = true;
        this.emit('checking-for-update');

        try {
            const updateInfo = await this.fetchLatestVersion();
            
            if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
                this.emit('update-available', updateInfo);
                return updateInfo;
            } else {
                this.emit('update-not-available');
                return null;
            }
        } catch (error) {
            this.emit('error', error);
            return null;
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Download and install an update
     */
    public async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
        if (this.isDownloading) {
            throw new Error('Download already in progress');
        }

        this.isDownloading = true;
        this.emit('update-download-started');

        try {
            const filePath = await this.downloadFile(updateInfo);
            this.emit('update-downloaded', filePath);
            
            // Automatically install if enabled
            if (this.config.get('autoInstallUpdates') !== false) {
                await this.installUpdate(filePath);
            }
        } catch (error) {
            this.emit('error', error);
            throw error;
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Install a downloaded update
     */
    public async installUpdate(filePath: string): Promise<void> {
        this.emit('before-quit-for-update');
        
        try {
            this.logger.info(`🔄 Installing update from: ${filePath}`);
            
            // For Windows, use silent installation
            const installer = spawn(filePath, ['/S'], {
                detached: true,
                stdio: 'ignore'
            });

            installer.unref();
            
            // Give the installer a moment to start
            setTimeout(() => {
                process.exit(0);
            }, 2000);
            
        } catch (error) {
            this.logger.error('❌ Failed to install update:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Fetch latest version information from GitHub releases
     */
    private async fetchLatestVersion(): Promise<UpdateInfo> {
        const updateServer = this.config.get('updateServer') || 'https://api.github.com/repos/snehcreation/device-protector';
        this.logger.info(`🔍 Checking for updates from: ${updateServer}`);

        const response = await fetch(`${updateServer}/latest`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch update info: ${response.status}`);
        }

        const release = await response.json();
        
        // Find the appropriate asset for Windows
        const asset = release.assets.find((asset: any) => 
            asset.name.includes('Setup.exe') || asset.name.includes('-win-')
        );

        if (!asset) {
            throw new Error('No compatible update found for this platform');
        }

        return {
            version: release.tag_name.replace(/^v/, ''),
            releaseDate: release.published_at,
            downloadUrl: asset.browser_download_url,
            changelog: release.body || 'No changelog available',
            fileSize: asset.size,
            checksum: asset.checksum
        };
    }

    /**
     * Download update file with progress tracking
     */
    private async downloadFile(updateInfo: UpdateInfo): Promise<string> {
        const fileName = `update-${updateInfo.version}.exe`;
        const filePath = join(process.cwd(), 'temp', fileName);
        
        // Create temp directory if it doesn't exist
        const tempDir = join(process.cwd(), 'temp');
        if (!existsSync(tempDir)) {
            require('fs').mkdirSync(tempDir, { recursive: true });
        }

        const response = await fetch(updateInfo.downloadUrl);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const total = parseInt(response.headers.get('content-length') || '0');
        let transferred = 0;
        
        const fileStream = createWriteStream(filePath);
        const reader = response.body?.getReader();
        
        if (!reader) {
            throw new Error('Failed to get response reader');
        }

        const startTime = Date.now();

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            fileStream.write(value);
            transferred += value.length;
            
            const elapsed = Date.now() - startTime;
            const bytesPerSecond = transferred / (elapsed / 1000);
            const percent = (transferred / total) * 100;
            
            this.emit('download-progress', {
                total,
                transferred,
                percent,
                bytesPerSecond
            } as UpdateProgress);
        }

        fileStream.end();
        
        return new Promise((resolve, reject) => {
            fileStream.on('finish', () => resolve(filePath));
            fileStream.on('error', reject);
        });
    }

    /**
     * Compare version strings
     */
    private isNewerVersion(newVersion: string, currentVersion: string): boolean {
        const parseVersion = (version: string) => {
            return version.split('.').map(num => parseInt(num, 10));
        };

        const newVer = parseVersion(newVersion);
        const currVer = parseVersion(currentVersion);

        for (let i = 0; i < Math.max(newVer.length, currVer.length); i++) {
            const newNum = newVer[i] || 0;
            const currNum = currVer[i] || 0;

            if (newNum > currNum) return true;
            if (newNum < currNum) return false;
        }

        return false;
    }

    /**
     * Get current app version
     */
    public getCurrentVersion(): string {
        return this.currentVersion;
    }

    /**
     * Check if auto-updates are enabled
     */
    public isEnabled(): boolean {
        return this.config.get('autoUpdate') === true;
    }

    /**
     * Enable or disable auto-updates
     */
    public setEnabled(enabled: boolean): void {
        this.config.set('autoUpdate', enabled);
        
        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Clean up downloaded update files
     */
    public cleanupTempFiles(): void {
        try {
            const tempDir = join(process.cwd(), 'temp');
            if (existsSync(tempDir)) {
                const fs = require('fs');
                const files = fs.readdirSync(tempDir);
                
                files.forEach((file: string) => {
                    if (file.startsWith('update-') && file.endsWith('.exe')) {
                        const filePath = join(tempDir, file);
                        try {
                            unlinkSync(filePath);
                            this.logger.info(`🗑️ Cleaned up: ${file}`);
                        } catch (error) {
                            this.logger.warn(`⚠️ Could not delete: ${file}`);
                        }
                    }
                });
            }
        } catch (error) {
            this.logger.warn('⚠️ Error cleaning up temp files:', error);
        }
    }
}
