import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 *
 * Runs smoke tests against local dev server to verify:
 * - Homepage content and sections load
 * - Population bucket filtering is correct
 * - Sorting direction is correct
 * - v2 scoring displays when basket data available
 * - v1 fallback works for cities without basket data
 */

const baseURL = process.env.BASE_URL || 'http://localhost:3004';

export default defineConfig({
  testDir: './tests/e2e',

  // Fail tests after 30 seconds
  timeout: 30 * 1000,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit the number of workers on CI, use default locally
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run dev server before starting the tests (optional)
  // Uncomment if you want tests to auto-start the server:
  // webServer: {
  //   command: 'npm run dev',
  //   url: baseURL,
  //   reuseExistingServer: !process.env.CI,
  // },
});
