// Settings UI TypeScript for Device Protector

// Type declarations for Electron API
interface ElectronAPI {
    ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, callback: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
    };
    minimize: () => void;
    close: () => void;
}

// Access the Electron API
const electronAPI = (window as any).electronAPI as ElectronAPI;

interface DeviceConfig {
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

interface ProtectionStatus {
    isLocked: boolean;
    isMonitoring: boolean;
    lastActivity: string;
    inactiveFor: number;
    maxInactivity: number;
    timeUntilLock: number;
}

class SettingsUI {
    private currentConfig: DeviceConfig = {} as DeviceConfig;
    private currentStatus: ProtectionStatus = {} as ProtectionStatus;
    private searchIndex: { [key: string]: string[] } = {};

    constructor() {
        this.init();
    }

    async init(): Promise<void> {
        console.log('🚀 Settings UI initializing...');
        console.log('📊 Available sections:', document.querySelectorAll('.settings-section').length);
        console.log('🧭 Available nav sections:', document.querySelectorAll('.nav-section').length);
        
        await this.loadConfig();
        await this.loadStatus();
        await this.checkStartupStatus();
        this.setupEventListeners();
        
        console.log('✅ Settings UI initialized');
    }

    async checkStartupStatus(): Promise<void> {
        try {
            const startupInfo = await electronAPI.ipcRenderer.invoke('get-startup-status');
            this.updateStartupWarning(!startupInfo.enabled);
            
            // Update the startup toggle
            const startupToggle = document.getElementById('startWithWindows') as HTMLInputElement;
            if (startupToggle) {
                startupToggle.checked = startupInfo.enabled;
            }
        } catch (error) {
            console.error('❌ Failed to check startup status:', error);
        }
    }

    updateStartupWarning(shouldShow: boolean): void {
        const warningElement = document.getElementById('startupWarning');
        if (warningElement) {
            warningElement.style.display = shouldShow ? 'flex' : 'none';
        }
    }

    async handleStartupToggle(enabled: boolean): Promise<void> {
        try {
            const result = await electronAPI.ipcRenderer.invoke('set-startup-status', enabled);
            if (result.success) {
                this.updateStartupWarning(!enabled);
                console.log(enabled ? '✅ Startup enabled' : '❌ Startup disabled');
            } else {
                console.error('❌ Failed to update startup setting');
            }
        } catch (error) {
            console.error('❌ Failed to update startup status:', error);
        }
    }

