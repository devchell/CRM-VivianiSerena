import { defineConfig, devices } from '@playwright/test'

const landingBaseUrl = process.env.E2E_LANDING_URL?.trim() || 'http://127.0.0.1:3000'
const crmBaseUrl = process.env.E2E_CRM_URL?.trim() || 'http://127.0.0.1:3001'
const browserExecutablePath = process.env.BROWSER_EXECUTABLE_PATH?.trim()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }]] : 'list',
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(browserExecutablePath ? { launchOptions: { executablePath: browserExecutablePath } } : {}),
  },
  projects: [
    {
      name: 'landing',
      testMatch: /landing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: landingBaseUrl },
    },
    {
      name: 'landing-mobile',
      testMatch: /landing\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: landingBaseUrl },
    },
    {
      name: 'crm',
      testMatch: /crm\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: crmBaseUrl },
    },
    {
      name: 'crm-mobile',
      testMatch: /crm\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: crmBaseUrl },
    },
  ],
})
