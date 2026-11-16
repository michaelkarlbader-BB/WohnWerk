import { defineConfig, devices } from '@playwright/test'

// Signed-in session of the test account (dev project), written by tests/anmelden.setup.ts.
// It holds session cookies and is never committed (.gitignore).
export const SITZUNG = 'tests/.auth/sitzung.json'

// The one test that really signs out ends the shared session, so it runs last and alone.
const ABMELDEN = /@abmelden/
// Unsaved changes depend on browser behaviour (history, beforeunload): Chrome, Firefox and Safari.
const ALLE_BROWSER = /rahmen-ungespeichert\.spec\.ts/

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  // The dev server compiles a page on its first request.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'de-DE',
  },
  projects: [
    { name: 'anmelden', testMatch: /anmelden\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: SITZUNG },
      dependencies: ['anmelden'],
      grepInvert: ABMELDEN,
    },
    {
      name: 'firefox',
      testMatch: ALLE_BROWSER,
      // Headless Firefox gets too slow when its tests run in parallel with the other browsers.
      fullyParallel: false,
      use: { ...devices['Desktop Firefox'], storageState: SITZUNG },
      dependencies: ['anmelden'],
      grepInvert: ABMELDEN,
    },
    {
      name: 'webkit',
      testMatch: ALLE_BROWSER,
      use: { ...devices['Desktop Safari'], storageState: SITZUNG },
      dependencies: ['anmelden'],
      grepInvert: ABMELDEN,
    },
    {
      name: 'Mobile Safari',
      testMatch: /rahmen-handy\.spec\.ts/,
      use: { ...devices['iPhone 13'], storageState: SITZUNG },
      dependencies: ['anmelden'],
    },
    {
      name: 'abmelden',
      grep: ABMELDEN,
      use: { ...devices['Desktop Chrome'], storageState: SITZUNG },
      dependencies: ['chromium', 'firefox', 'webkit', 'Mobile Safari'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