    setupEventListeners(): void {
        console.log('🎧 Setting up event listeners...');
        
        // Navigation
        const navSections = document.querySelectorAll('.nav-section');
        console.log('🧭 Found nav sections:', navSections.length);
        
        navSections.forEach((section, index) => {
            console.log(`📍 Nav section ${index}:`, (section as HTMLElement).dataset.section);
            section.addEventListener('click', () => {
                const sectionData = (section as HTMLElement).dataset.section;
                console.log('🔄 Switching to section:', sectionData);
                if (sectionData) {
                    this.switchSection(sectionData);
                }
            });
        });

        // Search
        const searchInput = document.getElementById('settingsSearch') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch((e.target as HTMLInputElement).value);
            });
        }

        // Config file import
        const configFileInput = document.getElementById('configFile') as HTMLInputElement;
        if (configFileInput) {
            configFileInput.addEventListener('change', (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files[0]) {
                    this.importConfig(files[0]);
                }
            });
        }

        // Startup warning enable button
        const enableStartupBtn = document.getElementById('enableStartupBtn');
        if (enableStartupBtn) {
            enableStartupBtn.addEventListener('click', () => {
                this.handleStartupToggle(true);
            });
        }

        // Startup toggle in settings
        const startupToggle = document.getElementById('startWithWindows') as HTMLInputElement;
        if (startupToggle) {
            startupToggle.addEventListener('change', () => {
                this.handleStartupToggle(startupToggle.checked);
            });
        }

        // Form changes
        this.setupFormListeners();
    }

    setupFormListeners(): void {
        // Auto-save on input changes
        const inputs = document.querySelectorAll('input, select') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveConfig();
            });
        });

        // Test buttons
        const testLockBtn = document.getElementById('testLockBtn');
        if (testLockBtn) {
            testLockBtn.addEventListener('click', () => this.testLock());
        }

        const testEmailBtn = document.getElementById('testEmailBtn');
        if (testEmailBtn) {
            testEmailBtn.addEventListener('click', () => this.testEmail());
        }

        const generatePinBtn = document.getElementById('generatePinBtn');
        if (generatePinBtn) {
            generatePinBtn.addEventListener('click', () => this.generateNewPin());
        }

        const exportConfigBtn = document.getElementById('exportConfigBtn');
        if (exportConfigBtn) {
            exportConfigBtn.addEventListener('click', () => this.exportConfig());
        }

        const importConfigBtn = document.getElementById('importConfigBtn');
        if (importConfigBtn) {
            importConfigBtn.addEventListener('click', () => {
                const input = document.getElementById('configFile') as HTMLInputElement;
                input?.click();
            });
        }
    }

    buildSearchIndex(): void {
        this.searchIndex = {
            'security': ['password', 'pin', 'authentication', 'master', 'user', 'email', 'otp', 'recovery'],
            'protection': ['timeout', 'lock', 'monitoring', 'inactivity', 'auto-lock', 'attempts'],
            'notifications': ['email', 'alerts', 'system', 'tray', 'sound'],
            'appearance': ['theme', 'dark', 'light', 'language', 'english', 'gujarati'],
            'advanced': ['port', 'server', 'update', 'auto-update', 'backup', 'export', 'import']
        };
    }

    async loadConfig(): Promise<void> {
        try {
            this.currentConfig = await electronAPI.ipcRenderer.invoke('get-config');
            this.populateConfigForm();
        } catch (error) {
            console.error('Failed to load config:', error);
            this.showError('Failed to load configuration');
        }
    }

    async loadStatus(): Promise<void> {
        try {
            this.currentStatus = await electronAPI.ipcRenderer.invoke('get-status');
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    populateConfigForm(): void {
        // Security section
        this.setInputValue('masterPassword', this.currentConfig.masterPassword);
        this.setInputValue('userPassword', this.currentConfig.userPassword);
        this.setInputValue('recoveryEmail', this.currentConfig.recoveryEmail || '');
        this.setInputValue('senderEmail', this.currentConfig.senderEmail || '');
        this.setInputValue('senderPassword', this.currentConfig.senderPassword || '');

        // Protection section
        this.setInputValue('defaultTimeout', this.currentConfig.defaultTimeout.toString());
        this.setInputValue('maxAttempts', this.currentConfig.maxAttempts.toString());

        // Notifications section
        this.setCheckboxValue('enableNotifications', this.currentConfig.enableNotifications);
        this.setCheckboxValue('enableTray', this.currentConfig.enableTray);

        // Appearance section
        this.setSelectValue('theme', this.currentConfig.theme);
        this.setSelectValue('language', this.currentConfig.language);

        // Advanced section
        this.setInputValue('port', this.currentConfig.port.toString());
        this.setInputValue('updateServer', this.currentConfig.updateServer);
        this.setSelectValue('updateInterval', this.currentConfig.updateInterval.toString());
        this.setCheckboxValue('autoUpdate', this.currentConfig.autoUpdate);
        this.setCheckboxValue('autoInstallUpdates', this.currentConfig.autoInstallUpdates);
    }

    setInputValue(id: string, value: string): void {
        const element = document.getElementById(id) as HTMLInputElement;
        if (element) {
            element.value = value;
        }
    }

    setCheckboxValue(id: string, value: boolean): void {
        const element = document.getElementById(id) as HTMLInputElement;
        if (element) {
            element.checked = value;
        }
    }

    setSelectValue(id: string, value: string): void {
        const element = document.getElementById(id) as HTMLSelectElement;
        if (element) {
            element.value = value;
        }
    }

    async saveConfig(): Promise<void> {
        try {
            const updates: Partial<DeviceConfig> = {};

            // Security section
            const masterPassword = this.getInputValue('masterPassword');
            const userPassword = this.getInputValue('userPassword');
            const recoveryEmail = this.getInputValue('recoveryEmail');
            const senderEmail = this.getInputValue('senderEmail');
            const senderPassword = this.getInputValue('senderPassword');

            if (masterPassword) updates.masterPassword = masterPassword;
            if (userPassword) updates.userPassword = userPassword;
            if (recoveryEmail) updates.recoveryEmail = recoveryEmail;
            if (senderEmail) updates.senderEmail = senderEmail;
            if (senderPassword) updates.senderPassword = senderPassword;

            // Protection section
            const timeoutStr = this.getInputValue('defaultTimeout');
            const attemptsStr = this.getInputValue('maxAttempts');
            
            if (timeoutStr) updates.defaultTimeout = parseInt(timeoutStr);
            if (attemptsStr) updates.maxAttempts = parseInt(attemptsStr);

            // Notifications section
            updates.enableNotifications = this.getCheckboxValue('enableNotifications');
            updates.enableTray = this.getCheckboxValue('enableTray');

            // Appearance section
            const theme = this.getSelectValue('theme');
            const language = this.getSelectValue('language');
            
            if (theme) updates.theme = theme as 'dark' | 'light';
            if (language) updates.language = language as 'en' | 'gujarati';

            // Advanced section
            const portStr = this.getInputValue('port');
            const updateServer = this.getInputValue('updateServer');
            const updateIntervalStr = this.getInputValue('updateInterval');
            
            if (portStr) updates.port = parseInt(portStr);
            if (updateServer) updates.updateServer = updateServer;
            if (updateIntervalStr) updates.updateInterval = parseInt(updateIntervalStr);
            
            updates.autoUpdate = this.getCheckboxValue('autoUpdate');
            updates.autoInstallUpdates = this.getCheckboxValue('autoInstallUpdates');

            const result = await electronAPI.ipcRenderer.invoke('update-config', updates);
            
            if (result.success) {
                this.showSuccess('Settings saved successfully');
                await this.loadConfig(); // Reload to get updated values
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            this.showError('Failed to save settings: ' + (error as Error).message);
        }
    }

    getInputValue(id: string): string {
        const element = document.getElementById(id) as HTMLInputElement;
        return element ? element.value : '';
    }

    getCheckboxValue(id: string): boolean {
        const element = document.getElementById(id) as HTMLInputElement;
        return element ? element.checked : false;
    }

    getSelectValue(id: string): string {
        const element = document.getElementById(id) as HTMLSelectElement;
        return element ? element.value : '';
    }

    updateStatusDisplay(): void {
        const statusElement = document.getElementById('protectionStatus');
        const lockElement = document.getElementById('lockStatus');
        const activityElement = document.getElementById('lastActivity');
        const timeoutElement = document.getElementById('timeUntilLock');

        if (statusElement) {
            statusElement.textContent = this.currentStatus.isMonitoring ? 'Active' : 'Inactive';
            statusElement.className = this.currentStatus.isMonitoring ? 'status-active' : 'status-inactive';
        }

        if (lockElement) {
            lockElement.textContent = this.currentStatus.isLocked ? 'Locked' : 'Unlocked';
            lockElement.className = this.currentStatus.isLocked ? 'status-locked' : 'status-unlocked';
        }

        if (activityElement) {
            const lastActivity = new Date(this.currentStatus.lastActivity);
            activityElement.textContent = lastActivity.toLocaleString();
        }

        if (timeoutElement && !this.currentStatus.isLocked) {
            const secondsLeft = Math.max(0, Math.floor(this.currentStatus.timeUntilLock / 1000));
            const minutes = Math.floor(secondsLeft / 60);
            const seconds = secondsLeft % 60;
            timeoutElement.textContent = `${minutes}m ${seconds}s`;
        }
    }

    startStatusUpdates(): void {
        setInterval(async () => {
            await this.loadStatus();
        }, 1000); // Update every second
    }

    switchSection(sectionName: string): void {
        console.log('🔄 Switching to section:', sectionName);
        
        // Update navigation
        document.querySelectorAll('.nav-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeNavSection = document.querySelector(`[data-section="${sectionName}"]`);
        console.log('🎯 Found nav section:', !!activeNavSection);
        if (activeNavSection) {
            activeNavSection.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });

        const contentSection = document.getElementById(sectionName);
        console.log('📄 Found content section:', !!contentSection, sectionName);
        if (contentSection) {
            contentSection.classList.add('active');
            console.log('✅ Section switched to:', sectionName);
        } else {
            console.error('❌ Content section not found:', sectionName);
        }
    }

    handleSearch(query: string): void {
        if (!query.trim()) {
            // Show all sections
            document.querySelectorAll('.settings-section').forEach(section => {
                (section as HTMLElement).style.display = 'block';
            });
            return;
        }

        const lowerQuery = query.toLowerCase();
        let matchingSections: string[] = [];

        // Search in index
        Object.entries(this.searchIndex).forEach(([section, keywords]) => {
            if (keywords.some(keyword => keyword.includes(lowerQuery))) {
                matchingSections.push(section);
            }
        });

        // Show/hide sections based on search
        Object.keys(this.searchIndex).forEach(section => {
            const sectionElement = document.getElementById(`${section}Section`);
            if (sectionElement) {
                (sectionElement as HTMLElement).style.display = 
                    matchingSections.includes(section) ? 'block' : 'none';
            }
        });
    }

    async testLock(): Promise<void> {
        try {
            const result = await electronAPI.ipcRenderer.invoke('test-lock');
            if (result.success) {
                this.showSuccess('Lock test completed successfully');
            } else {
                throw new Error(result.error || 'Lock test failed');
            }
        } catch (error) {
            this.showError('Lock test failed: ' + (error as Error).message);
        }
    }

    async testEmail(): Promise<void> {
        try {
            const email = this.getInputValue('recoveryEmail');
            if (!email) {
                throw new Error('Please enter a recovery email address first');
            }

            const result = await electronAPI.ipcRenderer.invoke('test-email', email);
            if (result.success) {
                this.showSuccess('Test email sent successfully');
            } else {
                throw new Error(result.error || 'Email test failed');
            }
        } catch (error) {
            this.showError('Email test failed: ' + (error as Error).message);
        }
    }

    async generateNewPin(): Promise<void> {
        try {
            const pin = await electronAPI.ipcRenderer.invoke('generate-pin');
            this.showSuccess(`New PIN generated: ${pin}. Please save this PIN securely!`);
        } catch (error) {
            this.showError('Failed to generate PIN: ' + (error as Error).message);
        }
    }

    async exportConfig(): Promise<void> {
        try {
            const config = await electronAPI.ipcRenderer.invoke('export-config');
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `device-protector-config-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('Configuration exported successfully');
        } catch (error) {
            this.showError('Failed to export configuration: ' + (error as Error).message);
        }
    }

    async importConfig(file: File): Promise<void> {
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            const result = await electronAPI.ipcRenderer.invoke('import-config', config.config || config);
            
            if (result.success) {
                this.showSuccess('Configuration imported successfully');
                await this.loadConfig(); // Reload to show imported values
            } else {
                throw new Error(result.error || 'Import failed');
            }
        } catch (error) {
            this.showError('Failed to import configuration: ' + (error as Error).message);
        }
    }

    // Auto-update functions
    async checkForUpdates(): Promise<void> {
        const btn = document.getElementById('checkUpdatesBtn') as HTMLButtonElement;
        const btnText = btn.querySelector('.btn-text') as HTMLElement;
        const btnSpinner = btn.querySelector('.btn-spinner') as HTMLElement;
        const statusDiv = document.getElementById('updateStatus') as HTMLElement;
        
        // Show loading state
        btn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';
        statusDiv.textContent = 'Checking for updates...';
        statusDiv.className = 'update-status checking';

        try {
            const updateInfo = await electronAPI.ipcRenderer.invoke('check-for-updates');
            
            if (updateInfo) {
                // Update available
                document.getElementById('updateAvailable')!.style.display = 'flex';
                document.getElementById('updateVersionInfo')!.textContent = 
                    `Version ${updateInfo.version} is available`;
                statusDiv.textContent = `Update available: ${updateInfo.version}`;
                statusDiv.className = 'update-status available';
            } else {
                // No update available
                statusDiv.textContent = 'You have the latest version';
                statusDiv.className = 'update-status current';
                document.getElementById('updateAvailable')!.style.display = 'none';
            }
        } catch (error) {
            statusDiv.textContent = 'Failed to check for updates';
            statusDiv.className = 'update-status error';
            console.error('Update check failed:', error);
        } finally {
            // Reset button state
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        }
    }

    async downloadUpdate(): Promise<void> {
        const btn = document.getElementById('downloadUpdateBtn') as HTMLButtonElement;
        const progressContainer = document.getElementById('downloadProgress') as HTMLElement;
        const progressFill = progressContainer.querySelector('.progress-fill') as HTMLElement;
        const progressText = progressContainer.querySelector('.progress-text') as HTMLElement;
        
        btn.disabled = true;
        btn.textContent = 'Downloading...';
        progressContainer.style.display = 'block';
        
        try {
            // Listen for download progress
            electronAPI.ipcRenderer.on('download-progress', (progress: any) => {
                const percent = Math.round(progress.percent);
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            });

            await electronAPI.ipcRenderer.invoke('download-update');
            
            // Download completed
            document.getElementById('updateAvailable')!.style.display = 'none';
            document.getElementById('updateReady')!.style.display = 'flex';
            
        } catch (error) {
            this.showError('Failed to download update: ' + (error as Error).message);
            btn.disabled = false;
            btn.textContent = 'Download Update';
            progressContainer.style.display = 'none';
        } finally {
            electronAPI.ipcRenderer.removeAllListeners('download-progress');
        }
    }

    async installUpdate(): Promise<void> {
        try {
            await electronAPI.ipcRenderer.invoke('install-update');
        } catch (error) {
            this.showError('Failed to install update: ' + (error as Error).message);
        }
    }

    showSuccess(message: string): void {
        this.showNotification(message, 'success');
    }

    showError(message: string): void {
        this.showNotification(message, 'error');
    }

    showNotification(message: string, type: 'success' | 'error' = 'success'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
let settingsUIInstance: SettingsUI;

// Make functions globally available
(window as any).checkForUpdates = () => settingsUIInstance?.checkForUpdates();
(window as any).downloadUpdate = () => settingsUIInstance?.downloadUpdate();
(window as any).installUpdate = () => settingsUIInstance?.installUpdate();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    settingsUIInstance = new SettingsUI();
});
