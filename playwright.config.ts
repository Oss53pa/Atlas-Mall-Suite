// ═══ Playwright config — Atlas Mall Suite ═══
//
// Installation :
//   npm i -D @playwright/test
//   npx playwright install chromium
//
// Lancement :
//   npx playwright test
//   npx playwright test --ui     # mode UI

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'kiosk-portrait',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1080, height: 1920 } },
    },
    {
      name: 'mobile-feedback',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: 'npm run dev',
    port: 5173,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
})
