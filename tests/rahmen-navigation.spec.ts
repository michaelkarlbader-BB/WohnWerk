import { expect, test } from '@playwright/test'
import {
  DESKTOP,
  bereichsliste,
  inhalt,
  menuePunkt,
  menueleiste,
  statustext,
  testseiteOeffnen,
  titelleiste,
  werkzeugleiste,
} from './rahmen.hilfen'

// PROJ-2 T19: start page, changing areas, bookmarks, back/forward, unknown addresses,
// areas that are not built, signed out, repeated clicks.

test.use({ viewport: DESKTOP })

test('start page is "Wohnungen" inside the program window (AC-1, AC-5, AC-36)', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')
  await expect(page).toHaveTitle('WohnWerk – Wohnungen')
  await expect(menueleiste(page)).toBeVisible()
  await expect(werkzeugleiste(page)).toBeVisible()
  await expect(bereichsliste(page).getByRole('link', { name: 'Wohnungen' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  await expect(inhalt(page)).toContainText('Die Wohnungsverwaltung folgt mit dem nächsten Ausbau.')
  await expect(statustext(page)).toHaveText('Bereit')
  await expect(page.getByText(/^Angemeldet: .+/)).toBeVisible()
})

test('the window stands on the desktop surface with a margin (AC-1)', async ({ page }) => {
  await page.goto('/wohnungen')
  const fenster = await page.getByRole('region', { name: 'WohnWerk – Wohnungen' }).boundingBox()
  expect(fenster).not.toBeNull()
  expect(fenster!.x).toBe(16)
  expect(fenster!.y).toBe(16)
  expect(fenster!.width).toBe(DESKTOP.width - 32)
  expect(fenster!.height).toBe(DESKTOP.height - 32)
})

test('areas and menu destinations change content, title and selection; back and forward work (AC-6, AC-9, AC-14, AC-36)', async ({
  page,
}) => {
  await page.goto('/wohnungen')

  await menuePunkt(page, 'Extras', 'Konto…')
  await expect(page).toHaveURL(/\/konto$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')
  await expect(page).toHaveTitle('WohnWerk – Konto')
  await expect(inhalt(page).getByRole('tab', { name: 'Allgemein' })).toBeVisible()
  await expect(bereichsliste(page).locator('[aria-current="page"]')).toHaveCount(0)

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')

  await page.goBack()
  await expect(page).toHaveURL(/\/konto$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')
  await expect(bereichsliste(page).locator('[aria-current="page"]')).toHaveCount(0)

  await page.goForward()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')
  await expect(bereichsliste(page).getByRole('link', { name: 'Wohnungen' })).toHaveAttribute(
    'aria-current',
    'page'
  )
})

test('a bookmarked address opens exactly that view in the frame (AC-8)', async ({ page }) => {
  await page.goto('/konto')
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')
  await expect(menueleiste(page)).toBeVisible()
  await expect(inhalt(page).getByRole('tab', { name: 'Allgemein' })).toBeVisible()
})

for (const adresse of ['/gibt-es-nicht', '/wohnungen/gibt-es-nicht', '/mieter', '/export-import']) {
  test(`${adresse} shows "Diese Seite gibt es nicht." inside the frame (AC-10, EC-2, AC-36)`, async ({
    page,
  }) => {
    await page.goto(adresse)

    await expect(inhalt(page)).toContainText('Diese Seite gibt es nicht.')
    await expect(menueleiste(page)).toBeVisible()
    await expect(bereichsliste(page)).toBeVisible()
    await expect(page).toHaveTitle('WohnWerk – Seite nicht gefunden')

    await inhalt(page).getByRole('link', { name: 'Zu den Wohnungen' }).click()
    await expect(page).toHaveURL(/\/wohnungen$/)
    await expect(inhalt(page)).toContainText('Die Wohnungsverwaltung folgt')
  })
}

test('areas that are not built yet are visible, greyed out and not selectable (AC-7)', async ({ page }) => {
  await page.goto('/wohnungen')
  await expect(bereichsliste(page).getByRole('link')).toHaveCount(1)
  for (const name of ['Mieter', 'Mietverträge', 'Darlehen']) {
    const eintrag = bereichsliste(page).getByText(name, { exact: true })
    await expect(eintrag).toBeVisible()
    await expect(eintrag).toHaveAttribute('aria-disabled', 'true')
    await eintrag.click({ force: true })
  }
  await expect(page).toHaveURL(/\/wohnungen$/)
})

test('choosing the active area again adds no history entry (EC-1)', async ({ page }) => {
  await page.goto('/wohnungen')
  const vorher = await page.evaluate(() => window.history.length)

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()
  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()

  await expect(page).toHaveURL(/\/wohnungen$/)
  expect(await page.evaluate(() => window.history.length)).toBe(vorher)
})

test('quick repeated clicks navigate only once (EC-9)', async ({ page }) => {
  await page.goto('/konto')
  const vorher = await page.evaluate(() => window.history.length)

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click({ clickCount: 3, delay: 20 })

  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(inhalt(page)).toContainText('Die Wohnungsverwaltung folgt')
  expect(await page.evaluate(() => window.history.length)).toBe(vorher + 1)
})

test('only the content scrolls; the bars stay where they are (AC-2)', async ({ page }) => {
  await testseiteOeffnen(page)
  const titelVorher = await titelleiste(page).boundingBox()
  const statusVorher = await statustext(page).boundingBox()

  await page.getByTestId('inhalt-ende').scrollIntoViewIfNeeded()

  await expect(page.getByTestId('inhalt-ende')).toBeInViewport()
  expect(await inhalt(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(500)
  expect(await page.evaluate(() => window.scrollY + document.documentElement.scrollTop)).toBe(0)
  expect(await titelleiste(page).boundingBox()).toEqual(titelVorher)
  expect(await statustext(page).boundingBox()).toEqual(statusVorher)
  await expect(menueleiste(page)).toBeInViewport()
  await expect(werkzeugleiste(page)).toBeInViewport()
  await expect(bereichsliste(page)).toBeInViewport()
})

test.describe('abgemeldet', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('shows only the sign-in window, without menu, toolbar and area list (AC-4, AC-8)', async ({ page }) => {
    await page.goto('/wohnungen')

    await expect(page).toHaveURL(/\/anmelden\?weiter=%2Fwohnungen$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('WohnWerk – Anmelden')
    await expect(page.getByRole('navigation', { name: 'Menü' })).toHaveCount(0)
    await expect(page.getByRole('toolbar')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Bereiche' })).toHaveCount(0)
  })
})
