import { defineConfig, devices } from '@playwright/test';

// Browser tests (e2e/) run against the production build served by `vite preview`, the same files
// that are deployed. Every outside request is blocked or answered by a fixture (see e2e/fixtures.ts),
// so the tests never depend on the music sources being up.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // CI installs Playwright's Chromium; locally the installed Chrome is used, so nothing to download
    ...devices['Desktop Chrome'],
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
    // the service worker caches the app between tests' page loads; only the offline tests turn it on
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
