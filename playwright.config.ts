import { defineConfig, devices } from '@playwright/test';

const APP_URL = process.env.APP_URL;
const LOCAL_URL = 'http://localhost:4173';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: APP_URL || LOCAL_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-gpu',
            '--use-gl=swiftshader',
            '--disable-software-rasterizer',
          ],
        },
      },
    },
  ],
  // Only start a local server if APP_URL is not provided (external deployment)
  webServer: APP_URL
    ? undefined
    : {
        command: 'npm run preview',
        url: LOCAL_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
});
