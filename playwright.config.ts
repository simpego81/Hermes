import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Electron E2E tests
 * Used to verify UI changes with screenshots and interaction tests
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for Electron
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron app

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    // Base URL for Vite dev server
    baseURL: 'http://127.0.0.1:5173',

    // Screenshot settings
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',

    // Video recording
    video: 'retain-on-failure',
  },

  // Output folders
  outputDir: 'test-results',

  // Projects for different test types
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts',
    },
  ],
});
