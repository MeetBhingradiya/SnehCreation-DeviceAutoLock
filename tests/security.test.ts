import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityManager } from '../src/shared/security';
import { SecureConfig } from '../src/config/secure-config';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  let mockConfig: SecureConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = new SecureConfig(true); // Enable test mode
    securityManager = new SecurityManager(mockConfig);
  });

  describe('Settings PIN Management', () => {
    it('should generate a 6-digit PIN', () => {
      const pin = securityManager.generateSettingsPin();
      
      expect(pin).toMatch(/^\d{6}$/);
      expect(pin.length).toBe(6);
    });

    it('should verify PIN correctly', () => {
      const pin = securityManager.generateSettingsPin();
      
      expect(securityManager.verifySettingsPin(pin)).toBe(true);
      expect(securityManager.verifySettingsPin('000000')).toBe(false);
      expect(securityManager.verifySettingsPin('123456')).toBe(false);
    });

    it('should return false for invalid PIN format', () => {
      securityManager.generateSettingsPin();
      
      expect(securityManager.verifySettingsPin('abc123')).toBe(false);
      expect(securityManager.verifySettingsPin('12345')).toBe(false); // too short
      expect(securityManager.verifySettingsPin('1234567')).toBe(false); // too long
    });
  });

  describe('OTP Management', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = securityManager.generateOTP();
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should verify OTP correctly within validity period', () => {
      const otp = securityManager.generateOTP();
      
      expect(securityManager.verifyOTP(otp)).toBe(true);
      expect(securityManager.verifyOTP('000000')).toBe(false);
    });

    it('should invalidate OTP after successful verification', () => {
      const otp = securityManager.generateOTP();
      
      expect(securityManager.verifyOTP(otp)).toBe(true);
      expect(securityManager.verifyOTP(otp)).toBe(false); // Should fail second time
    });

    it('should handle expired OTP', async () => {
      const otp = securityManager.generateOTP();
      
      // Mock expired OTP by manipulating time
      const originalTime = Date.now;
      const mockTime = Date.now() + 6 * 60 * 1000; // 6 minutes later
      Date.now = vi.fn(() => mockTime);
      
      expect(securityManager.verifyOTP(otp)).toBe(false);
      
      // Restore original Date.now
      Date.now = originalTime;
    });

    it('should return false when no OTP exists', () => {
      expect(securityManager.verifyOTP('123456')).toBe(false);
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const result = securityManager.validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should identify weak passwords', () => {
      const result = securityManager.validatePasswordStrength('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide helpful suggestions', () => {
      const result = securityManager.validatePasswordStrength('password');
      
      expect(result.suggestions).toContain('Include uppercase letters');
      expect(result.suggestions).toContain('Include numbers');
      expect(result.suggestions).toContain('Include special characters');
    });

    it('should handle empty password', () => {
      const result = securityManager.validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.suggestions).toContain('Use at least 8 characters');
    });
  });

  describe('Backup Codes Generation', () => {
    it('should generate default number of backup codes', () => {
      const codes = securityManager.generateBackupCodes();
      
      expect(codes).toHaveLength(8);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(code.length).toBeGreaterThan(0);
      });
    });

    it('should generate custom number of backup codes', () => {
      const codes = securityManager.generateBackupCodes(5);
      
      expect(codes).toHaveLength(5);
    });

    it('should generate unique codes', () => {
      const codes = securityManager.generateBackupCodes(10);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = { username: 'test', password: 'secret' };
      
      const encrypted = securityManager.encryptConfig(testData);
      expect(encrypted).not.toBe(JSON.stringify(testData));
      
      const decrypted = securityManager.decryptConfig(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle encryption of different data types', () => {
      const testCases = [
        { test: 'string' },
        { test: 123 },
        { test: true },
        { test: ['array', 'data'] },
        { nested: { object: 'value' } }
      ];

      testCases.forEach(testData => {
        const encrypted = securityManager.encryptConfig(testData);
        const decrypted = securityManager.decryptConfig(encrypted);
        expect(decrypted).toEqual(testData);
      });
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        securityManager.decryptConfig('invalid-encrypted-data');
      }).toThrow('Failed to decrypt configuration data');
    });
  });
});
