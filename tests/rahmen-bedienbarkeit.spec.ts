import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  DESKTOP,
  HANDY,
  eingabeMachen,
  menueOeffnen,
  menuePunkt,
  menueleiste,
  rueckfrage,
  statustext,
  testseiteOeffnen,
} from './rahmen.hilfen'

// PROJ-2 T24: keyboard only (Tab order, Enter / Space, Esc, visible focus) and contrast with
// axe in light and dark.

test.use({ viewport: DESKTOP })

/** Label of the element that has the focus. */
const fokus = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null
    return element?.getAttribute('aria-label') || element?.textContent?.trim() || element?.tagName || ''
  })

/** Puts the starting point of the Tab key at the very beginning of the window. */
async function vonVorn(page: Page) {
  await expect(statustext(page)).toHaveText('Bereit')
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    const fenster = document.querySelector('section')
    window.getSelection()?.collapse(fenster, 0)
  })
}

async function tabFolge(page: Page, schritte: number): Promise<string[]> {
  const folge: string[] = []
  for (let schritt = 0; schritt < schritte; schritt++) {
    await page.keyboard.press('Tab')
    folge.push(await fokus(page))
  }
  return folge
}

test('Tab goes through title bar, menu titles, toolbar and area list in order (AC-30)', async ({ page }) => {
  await testseiteOeffnen(page)
  await page.getByLabel('Eintrag ausgewählt').check()
  await page.getByRole('button', { name: 'Maximieren' }).focus()

  expect(await tabFolge(page, 10)).toEqual([
    'Datei',
    'Bearbeiten',
    'Ansicht',
    'Extras',
    'Hilfe',
    'Neu',
    'Bearbeiten',
    'Löschen',
    'Aktualisieren',
    'Wohnungen',
  ])

  // And back with Shift+Tab.
  await page.keyboard.press('Shift+Tab')
  expect(await fokus(page)).toBe('Aktualisieren')
})

test('the focus is visible: dotted inner frame plus ring (AC-30)', async ({ page }) => {
  await page.goto('/wohnungen')
  await vonVorn(page)

  for (const erwartet of ['Maximieren', 'Datei']) {
    await page.keyboard.press('Tab')
    expect(await fokus(page)).toBe(erwartet)
    const stil = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as HTMLElement)
      return { umriss: s.outlineStyle, breite: s.outlineWidth, ring: s.boxShadow }
    })
    expect(stil.umriss).toBe('dotted')
    expect(stil.breite).toBe('1px')
    expect(stil.ring).toContain('0px 0px 0px 2px')
  }
})

test('Enter and Space open a menu and run an entry; Esc closes it (AC-12, AC-30)', async ({ page }) => {
  await testseiteOeffnen(page)
  const datei = menueleiste(page).getByRole('button', { name: 'Datei' })

  await datei.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(datei).toBeFocused()

  await page.keyboard.press('Space')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Enter') // first entry: "Neu…"
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.getByTestId('protokoll')).toHaveText('neu')
})

test('toolbar buttons and area links react to Enter and Space (AC-30)', async ({ page }) => {
  await testseiteOeffnen(page)

  await page.getByRole('toolbar').getByRole('button', { name: 'Neu' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  await expect(page.getByTestId('protokoll')).toHaveText('neu, neu')

  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('link', { name: 'Wohnungen' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/wohnungen$/)
})

test('Esc closes the dialogs of the frame (AC-30)', async ({ page }) => {
  await testseiteOeffnen(page)

  await menuePunkt(page, 'Hilfe', 'Über WohnWerk')
  await expect(page.getByRole('dialog', { name: 'Über WohnWerk' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await eingabeMachen(page)
  await menuePunkt(page, 'Extras', 'Konto…')
  await expect(rueckfrage(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(rueckfrage(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/rahmen-test$/)
})

test('on the phone, Tab reaches the menu button and Esc closes the drawer (AC-30)', async ({ page }) => {
  await page.setViewportSize(HANDY)
  await page.goto('/wohnungen')
  await vonVorn(page)

  await page.keyboard.press('Tab')
  expect(await fokus(page)).toBe('Menü öffnen')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

// ---- Contrast (AC-31) -----------------------------------------------------------------

async function kontrastVerstoesse(page: Page): Promise<string[]> {
  const ergebnis = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
  return ergebnis.violations.flatMap((verstoss) =>
    verstoss.nodes.map((knoten) => `${knoten.target.join(' ')} – ${knoten.failureSummary ?? ''}`)
  )
}

for (const schema of ['light', 'dark'] as const) {
  test.describe(`Kontrast ${schema === 'light' ? 'Hell' : 'Dunkel'} (AC-31)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: schema })
    })

    test('bars, area list and content messages', async ({ page }) => {
      for (const adresse of ['/wohnungen', '/gibt-es-nicht']) {
        await page.goto(adresse)
        await expect(statustext(page)).toHaveText('Bereit')
        expect(await kontrastVerstoesse(page), adresse).toEqual([])
      }
    })

    test('toolbar, confirmation and the error message', async ({ page }) => {
      await testseiteOeffnen(page)
      await page.getByRole('button', { name: 'Bestätigung melden' }).click()
      await expect(statustext(page)).toHaveText('Zweite Bestätigung.')
      expect(await kontrastVerstoesse(page)).toEqual([])

      await page.getByRole('button', { name: 'Fehler auslösen' }).click()
      await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
      expect(await kontrastVerstoesse(page)).toEqual([])
    })

    test('an open menu with its sub menu', async ({ page }) => {
      await page.goto('/wohnungen')
      const menue = await menueOeffnen(page, 'Ansicht')
      expect(await kontrastVerstoesse(page)).toEqual([])
      await menue.getByRole('menuitem', { name: 'Darstellung' }).click()
      await expect(page.getByRole('menuitemradio')).toHaveCount(3)
      expect(await kontrastVerstoesse(page)).toEqual([])
    })

    test('the dialogs "Über WohnWerk" and "Verwerfen?"', async ({ page }) => {
      await testseiteOeffnen(page)
      await menuePunkt(page, 'Hilfe', 'Über WohnWerk')
      await expect(page.getByRole('dialog', { name: 'Über WohnWerk' })).toBeVisible()
      expect(await kontrastVerstoesse(page)).toEqual([])
      await page.keyboard.press('Escape')

      await eingabeMachen(page)
      await menuePunkt(page, 'Extras', 'Konto…')
      await expect(rueckfrage(page)).toBeVisible()
      expect(await kontrastVerstoesse(page)).toEqual([])
    })

    test('the drawer on the phone', async ({ page }) => {
      await page.setViewportSize(HANDY)
      await page.goto('/wohnungen')
      await page.getByRole('button', { name: 'Menü öffnen' }).click()
      await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible()
      expect(await kontrastVerstoesse(page)).toEqual([])
    })
  })
}
