#!/usr/bin/env bun

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

export class WindowsInputMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitorProcess = null;
        this.activityCallback = null;
        this.scriptPath = join(process.cwd(), 'input-monitor.ps1');
        this.createMonitorScript();
    }

    createMonitorScript() {
        const script = `
# Advanced Windows Input Monitor with Win32 API
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class Win32InputMonitor {
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
    
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
    
    [DllImport("user32.dll")]
    public static extern uint GetLastInputInfo(ref LASTINPUTINFO plii);
    
    [DllImport("kernel32.dll")]
    public static extern uint GetTickCount();
    
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }
    
    public static uint GetLastInputTime() {
        LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();
        lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
        GetLastInputInfo(ref lastInputInfo);
        return GetTickCount() - lastInputInfo.dwTime;
    }
}
"@ -ReferencedAssemblies System.Runtime.InteropServices

Write-Host "Starting advanced input monitoring..."

$lastX = -1
$lastY = -1
$lastInputTime = 0
$heartbeatCounter = 0

while ($true) {
    try {
        # Check mouse position
        $mousePos = New-Object Win32InputMonitor+POINT
        [Win32InputMonitor]::GetCursorPos([ref]$mousePos)
        
        if ($mousePos.X -ne $lastX -or $mousePos.Y -ne $lastY) {
            if ($lastX -ne -1) {
                Write-Host "ACTIVITY:MOUSE"
            }
            $lastX = $mousePos.X
            $lastY = $mousePos.Y
        }
        
        # Check for any input using GetLastInputInfo (more reliable)
        $idleTime = [Win32InputMonitor]::GetLastInputTime()
        
        if ($idleTime -lt 1000 -and $idleTime -ne $lastInputTime) {
            if ($lastInputTime -eq 0 -or ($idleTime - $lastInputTime) -gt 100) {
                Write-Host "ACTIVITY:INPUT"
                $lastInputTime = $idleTime
            }
        }
        
        # Specific keyboard checks for common keys
        $commonKeys = @(32, 13, 27, 9, 8, 46, 37, 38, 39, 40)  # Space, Enter, Esc, Tab, Backspace, Delete, Arrows
        foreach ($key in $commonKeys) {
            if ([Win32InputMonitor]::GetAsyncKeyState($key) -ne 0) {
                Write-Host "ACTIVITY:KEYBOARD"
                Start-Sleep -Milliseconds 200  # Debounce
                break
            }
        }
        
        # Heartbeat every 10 seconds
        $heartbeatCounter++
        if ($heartbeatCounter % 20 -eq 0) {
            Write-Host "HEARTBEAT:MONITOR_ALIVE"
        }
        
        Start-Sleep -Milliseconds 500
    }
    catch {
        Write-Host "Monitor error: $_"
        Start-Sleep -Milliseconds 1000
    }
}
`;
        
        writeFileSync(this.scriptPath, script);
    }

    startMonitoring(callback) {
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

            this.monitorProcess.stdout.on('data', (data) => {
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

            this.monitorProcess.stderr.on('data', (data) => {
                console.error('Monitor stderr:', data.toString().trim());
            });

            this.monitorProcess.on('error', (error) => {
                console.error('❌ Input monitor error:', error);
                this.isMonitoring = false;
            });

            this.monitorProcess.on('exit', (code, signal) => {
                console.log(`Input monitor exited with code: ${code}, signal: ${signal}`);
                this.isMonitoring = false;
                
                // Auto-restart if it wasn't intentionally stopped
                if (code !== 0 && this.activityCallback) {
                    console.log('🔄 Restarting input monitor...');
                    setTimeout(() => {
                        if (!this.isMonitoring) {
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

    stopMonitoring() {
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

    isActive() {
        return this.isMonitoring;
    }
}
