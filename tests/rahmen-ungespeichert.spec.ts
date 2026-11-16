import { expect, test } from '@playwright/test'
import {
  DESKTOP,
  bereichsliste,
  eingabeMachen,
  fragtVorDemVerlassen,
  inhalt,
  menuePunkt,
  menueleiste,
  rueckfrage,
  testseiteOeffnen,
  titelleiste,
} from './rahmen.hilfen'

// PROJ-2 T21: unsaved changes (changing the area, a menu destination, signing out, back,
// reload) and the error boundary - in Chrome, Firefox and Safari (see playwright.config.ts).

test.use({ viewport: DESKTOP })

test('nothing asks while nothing is unsaved (AC-29)', async ({ page }) => {
  await testseiteOeffnen(page)
  expect(await fragtVorDemVerlassen(page)).toBe(false)

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(rueckfrage(page)).toHaveCount(0)
})

test('changing the area asks; "Abbrechen" keeps the input, "Verwerfen" goes (AC-27)', async ({ page }) => {
  await testseiteOeffnen(page)
  await eingabeMachen(page, 'Entwurf 1')

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()
  await expect(rueckfrage(page)).toBeVisible()
  await expect(rueckfrage(page).getByRole('button')).toHaveText(['Abbrechen', 'Verwerfen'])

  await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click()
  await expect(rueckfrage(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/rahmen-test$/)
  await expect(page.getByLabel('Eingabe')).toHaveValue('Entwurf 1')

  await bereichsliste(page).getByRole('link', { name: 'Wohnungen' }).click()
  await rueckfrage(page).getByRole('button', { name: 'Verwerfen' }).click()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')
  await expect(rueckfrage(page)).toHaveCount(0)
})

test('a menu destination and a link in the content ask as well (AC-27)', async ({ page }) => {
  await testseiteOeffnen(page)
  await eingabeMachen(page)

  await menuePunkt(page, 'Extras', 'Konto…')
  await expect(rueckfrage(page)).toBeVisible()
  await page.keyboard.press('Escape') // Esc counts as "Abbrechen"
  await expect(rueckfrage(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/rahmen-test$/)

  await inhalt(page).getByRole('link', { name: 'Geschützter Link zum Konto' }).click()
  await expect(rueckfrage(page)).toBeVisible()
  await rueckfrage(page).getByRole('button', { name: 'Verwerfen' }).click()
  await expect(page).toHaveURL(/\/konto$/)
})

test('signing out asks; "Abbrechen" stays signed in with the input (AC-27)', async ({ page }) => {
  await testseiteOeffnen(page)
  await eingabeMachen(page, 'Entwurf 2')

  await menuePunkt(page, 'Datei', 'Abmelden')
  await expect(rueckfrage(page)).toBeVisible()
  await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click()

  await expect(page).toHaveURL(/\/rahmen-test$/)
  await expect(page.getByLabel('Eingabe')).toHaveValue('Entwurf 2')
  await expect(menueleiste(page)).toBeVisible()
})

test('the back button asks; "Abbrechen" stays with the input, "Verwerfen" goes back (AC-27)', async ({
  page,
}) => {
  await page.goto('/wohnungen')
  await testseiteOeffnen(page)
  await eingabeMachen(page, 'Entwurf 3')

  await page.goBack()
  await expect(rueckfrage(page)).toBeVisible()
  await expect(page).toHaveURL(/\/rahmen-test$/)

  await rueckfrage(page).getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page).toHaveURL(/\/rahmen-test$/)
  await expect(page.getByLabel('Eingabe')).toHaveValue('Entwurf 3')

  // The guard is armed again.
  await page.goBack()
  await expect(rueckfrage(page)).toBeVisible()
  await rueckfrage(page).getByRole('button', { name: 'Verwerfen' }).click()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')
})

test('after saving, the back button leaves without asking (AC-29)', async ({ page }) => {
  await page.goto('/wohnungen')
  await testseiteOeffnen(page)
  await eingabeMachen(page)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect.poll(() => fragtVorDemVerlassen(page)).toBe(false)

  // The guard's history entry of the same address is still there: one step back has no
  // visible effect (design.md, accepted trade-off), the next one leaves.
  await page.goBack()
  await expect(rueckfrage(page)).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(rueckfrage(page)).toHaveCount(0)
})

test('closing or reloading the tab lets the browser ask only while unsaved (AC-28, AC-29)', async ({
  page,
  browserName,
}) => {
  await testseiteOeffnen(page)
  expect(await fragtVorDemVerlassen(page)).toBe(false)

  await eingabeMachen(page, 'Entwurf 4') // waits until the browser would ask

  // Chromium reports its own question as a dialog; staying keeps the input.
  if (browserName === 'chromium') {
    const dialogTyp = new Promise<string>((erfuellt) =>
      page.once('dialog', async (dialog) => {
        erfuellt(dialog.type())
        await dialog.dismiss()
      })
    )
    await page.reload({ waitUntil: 'commit', timeout: 5_000 }).catch(() => {})
    expect(await dialogTyp).toBe('beforeunload')
    await expect(page.getByLabel('Eingabe')).toHaveValue('Entwurf 4')
  }

  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect.poll(() => fragtVorDemVerlassen(page)).toBe(false)
})

test('an error in an area shows the message in the content; the frame stays usable (AC-32)', async ({
  page,
}) => {
  await testseiteOeffnen(page)

  await page.getByRole('button', { name: 'Fehler auslösen' }).click()
  const meldung = inhalt(page).getByRole('alert')
  await expect(meldung).toContainText('Hier ist etwas schiefgelaufen.')
  // No technical details.
  await expect(inhalt(page)).not.toContainText('Absichtlicher Fehler')
  await expect(inhalt(page)).not.toContainText('Error')
  await expect(menueleiste(page)).toBeVisible()
  await expect(bereichsliste(page)).toBeVisible()

  // "Erneut versuchen" rebuilds the area.
  await meldung.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(page.getByText('Testseite des Rahmens')).toBeVisible()
  await expect(inhalt(page).getByRole('alert')).toHaveCount(0)

  // The frame still navigates from the error message.
  await page.getByRole('button', { name: 'Fehler auslösen' }).click()
  await inhalt(page).getByRole('alert').getByRole('link', { name: 'Zu den Wohnungen' }).click()
  await expect(page).toHaveURL(/\/wohnungen$/)
  await expect(titelleiste(page)).toHaveText('WohnWerk – Wohnungen')
})

// Ends the shared session, so it runs last and alone (project "abmelden").
test('"Verwerfen" on signing out signs out and shows the sign-in window @abmelden (AC-15, EC-3)', async ({
  page,
}) => {
  await testseiteOeffnen(page)
  await eingabeMachen(page)

  await menuePunkt(page, 'Datei', 'Abmelden')
  await rueckfrage(page).getByRole('button', { name: 'Verwerfen' }).click()

  await expect(page).toHaveURL(/\/anmelden/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('WohnWerk – Anmelden')
  await expect(page.getByRole('navigation', { name: 'Menü' })).toHaveCount(0)

  // The session is gone: a protected address leads to the sign-in.
  await page.goto('/wohnungen')
  await expect(page).toHaveURL(/\/anmelden\?weiter=%2Fwohnungen$/)
})
