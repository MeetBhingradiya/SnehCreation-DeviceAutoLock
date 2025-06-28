#!/usr/bin/env bun

import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(protector = null, config = null) {
    const app = express();
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(join(__dirname, '../dist')));
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            service: 'SnehCreation Device Protector',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    });
    
    // Admin interface for device management (web-based admin panel only)
    app.get('/', (req, res) => {
        const status = protector ? protector.getStatus() : { isLocked: false, isMonitoring: false };
        const timeout = protector ? Math.round((protector.maxInactivity || 30000) / 1000) : 30;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Sneh Creation Device Protector - Admin Panel</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; }
        .status { padding: 15px; border-radius: 5px; margin: 15px 0; }
        .status.locked { background: #ffebee; color: #c62828; }
        .status.unlocked { background: #e8f5e8; color: #2e7d32; }
        .info { background: #e3f2fd; color: #1976d2; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .warning { background: #fff3e0; color: #f57c00; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .config-section { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .form-group { margin: 15px 0; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        .btn.danger { background: #dc3545; }
        .btn.danger:hover { background: #c82333; }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Sneh Creation Device Protector</h1>
        <h2>Admin Panel</h2>
        
        <div class="info">
            <strong>ℹ️ Pure Windows Application:</strong><br>
            This device protector uses a native Windows lock screen (no web interface for locking).
            The lock screen is a pure Windows Forms application that completely takes over your screen.
        </div>
        
        <div class="status ${status.isLocked ? 'locked' : 'unlocked'}">
            <strong>Status:</strong> ${status.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}<br>
            <strong>Monitoring:</strong> ${status.isMonitoring ? '👀 ACTIVE' : '😴 INACTIVE'}
        </div>
        
        <div class="warning">
            <strong>⚠️ Note:</strong> When the device locks, a pure Windows application will take over your entire screen.
            There is no web interface for unlocking - only the Windows lock screen with password input.
        </div>
        
        <div class="config-section">
            <h3>🔐 Password Configuration</h3>
            <p><strong>User Password:</strong> Primary unlock method (configured here)</p>
            <p><strong>Master Password:</strong> Developer override (predefined)</p>
            <p><strong>Lock Timeout:</strong> ${timeout} seconds of inactivity</p>
            
            <div class="form-group">
                <label for="userPassword">Set User Password:</label>
                <input type="password" id="userPassword" placeholder="Enter new user password">
            </div>
            <button class="btn" onclick="updateUserPassword()">Update User Password</button>
            
            <div id="message"></div>
        </div>
        
        <div class="config-section">
            <h3>🧪 Test Controls</h3>
            <button class="btn danger" onclick="testLock()">Trigger Manual Lock (Testing)</button>
            <p><em>Use this to test the lock screen functionality</em></p>
        </div>
        
        <hr>
        <p><em>Sneh Creation Device Protector v1.0.0</em></p>
    </div>
    
    <script>
        async function updateUserPassword() {
            const password = document.getElementById('userPassword').value;
            if (!password || password.length < 4) {
                showMessage('Password must be at least 4 characters long', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/config/user-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                
                const result = await response.json();
                if (result.success) {
                    showMessage('User password updated successfully!', 'success');
                    document.getElementById('userPassword').value = '';
                } else {
                    showMessage('Failed to update password: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('Error updating password: ' + error.message, 'error');
            }
        }
        
        async function testLock() {
            if (!confirm('This will lock the device immediately. Continue?')) return;
            
            try {
                const response = await fetch('/api/test-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                if (result.success) {
                    showMessage('Lock triggered successfully!', 'success');
                } else {
                    showMessage('Failed to trigger lock: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('Error triggering lock: ' + error.message, 'error');
            }
        }
        
        function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.className = type;
            messageDiv.textContent = text;
            setTimeout(() => messageDiv.textContent = '', 5000);
        }
    </script>
</body>
</html>
        `);
    });
    
    // Unlock endpoint - main unlock functionality
    app.post('/unlock', async (req, res) => {
        const { password } = req.body;
        
        if (!protector) {
            return res.json({ success: false, message: 'Protector not initialized' });
        }
        
        try {
            const success = await protector.unlock(password);
            res.json({ 
                success: success,
                message: success ? 'Device unlocked' : 'Invalid password'
            });
        } catch (error) {
            console.error('Unlock error:', error);
            res.json({ success: false, message: 'Unlock failed' });
        }
    });
    
    // Legacy API endpoint
    app.post('/api/unlock', async (req, res) => {
        const { password } = req.body;
        
        if (!protector) {
            return res.json({ success: false, message: 'Protector not initialized' });
        }
        
        try {
            const success = await protector.unlock(password);
            res.json({ 
                success: success,
                message: success ? 'Device unlocked' : 'Invalid password'
            });
        } catch (error) {
            console.error('Unlock error:', error);
            res.json({ success: false, message: 'Unlock failed' });
        }
    });
    
    app.get('/api/status', (req, res) => {
        if (!protector) {
            return res.json({ 
                locked: false,
                uptime: process.uptime(),
                error: 'Protector not initialized'
            });
        }
        
        const status = protector.getStatus();
        res.json({ 
            locked: status.isLocked,
            monitoring: status.isMonitoring,
            uptime: process.uptime(),
            lastActivity: status.lastActivity,
            inactiveFor: status.inactiveFor
        });
    });
    
    // Test endpoint to manually trigger lock (for debugging)
    app.post('/api/test-lock', async (req, res) => {
        if (!protector) {
            return res.json({ success: false, message: 'Protector not initialized' });
        }
        
        try {
            console.log('🧪 Manual lock triggered via API');
            const success = await protector.manualLock();
            res.json({ 
                success: success,
                message: success ? 'Lock triggered successfully' : 'Failed to trigger lock'
            });
        } catch (error) {
            console.error('Manual lock error:', error);
            res.json({ success: false, message: 'Lock trigger failed: ' + error.message });
        }
    });
    
    // User password configuration endpoint
    app.post('/api/config/user-password', async (req, res) => {
        if (!config) {
            return res.json({ success: false, message: 'Configuration not available' });
        }
        
        const { password } = req.body;
        
        if (!password || password.length < 4) {
            return res.json({ success: false, message: 'Password must be at least 4 characters long' });
        }
        
        try {
            config.setUserPassword(password);
            console.log('🔐 User password updated via admin panel');
            res.json({ 
                success: true,
                message: 'User password updated successfully'
            });
        } catch (error) {
            console.error('❌ Failed to update user password:', error);
            res.json({ success: false, message: 'Failed to update password: ' + error.message });
        }
    });
    
    return app;
}
