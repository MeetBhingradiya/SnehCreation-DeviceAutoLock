import Conf from 'conf';
import { join } from 'path';

export interface DeviceConfig {
    company: string;
    masterPassword: string;
    userPassword: string;
    settingsPin?: string;
    defaultTimeout: number;
    maxAttempts: number;
    port: number;
    updateServer: string;
    updateInterval: number;
    autoUpdate: boolean;
    autoInstallUpdates: boolean;
    enableTray: boolean;
    enableNotifications: boolean;
    theme: 'dark' | 'light';
    language: 'en' | 'gujarati';
    recoveryEmail?: string;
    senderEmail?: string;
    senderPassword?: string;
    emailConfig?: any;
}

export class Config {
    private conf: Conf<DeviceConfig>;

    constructor() {
        // Check if running in portable mode
        const isPortable = process.env.PORTABLE === 'true' || process.argv.includes('--portable');
        
        const configPath = isPortable 
            ? join(process.cwd(), 'config') // Store config next to executable in portable mode
            : join(process.env.APPDATA || process.env.HOME || '', 'SnehCreation');
            
        this.conf = new Conf<DeviceConfig>({
            projectName: 'sneh-device-protector',
            projectVersion: '1.0.1',
            projectSuffix: '',
            cwd: configPath,
            defaults: {
                company: 'Sneh Creation',
                masterPassword: 'Master@1234',
                userPassword: 'User@1234',
                defaultTimeout: 10,
                maxAttempts: 10,
                port: 3850,
                updateServer: 'https://api.github.com/repos/MeetBhingradiya/SnehCreation-DeviceAutoLock/releases',
                updateInterval: 3600000,
                autoUpdate: false,
                autoInstallUpdates: true,
                enableTray: true,
                enableNotifications: true,
                theme: 'dark',
                language: 'en'
            }
        });
        
        console.log('⚙️  Configuration loaded from:', this.conf.path);
    }
    
    get<K extends keyof DeviceConfig>(key: K): DeviceConfig[K] {
        return this.conf.get(key);
    }
    
    set<K extends keyof DeviceConfig>(key: K, value: DeviceConfig[K]): void {
        this.conf.set(key, value);
        console.log(`📝 Config updated: ${String(key)} = ${value}`);
    }
    
    has<K extends keyof DeviceConfig>(key: K): boolean {
        return this.conf.has(key);
    }
    
    delete<K extends keyof DeviceConfig>(key: K): void {
        this.conf.delete(key);
        console.log(`🗑️  Config deleted: ${String(key)}`);
    }
    
    clear(): void {
        this.conf.clear();
        console.log('🧹 Configuration cleared');
    }
    
    getAll(): DeviceConfig {
        return this.conf.store;
    }
    
    export(): { path: string; config: DeviceConfig; timestamp: string } {
        return {
            path: this.conf.path,
            config: this.getAll(),
            timestamp: new Date().toISOString()
        };
    }
    
    // Security helpers
    setMasterPassword(newPassword: string): void {
        if (!newPassword || newPassword.length < 8) {
            throw new Error('Master password must be at least 8 characters long');
        }
        this.set('masterPassword', newPassword);
    }
    
    validateMasterPassword(password: string): boolean {
        return this.get('masterPassword') === password;
    }
    
    // User password helpers (primary unlock method)
    setUserPassword(newPassword: string): void {
        if (!newPassword || newPassword.length < 4) {
            throw new Error('User password must be at least 4 characters long');
        }
        this.set('userPassword', newPassword);
    }
    
    validateUserPassword(password: string): boolean {
        return this.get('userPassword') === password;
    }
    
    getUserPassword(): string {
        return this.get('userPassword') || 'user123';
    }
    
    // Combined password validation (user password primary, master as override)
    validatePassword(password: string): boolean {
        return this.validateUserPassword(password) || this.validateMasterPassword(password);
    }
    
    // Timeout helpers
    setTimeout(seconds: number): void {
        if (seconds < 60) {
            throw new Error('Timeout must be at least 60 seconds');
        }
        this.set('defaultTimeout', seconds);
    }
    
    getTimeout(): number {
        return this.get('defaultTimeout') || 600;
    }
    
    // Update helpers
    setUpdateInterval(milliseconds: number): void {
        if (milliseconds < 300000) { // 5 minutes minimum
            throw new Error('Update interval must be at least 5 minutes');
        }
        this.set('updateInterval', milliseconds);
    }
    
    getUpdateInterval(): number {
        return this.get('updateInterval') || 3600000;
    }
}
