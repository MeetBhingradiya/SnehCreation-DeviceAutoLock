#!/usr/bin/env bun

import { EventEmitter } from 'events';
import { FullScreenLock } from './fullscreen-lock.js';
import { WindowsInputMonitor } from './input-monitor.js';
import { SecureConfig } from '../config/secure-config.js';

export interface ProtectionStatus {
    isLocked: boolean;
    isMonitoring: boolean;
    lastActivity: string;
    inactiveFor: number;
    maxInactivity: number;
    timeUntilLock: number;
}

export class DeviceProtector extends EventEmitter {
    private config: SecureConfig;
    private isLocked: boolean = false;
    private isMonitoring: boolean = false;
    private lastActivity: number = Date.now();
    private inactivityTimer: NodeJS.Timeout | null = null;
    private maxInactivity: number;
    private fullScreenLock: FullScreenLock;
    private inputMonitor: WindowsInputMonitor;
    
    constructor(config: SecureConfig) {
        super();
        this.config = config;
        this.maxInactivity = (config.get('defaultTimeout') || 600) * 1000; // Convert to ms
        this.fullScreenLock = new FullScreenLock();
        this.inputMonitor = new WindowsInputMonitor();
        
        // Set up unlock callback for automatic unlock detection
        this.fullScreenLock.setUnlockCallback(() => {
            this.handleAutomaticUnlock();
        });
        
        console.log('🛡️  DeviceProtector initialized');
        console.log(`⏰ Inactivity timeout set to: ${this.maxInactivity}ms (${this.maxInactivity/1000}s)`);
    }
    
    start(): void {
        if (this.isMonitoring) {
            console.log('⚠️  Already monitoring');
            return;
        }
        
        this.isMonitoring = true;
        this.resetInactivityTimer();
        this.setupInputMonitoring();
        
        console.log('🚀 Device protection started');
        this.emit('started');
    }
    
    stop(): void {
        this.isMonitoring = false;
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        
        // Stop input monitoring
        this.inputMonitor.stopMonitoring();
        
        console.log('🛑 Device protection stopped');
        this.emit('stopped');
    }
    
    pause(): void {
        if (!this.isMonitoring) {
            console.log('⚠️  Protection not running, cannot pause');
            return;
        }
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        
        // Stop input monitoring but keep monitoring flag true (just paused)
        this.inputMonitor.stopMonitoring();
        
        console.log('⏸️ Device protection paused');
        this.emit('paused');
    }
    
    resume(): void {
        if (!this.isMonitoring) {
            console.log('⚠️  Protection not running, cannot resume');
            return;
        }
        
        // Resume input monitoring and reset timer
        this.resetInactivityTimer();
        this.setupInputMonitoring();
        
        console.log('▶️ Device protection resumed');
        this.emit('resumed');
    }
    
    async lock(): Promise<boolean> {
        if (this.isLocked) {
            console.log('⚠️  Device is already locked');
            return true;
        }
        
        console.log('🔒 Initiating device lock sequence...');
        this.isLocked = true;
        this.emit('locked');
        
        try {
            // Get both passwords from config
            const masterPassword = this.config.get('masterPassword') || 'SNEH_MASTER_2024';
            const userPassword = this.config.get('userPassword') || 'user123';
            console.log('🔐 Using user password (primary) and master password (override) for lock screen authentication');
            
            // Activate Windows lock screen with timeout and validation
            console.log('🚀 Launching enterprise lock screen...');
            const success = await this.fullScreenLock.lock(masterPassword, userPassword);
            
            if (!success) {
                console.error('❌ Failed to activate Windows lock screen');
                this.isLocked = false;
                this.emit('lock-failed');
                return false;
            }
            
            // Stop input monitoring while locked (no need to monitor when locked)
            this.inputMonitor.stopMonitoring();
            
            console.log('✅ Device successfully locked with enterprise lock screen');
            return true;
            
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Lock activation error:', message);
            this.isLocked = false;
            this.emit('lock-failed', error);
            return false;
        }
    }
    
