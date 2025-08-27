#!/usr/bin/env bun

import CryptoJS from 'crypto-js';
import { SecureConfig } from '../config/secure-config.js';

export class SecurityManager {
    private config: SecureConfig;
    private currentOTP: string | null = null;
    private otpExpiry: number | null = null;
    private otpValidDuration = 5 * 60 * 1000; // 5 minutes

    constructor(config: SecureConfig) {
        this.config = config;
    }

    /**
     * Generate a 6-digit settings PIN
     */
    generateSettingsPin(): string {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPin = this.hashPin(pin);
        this.config.set('settingsPin', hashedPin);
        return pin; // Return plain PIN for display to user
    }

    /**
     * Verify settings PIN
     */
    verifySettingsPin(pin: string): boolean {
        const storedHashedPin = this.config.get('settingsPin');
        if (!storedHashedPin) return false;
        
        const hashedInputPin = this.hashPin(pin);
        return hashedInputPin === storedHashedPin;
    }

    /**
     * Generate OTP for email verification
     */
    generateOTP(): string {
        this.currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
        this.otpExpiry = Date.now() + this.otpValidDuration;
        return this.currentOTP;
    }

    /**
     * Verify OTP
     */
    verifyOTP(otp: string): boolean {
        if (!this.currentOTP || !this.otpExpiry) return false;
        
        if (Date.now() > this.otpExpiry) {
            this.clearOTP();
            return false;
        }

        const isValid = this.currentOTP === otp;
        if (isValid) {
            this.clearOTP();
        }
        
        return isValid;
    }

    /**
     * Hash PIN using crypto
     */
    private hashPin(pin: string): string {
        const salt = this.config.get('company') || 'SnehCreation';
        return CryptoJS.SHA256(pin + salt).toString();
    }

    /**
     * Clear current OTP
     */
    private clearOTP(): void {
        this.currentOTP = null;
        this.otpExpiry = null;
    }

    /**
     * Encrypt configuration data
     */
    encryptConfig(data: any): string {
        const key = this.getEncryptionKey();
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    }

    /**
     * Decrypt configuration data
     */
    decryptConfig(encryptedData: string): any {
        try {
            const key = this.getEncryptionKey();
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            throw new Error('Failed to decrypt configuration data');
        }
    }

    /**
     * Get encryption key for config
     */
    private getEncryptionKey(): string {
        const masterPassword = this.config.get('masterPassword') || 'Meet@7011';
        const company = this.config.get('company') || 'SnehCreation';
        return CryptoJS.SHA256(masterPassword + company).toString();
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password: string): { 
        isValid: boolean; 
        score: number; 
        suggestions: string[] 
    } {
        const suggestions: string[] = [];
        let score = 0;

        if (password.length >= 8) score += 2;
        else suggestions.push('Use at least 8 characters');

        if (/[a-z]/.test(password)) score += 1;
        else suggestions.push('Include lowercase letters');

        if (/[A-Z]/.test(password)) score += 1;
        else suggestions.push('Include uppercase letters');

        if (/\d/.test(password)) score += 1;
        else suggestions.push('Include numbers');

        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 2;
        else suggestions.push('Include special characters');

        return {
            isValid: score >= 4,
            score: Math.min(score, 7),
            suggestions
        };
    }

    /**
     * Generate secure backup codes
     */
    generateBackupCodes(count: number = 8): string[] {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const code = Math.random().toString(36).substring(2, 15);
            codes.push(code.toUpperCase());
        }
        return codes;
    }
}
