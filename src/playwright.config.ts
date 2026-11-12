import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the app in mock mode, so no Microsoft 365 or Azure is needed.
 * Uses port 5199, so it doesn't clash with a running `npm run dev` on 5173.
 */
const port = 5199
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --mode mock --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
