import { expect, type Locator, type Page } from '@playwright/test'

// Shared locators and steps of the frame's browser tests (tests/rahmen-*.spec.ts).

export const DESKTOP = { width: 1280, height: 800 }
export const HANDY = { width: 360, height: 740 }
export const TESTSEITE = '/rahmen-test'
export const OFFLINE_TEXT = 'Keine Verbindung – Änderungen können nicht gespeichert werden.'
export const FRAGE = 'Nicht gespeicherte Änderungen verwerfen?'

export const titelleiste = (page: Page) => page.getByRole('heading', { level: 1 })
export const menueleiste = (page: Page) => page.getByRole('navigation', { name: 'Menü' })
export const werkzeugleiste = (page: Page) => page.getByRole('toolbar', { name: 'Werkzeugleiste' })
export const bereichsliste = (page: Page) => page.getByRole('navigation', { name: 'Bereiche' })
export const inhalt = (page: Page) => page.getByRole('main')
/** Status text of the frame (the account page has a status line of its own). */
export const statustext = (page: Page) => page.locator('footer').getByRole('status')
export const rueckfrage = (page: Page) => page.getByRole('alertdialog', { name: FRAGE })

/** Opens a menu of the menu bar ("Hilfe" is the menu "?"). */
export async function menueOeffnen(page: Page, titel: string): Promise<Locator> {
  await menueleiste(page).getByRole('button', { name: titel, exact: true }).click()
  const menue = page.getByRole('menu')
  await expect(menue).toBeVisible()
  return menue
}

export async function menuePunkt(page: Page, titel: string, eintrag: string) {
  const menue = await menueOeffnen(page, titel)
  await menue.getByRole('menuitem', { name: eintrag, exact: true }).click()
}

/** Opens the test page and waits until it has reported its area to the frame. */
export async function testseiteOeffnen(page: Page) {
  await page.goto(TESTSEITE)
  await expect(page.getByText('Testseite des Rahmens')).toBeVisible()
  await expect(werkzeugleiste(page).getByRole('button', { name: 'Neu' })).toBeVisible()
}

/** Types into the test page's field, which makes the page report unsaved changes. */
export async function eingabeMachen(page: Page, text = 'Entwurf') {
  await page.getByLabel('Eingabe').fill(text)
  await expect.poll(() => fragtVorDemVerlassen(page)).toBe(true)
}

/** True when the browser would ask before the tab is closed or reloaded. */
export function fragtVorDemVerlassen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const ereignis = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(ereignis)
    return ereignis.defaultPrevented
  })
}
