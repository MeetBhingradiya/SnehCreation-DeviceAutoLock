#!/usr/bin/env bun

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

export class WindowsInputMonitor {
    private isMonitoring: boolean = false;
    private monitorProcess: ChildProcess | null = null;
    private activityCallback: ((activityType: string) => void) | null = null;
    private scriptPath: string;

    constructor() {
        this.scriptPath = join(process.cwd(), 'input-monitor.ps1');
    }

    startMonitoring(callback: (activityType: string) => void): void {
        if (this.isMonitoring) {
            console.log('⚠️  Input monitoring already active');
            return;
        }

        this.activityCallback = callback;
        this.isMonitoring = true;

        console.log('👀 Starting Windows input monitoring...');

        try {
            this.monitorProcess = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-WindowStyle', 'Hidden',
                '-File', this.scriptPath
            ], {
                stdio: 'pipe'
            });

            this.monitorProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                console.log('Monitor output:', output);
                
                if (output.startsWith('ACTIVITY:')) {
                    const activityType = output.split(':')[1];
                    if (this.activityCallback) {
                        this.activityCallback(activityType);
                    }
                } else if (output.startsWith('HEARTBEAT:')) {
                    console.log('💓 Input monitor heartbeat');
                }
            });

            this.monitorProcess.stderr?.on('data', (data: Buffer) => {
                console.error('Monitor stderr:', data.toString().trim());
            });

            this.monitorProcess.on('error', (error: Error) => {
                console.error('❌ Input monitor error:', error);
                this.isMonitoring = false;
            });

            this.monitorProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                console.log(`Input monitor exited with code: ${code}, signal: ${signal}`);
                this.isMonitoring = false;
                
                // Auto-restart if it wasn't intentionally stopped
                if (code !== 0 && this.activityCallback) {
                    console.log('🔄 Restarting input monitor...');
                    setTimeout(() => {
                        if (!this.isMonitoring && this.activityCallback) {
                            this.startMonitoring(this.activityCallback);
                        }
                    }, 2000);
                }
            });

            console.log('✅ Input monitoring started');
        } catch (error) {
            console.error('❌ Failed to start input monitoring:', error);
            this.isMonitoring = false;
        }
    }

    stopMonitoring(): void {
        if (!this.isMonitoring) {
            console.log('⚠️  Input monitoring not active');
            return;
        }

        console.log('🛑 Stopping input monitoring...');

        if (this.monitorProcess) {
            this.monitorProcess.kill('SIGTERM');
            this.monitorProcess = null;
        }

        this.isMonitoring = false;
        this.activityCallback = null;
        console.log('✅ Input monitoring stopped');
    }

    isActive(): boolean {
        return this.isMonitoring;
    }
}
