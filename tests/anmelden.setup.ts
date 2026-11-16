import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium, expect, test as setup, type BrowserContext } from '@playwright/test'
import { SITZUNG } from '../playwright.config'

// Stores a signed-in session of the test account (DEV project) for all browser tests.
// Never use a live account here.
//
// The sign-in has a CAPTCHA (Cloudflare Turnstile) that does not pass in a browser driven by
// Playwright - and it is not weakened for tests. So a person signs in in an ordinary browser
// and this setup only takes the session over:
//
//   1. Start Chrome with its own profile and a debugging port, e.g.
//      chrome.exe --remote-debugging-port=9222 --user-data-dir=<empty folder> http://localhost:3000/anmelden
//   2. Sign in there with the test account (up to five minutes).
//   3. E2E_CDP=http://localhost:9222 npx playwright test --project=anmelden
//
// The stored session stays usable while the tests run within 30 minutes (inactivity limit)
// and until the sign-out test has run. Without E2E_CDP the setup only checks a stored session.

const FUENF_MINUTEN = 5 * 60_000
const BASIS = 'http://localhost:3000'

/** True while the server still accepts the stored session; refreshes its activity cookie. */
async function gespeicherteSitzungGueltig(neuerKontext: () => Promise<BrowserContext>): Promise<boolean> {
  if (!existsSync(SITZUNG)) return false
  const kontext = await neuerKontext()
  try {
    const probe = await kontext.newPage()
    await probe.goto('/wohnungen')
    const gueltig = new URL(probe.url()).pathname === '/wohnungen'
    if (gueltig) await kontext.storageState({ path: SITZUNG })
    return gueltig
  } finally {
    await kontext.close()
  }
}

setup('Testkonto anmelden', async ({ browser }) => {
  setup.setTimeout(FUENF_MINUTEN + 60_000)

  if (await gespeicherteSitzungGueltig(() => browser.newContext({ storageState: SITZUNG, baseURL: BASIS }))) {
    return
  }

  const cdp = process.env.E2E_CDP
  expect(
    cdp,
    'Keine gültige Sitzung gespeichert. Im normalen Browser anmelden und E2E_CDP setzen (siehe Kopf dieser Datei).'
  ).toBeTruthy()

  // Take the session over from the person's own browser, once it shows the start page.
  const eigenerBrowser = await chromium.connectOverCDP(cdp!)
  try {
    const kontext = eigenerBrowser.contexts()[0]
    await expect
      .poll(() => kontext.pages().some((seite) => new URL(seite.url()).pathname === '/wohnungen'), {
        timeout: FUENF_MINUTEN,
        message: 'Warte auf die Anmeldung im Browserfenster …',
      })
      .toBe(true)

    mkdirSync(dirname(SITZUNG), { recursive: true })
    const zustand = await kontext.storageState()
    // Only this app's cookies and storage belong into the file.
    zustand.cookies = zustand.cookies.filter((cookie) => cookie.domain === 'localhost')
    zustand.origins = zustand.origins.filter((herkunft) => herkunft.origin === BASIS)
    const { writeFileSync } = await import('node:fs')
    writeFileSync(SITZUNG, JSON.stringify(zustand, null, 2))
  } finally {
    await eigenerBrowser.close() // disconnects only; the person's browser stays open
  }

  // The stored session must work in a browser of the tests.
  expect(
    await gespeicherteSitzungGueltig(() => browser.newContext({ storageState: SITZUNG, baseURL: BASIS }))
  ).toBe(true)
})
