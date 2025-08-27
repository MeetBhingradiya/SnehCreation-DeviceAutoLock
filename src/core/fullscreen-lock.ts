#!/usr/bin/env bun

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

export class FullScreenLock {
    private lockProcess: ChildProcess | null = null;
    private isLocked: boolean = false;
    private lockScriptPath: string;
    private onUnlockCallback: (() => void) | null = null;

    constructor() {
        this.lockScriptPath = join(process.cwd(), 'lock-screen.ps1');
    }
    
    setUnlockCallback(callback: () => void): void {
        this.onUnlockCallback = callback;
    }

    async lock(masterPassword: string = 'SNEH_MASTER_2024', userPassword: string = 'user123'): Promise<boolean> {
        if (this.isLocked) {
            console.log('⚠️  Already locked');
            return true;
        }

        console.log('🔒 Activating enterprise lock screen...');
        this.isLocked = true;

        try {
            // Start PowerShell lock screen with both passwords
            this.lockProcess = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-WindowStyle', 'Hidden',
                '-File', this.lockScriptPath,
                '-Action', 'lock',
                '-MasterPassword', masterPassword,
                '-UserPassword', userPassword
            ], {
                detached: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Wait for lock screen to initialize
            let lockScreenReady = false;
            let lockError: Error | null = null;

            // Listen for process events
            this.lockProcess.on('close', (code: number | null) => {
                console.log(`🔓 Lock screen process closed with code ${code}`);
                this.isLocked = false;
                this.lockProcess = null;
                
                // Notify the protector that unlock happened
                if (this.onUnlockCallback && code === 0) {
                    console.log('📞 Notifying protector of automatic unlock...');
                    this.onUnlockCallback();
                }
            });

            this.lockProcess.on('error', (error: Error) => {
                console.error('❌ Lock screen process error:', error);
                this.isLocked = false;
                this.lockProcess = null;
                lockError = error;
            });

            // Log output for debugging and detect when ready
            this.lockProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                console.log('Lock screen:', output);
                
                if (output.includes('Enterprise lock screen activated') || 
                    output.includes('waiting for authentication')) {
                    lockScreenReady = true;
                }
            });

            this.lockProcess.stderr?.on('data', (data: Buffer) => {
                const error = data.toString().trim();
                console.error('Lock screen error:', error);
                lockError = new Error(error);
            });

            // Wait up to 5 seconds for lock screen to be ready
            const startTime = Date.now();
            while (!lockScreenReady && !lockError && (Date.now() - startTime) < 5000) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (lockError) {
                throw lockError;
            }

            if (!lockScreenReady) {
                throw new Error('Lock screen failed to initialize within 5 seconds');
            }

            console.log('🛡️  Enterprise lock screen activated and ready');
            return true;
        } catch (error) {
            console.error('❌ Failed to activate lock:', error);
            this.isLocked = false;
            return false;
        }
    }

    async unlock(): Promise<boolean> {
        if (!this.isLocked) {
            console.log('⚠️  Not locked');
            return true;
        }

        console.log('🔓 Deactivating lock screen...');

        try {
            // Kill lock process
            if (this.lockProcess) {
                this.lockProcess.kill('SIGTERM');
                this.lockProcess = null;
            }

            // Run unlock script to restore taskbar
            spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-WindowStyle', 'Hidden',
                '-File', this.lockScriptPath,
                '-Action', 'unlock'
            ], {
                detached: true,
                stdio: 'ignore'
            });

            this.isLocked = false;
            console.log('✅ Lock screen deactivated');
            return true;
        } catch (error) {
            console.error('❌ Failed to deactivate lock:', error);
            return false;
        }
    }

    isDeviceLocked(): boolean {
        return this.isLocked;
    }
}
