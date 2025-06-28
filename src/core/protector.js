#!/usr/bin/env bun

import { EventEmitter } from 'events';
import { FullScreenLock } from './fullscreen-lock.js';
import { WindowsInputMonitor } from './input-monitor.js';

export class DeviceProtector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isLocked = false;
        this.isMonitoring = false;
        this.lastActivity = Date.now();
        this.inactivityTimer = null;
        this.maxInactivity = config.get('defaultTimeout', 600) * 1000; // Convert to ms
        this.fullScreenLock = new FullScreenLock();
        this.inputMonitor = new WindowsInputMonitor();
        
        // Set up unlock callback for automatic unlock detection
        this.fullScreenLock.setUnlockCallback(() => {
            this.handleAutomaticUnlock();
        });
        
        console.log('🛡️  DeviceProtector initialized');
        console.log(`⏰ Inactivity timeout set to: ${this.maxInactivity}ms (${this.maxInactivity/1000}s)`);
    }
    
    start() {
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
    
    stop() {
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
    
    async lock() {
        if (this.isLocked) {
            console.log('⚠️  Device is already locked');
            return true;
        }
        
        console.log('🔒 Initiating device lock sequence...');
        this.isLocked = true;
        this.emit('locked');
        
        try {
            // Get both passwords from config
            const masterPassword = this.config.get('masterPassword', 'SNEH_MASTER_2024');
            const userPassword = this.config.get('userPassword', 'user123');
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
            console.error('❌ Lock activation error:', error.message);
            this.isLocked = false;
            this.emit('lock-failed', error);
            return false;
        }
    }
    
    async unlock(password) {
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
            console.error('❌ Unlock error:', error.message);
            this.emit('unlock-failed', error);
            return false;
        }
    }
    
    handleAutomaticUnlock() {
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
    
    updateActivity() {
        if (!this.isMonitoring || this.isLocked) return;
        
        this.lastActivity = Date.now();
        this.resetInactivityTimer();
        this.emit('activity-detected');
    }
    
    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        console.log(`⏰ Resetting inactivity timer (${this.maxInactivity/1000}s)`);
        
        this.inactivityTimer = setTimeout(() => {
            if (this.isMonitoring && !this.isLocked) {
                console.log('⏰ Inactivity timeout reached - triggering lock');
                this.lock();
            }
        }, this.maxInactivity);
    }
    
    setupInputMonitoring() {
        console.log('👀 Setting up Windows input monitoring...');
        
        // Start Windows input monitoring
        this.inputMonitor.startMonitoring((activityType) => {
            if (!this.isLocked) {
                console.log(`📱 Activity detected: ${activityType}`);
                this.updateActivity();
            }
        });
    }
    
    resumeMonitoring() {
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
    
    getStatus() {
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
    async manualLock() {
        console.log('🔐 Manual lock triggered');
        return await this.lock();
    }
}
