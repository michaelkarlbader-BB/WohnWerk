import { expect, test } from '@playwright/test'
import paket from '../package.json'
import {
  DESKTOP,
  OFFLINE_TEXT,
  inhalt,
  menueOeffnen,
  menuePunkt,
  menueleiste,
  statustext,
  testseiteOeffnen,
  titelleiste,
  werkzeugleiste,
} from './rahmen.hilfen'

// PROJ-2 T20: menus, toolbar, status bar, offline hint.

test.use({ viewport: DESKTOP })

const MENUES: [string, string[]][] = [
  ['Datei', ['Neu…', 'Abmelden']],
  ['Bearbeiten', ['Bearbeiten…', 'Löschen…']],
  ['Ansicht', ['Wohnungen', 'Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren', 'Darstellung']],
  ['Extras', ['Export & Import…', 'Konto…']],
  ['Hilfe', ['Über WohnWerk', 'Datenschutz', 'Impressum']],
]

test('every menu title opens its entries; Esc closes it (AC-11, AC-12)', async ({ page }) => {
  await page.goto('/wohnungen')
  await expect(menueleiste(page).getByRole('button')).toHaveText(['Datei', 'Bearbeiten', 'Ansicht', 'Extras', '?'])

  for (const [titel, eintraege] of MENUES) {
    const menue = await menueOeffnen(page, titel)
    await expect(menue.getByRole('menuitem')).toHaveText(eintraege.map((text) => new RegExp(`^•?${text}$`)))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
  }
})

test('the appearance sub menu offers Hell, Dunkel and Wie System (AC-11)', async ({ page }) => {
  await page.goto('/wohnungen')
  const menue = await menueOeffnen(page, 'Ansicht')
  await menue.getByRole('menuitem', { name: 'Darstellung' }).click()
  await expect(page.getByRole('menuitemradio')).toHaveText(['Hell', 'Dunkel', 'Wie System'])
})

test('a click outside closes the menu without doing anything (AC-12)', async ({ page }) => {
  await page.goto('/wohnungen')
  await menueOeffnen(page, 'Extras')
  await inhalt(page).click({ position: { x: 300, y: 300 } })
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page).toHaveURL(/\/wohnungen$/)
})

test('entries of features that are not built are greyed out (AC-7)', async ({ page }) => {
  await page.goto('/wohnungen')
  const ansicht = await menueOeffnen(page, 'Ansicht')
  for (const name of ['Mieter', 'Mietverträge', 'Darlehen']) {
    await expect(ansicht.getByRole('menuitem', { name, exact: true })).toHaveAttribute('aria-disabled', 'true')
  }
  await page.keyboard.press('Escape')
  const extras = await menueOeffnen(page, 'Extras')
  await expect(extras.getByRole('menuitem', { name: 'Export & Import…' })).toHaveAttribute('aria-disabled', 'true')
  await expect(extras.getByRole('menuitem', { name: 'Konto…' })).not.toHaveAttribute('aria-disabled', 'true')
})

test('an area without actions has an empty toolbar and greyed-out menu actions (AC-17)', async ({ page }) => {
  await page.goto('/wohnungen')
  await expect(werkzeugleiste(page)).toBeVisible()
  await expect(werkzeugleiste(page).getByRole('button')).toHaveCount(0)

  const datei = await menueOeffnen(page, 'Datei')
  await expect(datei.getByRole('menuitem', { name: 'Neu…' })).toHaveAttribute('aria-disabled', 'true')
})

test('toolbar and menu offer exactly the actions of the area and do the same (AC-13, AC-17)', async ({
  page,
}) => {
  await testseiteOeffnen(page)
  const leiste = werkzeugleiste(page)
  const protokoll = page.getByTestId('protokoll')
  await expect(leiste.getByRole('button')).toHaveCount(4)
  await expect(leiste.getByRole('button', { name: 'Neu' })).toBeEnabled()
  await expect(leiste.getByRole('button', { name: 'Bearbeiten' })).toBeDisabled()
  await expect(leiste.getByRole('button', { name: 'Löschen' })).toBeDisabled()

  // Not available right now: greyed out in the menu as well.
  const bearbeiten = await menueOeffnen(page, 'Bearbeiten')
  await expect(bearbeiten.getByRole('menuitem', { name: 'Löschen…' })).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')

  await leiste.getByRole('button', { name: 'Neu' }).click()
  await expect(protokoll).toHaveText('neu')
  await menuePunkt(page, 'Datei', 'Neu…')
  await expect(protokoll).toHaveText('neu, neu')
  await expect(page.getByRole('menu')).toHaveCount(0) // AC-12: closed after running

  await page.getByLabel('Eintrag ausgewählt').check()
  await expect(leiste.getByRole('button', { name: 'Löschen' })).toBeEnabled()
  await menuePunkt(page, 'Bearbeiten', 'Löschen…')
  await expect(protokoll).toHaveText('neu, neu, loeschen')
  await leiste.getByRole('button', { name: 'Bearbeiten' }).click()
  await expect(protokoll).toHaveText('neu, neu, loeschen, bearbeiten')

  await page.getByLabel('Aktionen anbieten').uncheck()
  await expect(leiste.getByRole('button')).toHaveCount(0)
})

