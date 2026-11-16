import { expect, test, type Page } from '@playwright/test'
import {
  DESKTOP,
  HANDY,
  bereichsliste,
  eingabeMachen,
  inhalt,
  menueleiste,
  statustext,
  testseiteOeffnen,
  titelleiste,
  werkzeugleiste,
} from './rahmen.hilfen'

// PROJ-2 T23: phone at 360 px - no horizontal scrolling, controls of at least 44 px, the drawer,
// changing the width while input is kept.

test.use({ viewport: HANDY })

const menueKnopf = (page: Page) => page.getByRole('button', { name: 'Menü öffnen' })
const schublade = (page: Page) => page.getByRole('dialog', { name: 'Menü' })

async function schubladeOeffnen(page: Page) {
  await menueKnopf(page).click()
  await expect(schublade(page)).toBeVisible()
  return schublade(page)
}

/** Visible controls that are lower than 44 px (a checkbox counts through its label). */
function zuNiedrigeBedienelemente(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const auswahl = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="radio"], [role="tab"]'
    const zuNiedrig: string[] = []
    for (const element of document.querySelectorAll<HTMLElement>(auswahl)) {
      const sichtbar = element.checkVisibility({ visibilityProperty: true })
      if (!sichtbar || (element as HTMLButtonElement).disabled) continue
      const ziel =
        element instanceof HTMLInputElement && element.type === 'checkbox'
          ? (element.closest('label') ?? element)
          : element
      const hoehe = ziel.getBoundingClientRect().height
      if (hoehe < 44) {
        zuNiedrig.push(`${element.tagName} "${(element.textContent || element.getAttribute('aria-label') || '').trim()}" ${hoehe}px`)
      }
    }
    return zuNiedrig
  })
}

