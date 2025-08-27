// Test setup for Vitest
import { vi } from 'vitest';

// Mock Electron APIs
global.process.env.NODE_ENV = 'test';

// Mock electron module
vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: vi.fn(() => true),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn(() => ({
    loadFile: vi.fn(),
    show: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn()
    }
  })),
  Menu: {
    buildFromTemplate: vi.fn()
  },
  Tray: vi.fn(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn()
  })),
  dialog: {
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 }))
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    once: vi.fn()
  },
  shell: {
    openExternal: vi.fn()
  },
  protocol: {
    registerFileProtocol: vi.fn()
  }
}));

// Mock node-mailer
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn(() => ({
      sendMail: vi.fn(() => Promise.resolve()),
      verify: vi.fn(() => Promise.resolve())
    }))
  }
}));

// Mock crypto-js
vi.mock('crypto-js', () => ({
  default: {
    SHA256: vi.fn(() => ({ toString: () => 'mocked-hash' })),
    AES: {
      encrypt: vi.fn(() => ({ toString: () => 'encrypted-data' })),
      decrypt: vi.fn(() => ({ toString: () => 'decrypted-data' }))
    },
    enc: {
      Utf8: 'utf8'
    }
  }
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn()
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn(),
    kill: vi.fn()
  }))
}));

// Mock fs operations
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => 'mock file content'),
  existsSync: vi.fn(() => true)
}));

// Global test utilities
global.mockElectronApp = {
  quit: vi.fn(),
  on: vi.fn(),
  requestSingleInstanceLock: vi.fn(() => true)
};

global.mockBrowserWindow = {
  loadFile: vi.fn(),
  show: vi.fn(),
  close: vi.fn(),
  on: vi.fn()
};

// Suppress console logs during tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};
