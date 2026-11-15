// Own entries in the browser history, used by the unsaved-changes guard and the phone drawer
// so that "Zurück" can be answered by the frame instead of leaving the page.
// Next.js keeps custom keys of the history state when pushState is called (it only adds its own).

export type VerlaufsMarke = 'ungespeichert' | 'schublade'

const SCHLUESSEL = 'wohnwerkMarke'

/** Adds an entry with the same address on top of the history, carrying the marker. */
export function markeAnlegen(marke: VerlaufsMarke): void {
  window.history.pushState({ [SCHLUESSEL]: marke }, '', window.location.href)
}

/** Marker of the entry the browser is on right now, or null for an ordinary entry. */
export function aktuelleMarke(): VerlaufsMarke | null {
  const zustand: unknown = window.history.state
  if (typeof zustand !== 'object' || zustand === null) return null
  const marke = (zustand as Record<string, unknown>)[SCHLUESSEL]
  return marke === 'ungespeichert' || marke === 'schublade' ? marke : null
}
