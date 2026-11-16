// Own entries in the browser history, used by the unsaved-changes guard and the phone drawer
// so that "Zurück" can be answered by the frame instead of leaving the page.
// Next.js keeps custom keys of the history state when pushState is called (it only adds its own).

export type VerlaufsMarke = 'ungespeichert' | 'schublade'

const SCHLUESSEL = 'wohnwerkMarke'
const ID_SCHLUESSEL = 'wohnwerkEintrag'

function zustand(): Record<string, unknown> | null {
  const wert: unknown = window.history.state
  return typeof wert === 'object' && wert !== null ? (wert as Record<string, unknown>) : null
}

/**
 * Adds an entry with the same address on top of the history, carrying the marker. Returns the
 * entry's own id: two entries of the same address are still different entries (PROJ-2 BUG-1).
 */
export function markeAnlegen(marke: VerlaufsMarke): string {
  const id = crypto.randomUUID()
  window.history.pushState({ [SCHLUESSEL]: marke, [ID_SCHLUESSEL]: id }, '', window.location.href)
  return id
}

/** Marker of the entry the browser is on right now, or null for an ordinary entry. */
export function aktuelleMarke(): VerlaufsMarke | null {
  const marke = zustand()?.[SCHLUESSEL]
  return marke === 'ungespeichert' || marke === 'schublade' ? marke : null
}

/** Id of the own entry the browser is on right now, or null for an ordinary entry. */
export function aktuellerEintrag(): string | null {
  const id = zustand()?.[ID_SCHLUESSEL]
  return typeof id === 'string' ? id : null
}