    async unlock(password: string): Promise<boolean> {
        if (!this.isLocked) {
            console.log('⚠️  Device is not locked');
            return true;
        }
        
        // Use combined password validation (user password primary, master as override)
        if (!this.config.validatePassword(password)) {
            console.log('❌ Invalid unlock attempt - incorrect password');
            this.emit('unlock-failed');
            return false;
        }
        
        try {
            const isUserPassword = this.config.validateUserPassword(password);
            const passwordType = isUserPassword ? 'user' : 'master (override)';
            console.log(`🔓 Valid ${passwordType} password - deactivating lock screen...`);
            
            // Deactivate full-screen lock first
            const success = await this.fullScreenLock.unlock();
            if (!success) {
                console.error('❌ Failed to deactivate full-screen lock');
                return false;
            }
            
            // Reset state and resume monitoring
            this.isLocked = false;
            this.lastActivity = Date.now();
            
            console.log('🔄 Resuming device protection after unlock...');
            
            // Always restart input monitoring after unlock
            this.resumeMonitoring();
            
            console.log('✅ Device successfully unlocked - protection resumed');
            this.emit('unlocked');
            return true;
            
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Unlock error:', message);
            this.emit('unlock-failed', error);
            return false;
        }
    }
    
    private handleAutomaticUnlock(): void {
        console.log('🔓 Automatic unlock detected - password was entered in lock screen');
        
        if (this.isLocked) {
            this.isLocked = false;
            this.lastActivity = Date.now();
            
            console.log('🔄 Resuming protection after automatic unlock...');
            this.resumeMonitoring();
            
            console.log('✅ Device automatically unlocked - protection resumed');
            this.emit('unlocked');
        }
    }
    
    updateActivity(): void {
        if (!this.isMonitoring || this.isLocked) return;
        
        this.lastActivity = Date.now();
        this.resetInactivityTimer();
        this.emit('activity-detected');
    }
    
    private resetInactivityTimer(): void {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Update timeout from config in case it changed
        this.maxInactivity = (this.config.get('defaultTimeout') || 600) * 1000;
        console.log(`⏰ Resetting inactivity timer (${this.maxInactivity/1000}s)`);
        
        this.inactivityTimer = setTimeout(() => {
            if (this.isMonitoring && !this.isLocked) {
                console.log('⏰ Inactivity timeout reached - triggering lock');
                this.lock();
            }
        }, this.maxInactivity);
    }
    
    private setupInputMonitoring(): void {
        console.log('👀 Setting up Windows input monitoring...');
        
        // Start Windows input monitoring
        this.inputMonitor.startMonitoring((activityType: string) => {
            if (!this.isLocked) {
                console.log(`📱 Activity detected: ${activityType}`);
                this.updateActivity();
            }
        });
    }
    
    private resumeMonitoring(): void {
        console.log('🔄 Resuming input monitoring and inactivity detection...');
        
        // Reset inactivity timer
        this.resetInactivityTimer();
        
        // Stop any existing monitoring first
        if (this.inputMonitor && this.inputMonitor.isActive()) {
            console.log('🛑 Stopping existing input monitor...');
            this.inputMonitor.stopMonitoring();
        }
        
        // Wait a moment then restart monitoring
        setTimeout(() => {
            console.log('🚀 Restarting input monitoring...');
            this.setupInputMonitoring();
        }, 1000);
    }
    
    getStatus(): ProtectionStatus {
        return {
            isLocked: this.isLocked,
            isMonitoring: this.isMonitoring,
            lastActivity: new Date(this.lastActivity).toISOString(),
            inactiveFor: Date.now() - this.lastActivity,
            maxInactivity: this.maxInactivity,
            timeUntilLock: this.maxInactivity - (Date.now() - this.lastActivity)
        };
    }
    
    // Manual lock for testing
    async manualLock(): Promise<boolean> {
        console.log('🔐 Manual lock triggered');
        return await this.lock();
    }

    // Update timeout from settings
    updateTimeout(seconds: number): void {
        if (seconds < 60) {
            throw new Error('Timeout must be at least 60 seconds');
        }
        
        this.config.set('defaultTimeout', seconds);
        this.maxInactivity = seconds * 1000;
        
        // Reset timer with new timeout
        if (this.isMonitoring && !this.isLocked) {
            this.resetInactivityTimer();
        }
        
        console.log(`⏰ Timeout updated to ${seconds} seconds`);
    }

    // Get current lock state
    getIsLocked(): boolean {
        return this.isLocked;
    }

    // Get current monitoring state
    getIsMonitoring(): boolean {
        return this.isMonitoring;
    }

    // Force update activity (for manual activity detection)
    forceActivity(): void {
        this.updateActivity();
    }

    isPaused(): boolean {
        return this.isMonitoring && this.inactivityTimer === null;
    }
}
