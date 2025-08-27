import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureConfig } from '../src/config/secure-config';

describe('SecureConfig', () => {
  let config: SecureConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    config = new SecureConfig(true); // Enable test mode
    // Clear any existing config to start fresh
    config.clear();
  });

  describe('Password Management', () => {
    it('should validate master password correctly', () => {
      const testPassword = 'TestMaster123';
      config.setMasterPassword(testPassword);    
      
      expect(config.validateMasterPassword(testPassword)).toBe(true);
      expect(config.validateMasterPassword('wrongpassword')).toBe(false);
    });

    it('should validate user password correctly', () => {
      const testPassword = 'TestUser123';
      config.setUserPassword(testPassword);
      
      expect(config.validateUserPassword(testPassword)).toBe(true);
      expect(config.validateUserPassword('wrongpassword')).toBe(false);
    });

    it('should validate combined passwords', () => {
      const masterPassword = 'Master123';
      const userPassword = 'User123';
      
      config.setMasterPassword(masterPassword);
      config.setUserPassword(userPassword);
      
      expect(config.validatePassword(masterPassword)).toBe(true);
      expect(config.validatePassword(userPassword)).toBe(true);
      expect(config.validatePassword('wrongpassword')).toBe(false);
    });

    it('should enforce minimum password length for master password', () => {
      expect(() => config.setMasterPassword('short')).toThrow('Master password must be at least 8 characters long');
    });

    it('should enforce minimum password length for user password', () => {
      expect(() => config.setUserPassword('123')).toThrow('User password must be at least 4 characters long');
    });
  });

  describe('Timeout Management', () => {
    it('should set valid timeout', () => {
      config.setTimeout(120);
      expect(config.getTimeout()).toBe(120);
    });

    it('should enforce minimum timeout', () => {
      expect(() => config.setTimeout(30)).toThrow('Timeout must be at least 60 seconds');
    });

    it('should return default timeout when not set', () => {
      expect(config.getTimeout()).toBe(600); // Default value
    });
  });

  describe('Update Interval Management', () => {
    it('should set valid update interval', () => {
      const interval = 3600000; // 1 hour
      config.setUpdateInterval(interval);
      expect(config.getUpdateInterval()).toBe(interval);
    });

    it('should enforce minimum update interval', () => {
      expect(() => config.setUpdateInterval(60000)).toThrow('Update interval must be at least 5 minutes');
    });
  });

  describe('Configuration Persistence', () => {
    it('should export configuration correctly', () => {
      config.setUserPassword('TestPassword');
      config.setTimeout(300);
      
      const exported = config.export();
      
      expect(exported).toHaveProperty('path');
      expect(exported).toHaveProperty('config');
      expect(exported).toHaveProperty('timestamp');
      expect(exported.config.userPassword).toBe('TestPassword');
      expect(exported.config.defaultTimeout).toBe(300);
    });

    it('should handle get/set operations correctly', () => {
      config.set('company', 'Test Company');
      expect(config.get('company')).toBe('Test Company');
      
      expect(config.has('company')).toBe(true);
      expect(config.has('nonexistent')).toBe(false);
    });

    it('should handle delete operations correctly', () => {
      config.set('testKey', 'testValue');
      expect(config.has('testKey')).toBe(true);
      
      config.delete('testKey');
      expect(config.has('testKey')).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      const allConfig = config.getAll();
      
      expect(allConfig.company).toBe('Sneh Creation');
      expect(allConfig.defaultTimeout).toBe(600);
      expect(allConfig.maxAttempts).toBe(10);
      expect(allConfig.port).toBe(3850);
      expect(allConfig.enableTray).toBe(true);
      expect(allConfig.theme).toBe('dark');
      expect(allConfig.language).toBe('en');
    });
  });
});
