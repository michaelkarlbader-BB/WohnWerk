// Pure rules of the frame: status text priority, confirmation duration, "maximised" cookie.

export const TEXT_BEREIT = 'Bereit'
export const TEXT_WARTEN = 'Bitte warten…'
export const TEXT_OFFLINE = 'Keine Verbindung – Änderungen können nicht gespeichert werden.'

/** AC-22: a confirmation turns back into "Bereit" after about 10 seconds. */
export const BESTAETIGUNG_DAUER_MS = 10_000
export const BESTAETIGUNG_MAX_ZEICHEN = 120

/** localStorage key of the appearance (values light / dark / system). */
export const DARSTELLUNG_SCHLUESSEL = 'wohnwerk-darstellung'

/** Cookie that remembers "maximised" on this device, so the server draws the window right. */
export const FENSTER_COOKIE = 'wohnwerk-fenster'
const FENSTER_COOKIE_MAXIMIERT = '1'
const EIN_JAHR_SEKUNDEN = 60 * 60 * 24 * 365

export type StatusZustand = {
  online: boolean
  laedt: boolean
  /** Current confirmation, or null / empty when there is none. */
  bestaetigung: string | null
}

/** Priority: Keine Verbindung > Bitte warten… > Bestätigung > Bereit (AC-21–23, AC-33, EC-10). */
export function statustext({ online, laedt, bestaetigung }: StatusZustand): string {
  if (!online) return TEXT_OFFLINE
  if (laedt) return TEXT_WARTEN
  return bestaetigung?.trim() || TEXT_BEREIT
}

/** Confirmation as it is shown: trimmed, at most 120 characters; null when empty. */
export function bestaetigungText(text: string): string | null {
  const gekuerzt = text.trim().slice(0, BESTAETIGUNG_MAX_ZEICHEN)
  return gekuerzt === '' ? null : gekuerzt
}

/** The only value from outside: exactly "1" means maximised, everything else normal. */
export function istMaximiert(cookieWert: string | null | undefined): boolean {
  return cookieWert === FENSTER_COOKIE_MAXIMIERT
}

/** Value for `document.cookie`: sets the cookie for one year or deletes it ("Wiederherstellen"). */
export function fensterCookie(maximiert: boolean): string {
  const wert = maximiert ? FENSTER_COOKIE_MAXIMIERT : ''
  const dauer = maximiert ? EIN_JAHR_SEKUNDEN : 0
  return `${FENSTER_COOKIE}=${wert}; Path=/; Max-Age=${dauer}; SameSite=Lax`
}
