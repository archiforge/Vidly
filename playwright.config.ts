import { defineConfig, devices } from '@playwright/test';

const PORT = 3901;
export const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vidly_e2e';

/**
 * End-to-end tests run against the production build (`npm run build`) served by the API,
 * using a dedicated database that is reset and re-seeded before every run.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: {
    command: 'node apps/server/dist/index.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(PORT),
      MONGODB_URI: E2E_MONGODB_URI,
      JWT_SECRET: 'e2e-only-secret-that-is-at-least-32-characters-long',
      LOG_LEVEL: 'warn',
    },
  },
});
