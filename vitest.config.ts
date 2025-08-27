import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        'src/renderer/**',
        'dist/**'
      ]
    },
    timeout: 10000,
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@electron': resolve(__dirname, './src/electron'),
      '@shared': resolve(__dirname, './src/shared'),
      '@config': resolve(__dirname, './src/config'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  esbuild: {
    target: 'node18'
  }
});