const keinWaagrechterBildlauf = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('the window fills the screen: menu button, no maximise, one-line status (AC-24)', async ({ page }) => {
  await testseiteOeffnen(page)

  const fenster = await page.locator('section', { has: titelleiste(page) }).first().boundingBox()
  expect(fenster).toMatchObject({ x: 0, y: 0, width: HANDY.width })

  await expect(menueKnopf(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Maximieren' })).toBeHidden()
  await expect(menueleiste(page)).toBeHidden()
  await expect(bereichsliste(page)).toBeHidden()

  // Menu button left of the title.
  const knopf = (await menueKnopf(page).boundingBox())!
  const titel = (await titelleiste(page).boundingBox())!
  expect(knopf.x + knopf.width).toBeLessThanOrEqual(titel.x)

  // Toolbar buttons of at least 44 px.
  for (const werkzeug of await werkzeugleiste(page).getByRole('button').all()) {
    expect((await werkzeug.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }

  // Status bar: only the status text, in one line.
  await expect(statustext(page)).toBeVisible()
  await expect(page.locator('footer > *').nth(1)).toBeHidden()
  await expect(page.locator('footer > *').nth(2)).toBeHidden()
  expect((await page.locator('footer').boundingBox())!.height).toBeLessThan(44)
})

for (const adresse of ['/wohnungen', '/rahmen-test', '/gibt-es-nicht']) {
  test(`${adresse}: no horizontal scrolling and every control at least 44 px high (AC-26)`, async ({
    page,
  }) => {
    await page.goto(adresse)
    await expect(statustext(page)).toHaveText('Bereit')

    expect(await keinWaagrechterBildlauf(page)).toBe(true)
    expect(await zuNiedrigeBedienelemente(page)).toEqual([])

    await schubladeOeffnen(page)
    expect(await keinWaagrechterBildlauf(page)).toBe(true)
    expect(await zuNiedrigeBedienelemente(page)).toEqual([])
  })
}

test('the account page has no horizontal scrolling inside the frame (AC-26)', async ({ page }) => {
  await page.goto('/konto')
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')
  expect(await keinWaagrechterBildlauf(page)).toBe(true)
})

test('a long title is cut with "…" and pushes nothing away (EC-5)', async ({ page }) => {
  await page.goto('/wohnungen')
  await titelleiste(page).evaluate((element) => {
    element.textContent = 'WohnWerk – Wohnungen – ' + 'Sehr langer Detailname '.repeat(10)
  })
  expect(await keinWaagrechterBildlauf(page)).toBe(true)
  await expect(menueKnopf(page)).toBeInViewport()
  expect((await titelleiste(page).boundingBox())!.height).toBeLessThan(44)
})

test('the drawer opens from the left with the areas and all menu entries (AC-25)', async ({ page }) => {
  await page.goto('/wohnungen')
  const lade = await schubladeOeffnen(page)

  expect((await lade.boundingBox())!.x).toBe(0)
  await expect(lade.getByRole('navigation', { name: 'Bereiche' }).getByRole('button')).toHaveText([
    'Wohnungen',
    'Mieter',
    'Mietverträge',
    'Darlehen',
  ])
  for (const [gruppe, eintraege] of [
    ['Datei', ['Neu…', 'Abmelden']],
    ['Bearbeiten', ['Bearbeiten…', 'Löschen…']],
    ['Ansicht', ['Wohnungen', 'Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren']],
    ['Extras', ['Export & Import…', 'Konto…']],
    ['Hilfe', ['Über WohnWerk', 'Datenschutz', 'Impressum']],
  ] as const) {
    await expect(lade.getByRole('region', { name: gruppe }).getByRole('button')).toHaveText([...eintraege])
  }
  await expect(lade.getByRole('radiogroup', { name: 'Darstellung' }).getByRole('radio')).toHaveText([
    /Hell/,
    /Dunkel/,
    /Wie System/,
  ])

  // Same rules for greyed-out entries (AC-7).
  await expect(lade.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Mieter' })).toBeDisabled()
  await expect(lade.getByRole('region', { name: 'Datei' }).getByRole('button', { name: 'Neu…' })).toBeDisabled()
  await expect(lade.getByRole('region', { name: 'Extras' }).getByRole('button', { name: 'Export & Import…' })).toBeDisabled()
})

test('tapping an entry runs it and closes the drawer (AC-25)', async ({ page }) => {
  await page.goto('/wohnungen')
  const lade = await schubladeOeffnen(page)

  await lade.getByRole('region', { name: 'Extras' }).getByRole('button', { name: 'Konto…' }).click()

  await expect(schublade(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/konto$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')

  // Back leads to the page before, not into a closed drawer.
  await page.goBack()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(schublade(page)).toHaveCount(0)
})

test('the drawer runs the actions of the area (AC-13, AC-25)', async ({ page }) => {
  await testseiteOeffnen(page)
  const lade = await schubladeOeffnen(page)
  await lade.getByRole('region', { name: 'Datei' }).getByRole('button', { name: 'Neu…' }).click()
  await expect(schublade(page)).toHaveCount(0)
  await expect(page.getByTestId('protokoll')).toHaveText('neu')
})

test('tapping beside the drawer, "Zurück" and Esc close it without any action (AC-25, AC-30)', async ({
  page,
}) => {
  await page.goto('/wohnungen')

  await schubladeOeffnen(page)
  await page.mouse.click(HANDY.width - 10, 300)
  await expect(schublade(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/wohnungen$/)

  await schubladeOeffnen(page)
  await page.goBack()
  await expect(schublade(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(inhalt(page)).toContainText('Die Wohnungsverwaltung folgt')

  await schubladeOeffnen(page)
  await page.keyboard.press('Escape')
  await expect(schublade(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/wohnungen$/)

  // The drawer left no entry behind: the history is as long as before.
  await schubladeOeffnen(page)
  await page.keyboard.press('Escape')
  await expect(schublade(page)).toHaveCount(0)
  await expect(menueKnopf(page)).toBeVisible()
})

test('changing the width switches the layout without reloading and keeps the input (EC-4)', async ({
  page,
}) => {
  await testseiteOeffnen(page)
  await page.evaluate(() => Object.assign(window, { __nichtNeuGeladen: true }))
  await eingabeMachen(page, 'bleibt erhalten')
  await schubladeOeffnen(page)

  await page.setViewportSize(DESKTOP)
  await expect(schublade(page)).toHaveCount(0)
  await expect(menueleiste(page)).toBeVisible()
  await expect(bereichsliste(page)).toBeVisible()
  await expect(menueKnopf(page)).toBeHidden()
  await expect(page.getByLabel('Eingabe')).toHaveValue('bleibt erhalten')

  await page.setViewportSize(HANDY)
  await expect(menueKnopf(page)).toBeVisible()
  await expect(menueleiste(page)).toBeHidden()
  await expect(page.getByLabel('Eingabe')).toHaveValue('bleibt erhalten')
  expect(await page.evaluate(() => '__nichtNeuGeladen' in window)).toBe(true)
})
