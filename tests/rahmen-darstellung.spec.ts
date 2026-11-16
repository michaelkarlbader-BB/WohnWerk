import { expect, test, type Page } from '@playwright/test'
import { DESKTOP, menueOeffnen, menueleiste, statustext } from './rahmen.hilfen'

// PROJ-2 T22: appearance (no flash, "Wie System" follows live) and maximise, also when the
// browser allows no storing.

test.use({ viewport: DESKTOP })

const SCHLUESSEL = 'wohnwerk-darstellung'
const istDunkel = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'))

async function darstellungWaehlen(page: Page, name: 'Hell' | 'Dunkel' | 'Wie System') {
  const menue = await menueOeffnen(page, 'Ansicht')
  await menue.getByRole('menuitem', { name: 'Darstellung' }).click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
}

async function gewaehlteDarstellung(page: Page): Promise<string | null> {
  const menue = await menueOeffnen(page, 'Ansicht')
  await menue.getByRole('menuitem', { name: 'Darstellung' }).click()
  const gewaehlt = await page.getByRole('menuitemradio', { checked: true }).textContent()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  return gewaehlt
}

/** Records every class <html> ever had, from before the first paint on. */
async function klassenAufzeichnen(page: Page) {
  await page.addInitScript(() => {
    const verlauf: string[] = []
    Object.assign(window, { __klassenVerlauf: verlauf })
    // <html> does not exist yet when this runs: watch the whole document.
    const merken = () => {
      if (document.documentElement) verlauf.push(document.documentElement.className)
    }
    new MutationObserver(merken).observe(document, { attributes: true, childList: true, subtree: true })
  })
}

for (const schema of ['dark', 'light'] as const) {
  test(`without a choice the appearance follows the device: ${schema} (AC-18)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema })
    await page.goto('/wohnungen')
    expect(await istDunkel(page)).toBe(schema === 'dark')
    expect(await page.evaluate((s) => window.localStorage.getItem(s), SCHLUESSEL)).toBeNull()
    expect(await gewaehlteDarstellung(page)).toBe('Wie System')
  })
}

test('a chosen appearance applies at once, is marked and stays for the next visit (AC-19)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/wohnungen')
  await page.evaluate(() => Object.assign(window, { __nichtNeuGeladen: true }))

  await darstellungWaehlen(page, 'Dunkel')
  expect(await istDunkel(page)).toBe(true)
  expect(await page.evaluate(() => '__nichtNeuGeladen' in window)).toBe(true)
  expect(await page.evaluate((s) => window.localStorage.getItem(s), SCHLUESSEL)).toBe('dark')
  expect(await gewaehlteDarstellung(page)).toBe('Dunkel')

  await page.reload()
  expect(await istDunkel(page)).toBe(true)

  // Also outside the frame (same rule as the sign-in window: the provider is app-wide).
  await page.goto('/datenschutz')
  expect(await istDunkel(page)).toBe(true)

  await page.goto('/wohnungen')
  await darstellungWaehlen(page, 'Hell')
  expect(await istDunkel(page)).toBe(false)
  expect(await page.evaluate((s) => window.localStorage.getItem(s), SCHLUESSEL)).toBe('light')
})

test.describe('abgemeldet', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the stored appearance also applies to the sign-in window (AC-19)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript((s) => window.localStorage.setItem(s, 'dark'), SCHLUESSEL)
    await page.goto('/anmelden')
    expect(await istDunkel(page)).toBe(true)
  })
})

test('a stored appearance is there from the first paint - no flash of the other one (AC-20)', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript((s) => window.localStorage.setItem(s, 'dark'), SCHLUESSEL)
  await klassenAufzeichnen(page)

  await page.goto('/wohnungen')
  await expect(statustext(page)).toHaveText('Bereit')

  expect(await istDunkel(page)).toBe(true)
  const verlauf = await page.evaluate(() => (window as unknown as { __klassenVerlauf: string[] }).__klassenVerlauf)
  expect(verlauf.length).toBeGreaterThan(0)
  expect(verlauf.some((klassen) => klassen.includes('dark'))).toBe(true)
  for (const klassen of verlauf) expect(klassen).not.toContain('light')
  // The dark window surface, not the light one.
  const flaeche = await page
    .getByRole('region', { name: 'WohnWerk – Wohnungen' })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(flaeche).toBe('rgb(46, 48, 54)')
})

test('"Wie System" follows a change of the device setting without reloading (EC-6)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/wohnungen')
  await page.evaluate(() => Object.assign(window, { __nichtNeuGeladen: true }))
  expect(await istDunkel(page)).toBe(false)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => istDunkel(page)).toBe(true)

  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => istDunkel(page)).toBe(false)
  expect(await page.evaluate(() => '__nichtNeuGeladen' in window)).toBe(true)
})

test('maximise fills the browser, restore brings the margin back; the choice stays (AC-3)', async ({
  page,
  context,
}) => {
  await page.goto('/wohnungen')
  const fenster = page.getByRole('region', { name: 'WohnWerk – Wohnungen' })
  const voll = { x: 0, y: 0, width: DESKTOP.width, height: DESKTOP.height }
  const mitRand = { x: 16, y: 16, width: DESKTOP.width - 32, height: DESKTOP.height - 32 }
  expect(await fenster.boundingBox()).toEqual(mitRand)

  await page.getByRole('button', { name: 'Maximieren' }).click()
  await expect.poll(() => fenster.boundingBox()).toEqual(voll)
  expect((await context.cookies()).find((cookie) => cookie.name === 'wohnwerk-fenster')?.value).toBe('1')

  // Next visit: the server draws it maximised at once.
  await page.reload()
  expect(await fenster.boundingBox()).toEqual(voll)
  await expect(page.getByRole('button', { name: 'Wiederherstellen' })).toBeVisible()

  await page.getByRole('button', { name: 'Wiederherstellen' }).click()
  await expect.poll(() => fenster.boundingBox()).toEqual(mitRand)
  expect((await context.cookies()).find((cookie) => cookie.name === 'wohnwerk-fenster')).toBeUndefined()

  await page.reload()
  expect(await fenster.boundingBox()).toEqual(mitRand)
})

test('a tampered cookie value does not maximise (SEC-02)', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'wohnwerk-fenster', value: 'true', url: baseURL }])
  await page.goto('/wohnungen')
  await expect(page.getByRole('button', { name: 'Maximieren' })).toBeVisible()
})

test('without permission to store, both choices work for the visit and nothing fails (EC-7)', async ({
  page,
}) => {
  const fehler: string[] = []
  page.on('pageerror', (ereignis) => fehler.push(ereignis.message))
  // Like a browser that blocks site data: every write throws.
  await page.addInitScript(() => {
    const verboten = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
    Storage.prototype.setItem = verboten
    Object.defineProperty(Document.prototype, 'cookie', { get: () => '', set: verboten, configurable: true })
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/wohnungen')
  await expect(menueleiste(page)).toBeVisible()

  await darstellungWaehlen(page, 'Dunkel')
  expect(await istDunkel(page)).toBe(true)

  const fenster = page.getByRole('region', { name: 'WohnWerk – Wohnungen' })
  await page.getByRole('button', { name: 'Maximieren' }).click()
  await expect.poll(() => fenster.boundingBox()).toEqual({ x: 0, y: 0, width: DESKTOP.width, height: DESKTOP.height })

  await expect(statustext(page)).toHaveText('Bereit')
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  expect(fehler).toEqual([])
})