test('a running action locks its button and menu entry (EC-9)', async ({ page }) => {
  await testseiteOeffnen(page)
  const knopf = werkzeugleiste(page).getByRole('button', { name: 'Aktualisieren' })

  await knopf.click()
  await expect(knopf).toBeDisabled()
  const ansicht = await menueOeffnen(page, 'Ansicht')
  await expect(ansicht.getByRole('menuitem', { name: 'Aktualisieren' })).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')

  await expect(knopf).toBeEnabled()
  await expect(page.getByTestId('protokoll')).toHaveText('aktualisieren')
})

test('"Extras → Konto…" opens the account page in the content area (AC-14)', async ({ page }) => {
  await page.goto('/wohnungen')
  await menuePunkt(page, 'Extras', 'Konto…')
  await expect(page).toHaveURL(/\/konto$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Konto')
  await expect(inhalt(page).getByRole('tab', { name: 'Sicherheit' })).toBeVisible()
  // Exactly one title bar: the account page has none of its own.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('"? → Über WohnWerk" shows name, version and the legal links (AC-16)', async ({ page }) => {
  await page.goto('/wohnungen')
  await menuePunkt(page, 'Hilfe', 'Über WohnWerk')

  const dialog = page.getByRole('dialog', { name: 'Über WohnWerk' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('WohnWerk')
  await expect(dialog).toContainText(`Version ${paket.version}`)
  await expect(dialog.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute('href', '/datenschutz')
  await expect(dialog.getByRole('link', { name: 'Impressum' })).toHaveAttribute('href', '/impressum')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

for (const [eintrag, adresse] of [
  ['Datenschutz', '/datenschutz'],
  ['Impressum', '/impressum'],
]) {
  test(`"? → ${eintrag}" opens the page (AC-16)`, async ({ page }) => {
    await page.goto('/wohnungen')
    await menuePunkt(page, 'Hilfe', eintrag)
    await expect(page).toHaveURL(new RegExp(`${adresse}$`))
    await expect(page).toHaveTitle(`WohnWerk – ${eintrag}`)
  })
}

test('the status bar shows status text, count and the signed-in user (AC-21)', async ({ page }) => {
  await testseiteOeffnen(page)
  const felder = page.locator('footer > *')
  await expect(felder).toHaveCount(3)
  await expect(felder.nth(0)).toHaveText('Bereit')
  await expect(felder.nth(1)).toHaveText('3 Testeinträge')
  await expect(felder.nth(2)).toHaveText(/^Angemeldet: .+/)

  // An area that reports no count leaves the field empty.
  await page.goto('/wohnungen')
  await expect(page.locator('footer > *').nth(1)).toHaveText('')
})

test('a confirmation is replaced at once and turns into "Bereit" after 10 seconds (AC-22)', async ({
  page,
}) => {
  await page.clock.install()
  await testseiteOeffnen(page)

  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(statustext(page)).toHaveText('Testdaten gespeichert.')

  await page.clock.runFor(5_000)
  await page.getByRole('button', { name: 'Bestätigung melden' }).click()
  await expect(statustext(page)).toHaveText('Zweite Bestätigung.')

  await page.clock.runFor(9_000)
  await expect(statustext(page)).toHaveText('Zweite Bestätigung.')
  await page.clock.runFor(1_500)
  await expect(statustext(page)).toHaveText('Bereit')
})

test('loading shows the segment progress bar and "Bitte warten…", then the previous text (AC-23)', async ({
  page,
}) => {
  await testseiteOeffnen(page)
  await page.getByRole('button', { name: 'Bestätigung melden' }).click()
  await expect(statustext(page)).toHaveText('Zweite Bestätigung.')

  await page.getByRole('button', { name: 'Laden melden' }).click()
  await expect(statustext(page)).toHaveText('Bitte warten…')
  await expect(page.getByRole('progressbar', { name: 'Ladevorgang' })).toBeVisible()

  await expect(statustext(page)).toHaveText('Zweite Bestätigung.')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
})

test('without a connection the status bar says so, also instead of an endless loading (AC-33, EC-10)', async ({
  page,
  context,
}) => {
  await testseiteOeffnen(page)
  await page.getByRole('button', { name: 'Endlos laden' }).click()
  await expect(statustext(page)).toHaveText('Bitte warten…')

  await context.setOffline(true)
  await expect(statustext(page)).toHaveText(OFFLINE_TEXT)
  await expect(page.getByRole('progressbar')).toHaveCount(0)

  await context.setOffline(false)
  await expect(statustext(page)).toHaveText('Bereit')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
})
