#!/usr/bin/env bun

import nodemailer from 'nodemailer';
import { SecureConfig } from '../config/secure-config.js';

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

export class EmailService {
    private config: SecureConfig;
    private transporter: nodemailer.Transporter | null = null;

    constructor(config: SecureConfig) {
        this.config = config;
        this.setupTransporter();
    }

    /**
     * Setup email transporter
     */
    private setupTransporter(): void {
        const emailConfig = this.config.get('emailConfig');
        
        if (!emailConfig) {
            // Default configuration for common providers
            this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: this.config.get('senderEmail') || '',
                    pass: this.config.get('senderPassword') || ''
                }
            });
        } else {
            this.transporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: emailConfig.port,
                secure: emailConfig.secure,
                auth: {
                    user: emailConfig.user,
                    pass: emailConfig.pass
                }
            });
        }
    }

    /**
     * Send OTP via email
     */
    async sendOTP(email: string, otp: string): Promise<void> {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.config.get('senderEmail'),
            to: email,
            subject: 'Device Protector - Security PIN Recovery',
            html: this.generateOTPEmailTemplate(otp)
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`📧 OTP sent to ${email}`);
        } catch (error) {
            console.error('❌ Failed to send OTP email:', error);
            throw new Error(`Failed to send OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Test email connection
     */
    async testConnection(testEmail: string): Promise<void> {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        try {
            await this.transporter.verify();
            
            // Send test email
            const mailOptions = {
                from: this.config.get('senderEmail'),
                to: testEmail,
                subject: 'Device Protector - Test Email',
                html: this.generateTestEmailTemplate()
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Test email sent to ${testEmail}`);
        } catch (error) {
            console.error('❌ Email test failed:', error);
            throw new Error(`Email test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate OTP email template
     */
    private generateOTPEmailTemplate(otp: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Security PIN Recovery</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #0078d4; margin-bottom: 10px; }
                .otp-box { background: linear-gradient(135deg, #0078d4, #106ebe); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 15px 0; }
                .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🛡️ Sneh Creation Device Protector</div>
                    <h2>Security PIN Recovery</h2>
                </div>
                
                <p>Hello,</p>
                <p>You have requested to recover your Device Protector settings PIN. Use the following One-Time Password (OTP) to access your settings:</p>
                
                <div class="otp-box">
                    <div>Your Security OTP:</div>
                    <div class="otp-code">${otp}</div>
                    <div>Valid for 5 minutes</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>This OTP is valid for 5 minutes only</li>
                        <li>Do not share this code with anyone</li>
                        <li>If you didn't request this, please secure your device immediately</li>
                    </ul>
                </div>
                
                <p>If you have any concerns about your device security, please contact your system administrator immediately.</p>
                
                <div class="footer">
                    <p>This is an automated message from Sneh Creation Device Protector</p>
                    <p>© 2025 Sneh Creation. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate test email template
     */
    private generateTestEmailTemplate(): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Test</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
                .header { text-align: center; color: #0078d4; margin-bottom: 20px; }
                .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🛡️ Device Protector Email Test</h2>
                </div>
                
                <div class="success">
                    <strong>✅ Success!</strong> Your email configuration is working correctly.
                </div>
                
                <p>This is a test email from your Device Protector application.</p>
                <p>Email service is properly configured and ready to send security notifications.</p>
                
                <hr>
                <p><small>Test sent at: ${new Date().toLocaleString()}</small></p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Update email configuration
     */
    updateEmailConfig(emailConfig: EmailConfig): void {
        // Convert EmailConfig to our config format
        const configData = {
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            user: emailConfig.auth.user,
            pass: emailConfig.auth.pass
        };
        this.config.set('emailConfig', configData);
        this.setupTransporter();
    }

    /**
     * Send security alert
     */
    async sendSecurityAlert(email: string, alertType: string, details: string): Promise<void> {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: this.config.get('senderEmail'),
            to: email,
            subject: `Device Protector Security Alert - ${alertType}`,
            html: this.generateSecurityAlertTemplate(alertType, details)
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`🚨 Security alert sent to ${email}`);
        } catch (error) {
            console.error('❌ Failed to send security alert:', error);
            throw new Error(`Failed to send alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate security alert template
     */
    private generateSecurityAlertTemplate(alertType: string, details: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Security Alert</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
                .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .header { text-align: center; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚨 Security Alert</h2>
                </div>
                
                <div class="alert">
                    <strong>Alert Type:</strong> ${alertType}<br>
                    <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                    <strong>Details:</strong> ${details}
                </div>
                
                <p>Please review your device security settings and ensure your device is secure.</p>
                
                <hr>
                <p><small>© 2025 Sneh Creation Device Protector</small></p>
            </div>
        </body>
        </html>
        `;
    }
}
