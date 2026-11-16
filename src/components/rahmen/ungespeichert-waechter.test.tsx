import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RahmenKontext,
  useRahmen,
  useRahmenBereich,
  type RahmenSchnittstelle,
} from './rahmen-kontext'
import { UngespeichertWaechter } from './ungespeichert-waechter'

const nav = vi.hoisted(() => ({ pfad: '/wohnungen', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pfad,
  useRouter: () => ({ push: nav.push }),
}))

const FRAGE = 'Nicht gespeicherte Änderungen verwerfen?'
const abmelden = vi.fn<() => Promise<void>>()
let rahmen: RahmenSchnittstelle
let pushState: ReturnType<typeof vi.spyOn>
let back: ReturnType<typeof vi.spyOn>

function Seite({ ungespeichert }: { ungespeichert: boolean }) {
  const schnittstelle = useRahmen()
  useRahmenBereich({ ungespeichert })
  useEffect(() => {
    rahmen = schnittstelle
  })
  return null
}

function aufbauen(ungespeichert: boolean) {
  const baum = (wert: boolean) => (
    <RahmenKontext abmelden={abmelden}>
      <Seite ungespeichert={wert} />
      <UngespeichertWaechter />
    </RahmenKontext>
  )
  const { rerender } = render(baum(ungespeichert))
  return { melden: (wert: boolean) => rerender(baum(wert)) }
}

/** The browser went back: our entry is gone, the page's own entry is current again. */
function zurueckImBrowser() {
  act(() => {
    window.history.replaceState(null, '', window.location.href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

function vorVerlassen(): boolean {
  const ereignis = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(ereignis)
  return ereignis.defaultPrevented
}

beforeEach(() => {
  nav.pfad = '/wohnungen'
  nav.push.mockReset()
  abmelden.mockReset().mockResolvedValue(undefined)
  window.history.replaceState(null, '', '/wohnungen')
  pushState = vi.spyOn(window.history, 'pushState')
  back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Dialog', () => {
  it('is closed as long as nobody has to be asked (AC-29)', () => {
    aufbauen(true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('asks with "Verwerfen" and "Abbrechen" before a navigation (AC-27)', () => {
    aufbauen(true)
    act(() => rahmen.navigieren('/konto'))

    const dialog = screen.getByRole('alertdialog', { name: FRAGE })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('"Abbrechen" stays on the page (AC-27)', () => {
    aufbauen(true)
    act(() => rahmen.navigieren('/konto'))

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
    expect(vorVerlassen()).toBe(true) // still unsaved
  })

  it('Esc counts as "Abbrechen" (AC-30)', () => {
    aufbauen(true)
    act(() => rahmen.navigieren('/konto'))

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('"Verwerfen" carries out the navigation exactly once (AC-27)', () => {
    aufbauen(true)
    act(() => rahmen.navigieren('/konto'))

    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
  })

  it('does not ask without unsaved changes (AC-29)', () => {
    aufbauen(false)
    act(() => rahmen.navigieren('/konto'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
  })
})

describe('Tab schließen oder neu laden', () => {
  it('lets the browser ask only while changes are unsaved (AC-28, AC-29)', () => {
    const seite = aufbauen(false)
    expect(vorVerlassen()).toBe(false)

    seite.melden(true)
    expect(vorVerlassen()).toBe(true)

    seite.melden(false)
    expect(vorVerlassen()).toBe(false)
  })

  it('does not ask after "ohne Rückfrage verlassen" - the automatic sign-out (EC-3)', () => {
    aufbauen(true)
    expect(vorVerlassen()).toBe(true)

    // Synchronously, as the session guard does right before it redirects.
    rahmen.ohneRueckfrageVerlassen()
    expect(vorVerlassen()).toBe(false)
  })
})

describe('Zurück im Browser', () => {
  it('adds one history entry of the same address when changes become unsaved', () => {
    const seite = aufbauen(false)
    expect(pushState).not.toHaveBeenCalled()

    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/wohnungen')

    // Saved and changed again: the entry is still there, no second one.
    seite.melden(false)
    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
  })

  it('asks when "Zurück" used up the entry; "Abbrechen" restores it (AC-27)', () => {
    aufbauen(true)

    zurueckImBrowser()
    expect(screen.getByRole('alertdialog', { name: FRAGE })).toBeInTheDocument()
    expect(back).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(pushState).toHaveBeenCalledTimes(2)
    expect(back).not.toHaveBeenCalled()

    // The restored entry guards again.
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('"Verwerfen" really goes back and no longer asks (AC-27)', () => {
    aufbauen(true)
    zurueckImBrowser()

    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))

    expect(back).toHaveBeenCalledTimes(1)
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(vorVerlassen()).toBe(false)
  })

  it('ignores a "Zurück" that lands on its own entry (drawer closed above it)', () => {
    aufbauen(true)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    // The entry is still active: using it up asks.
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('does not ask when the changes were saved in the meantime (AC-29)', () => {
    const seite = aufbauen(true)
    seite.melden(false)

    zurueckImBrowser()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    // The used-up entry is forgotten: new changes get a new one.
    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(2)
  })

  // BUG-1: the entry of the previous page lies below the new page's entry and guards nothing.
  function zurNaechstenSeite(seite: { melden: (wert: boolean) => void }) {
    // The router moves on to another area: a new history entry above the old guard entry.
    act(() => window.history.pushState(null, '', '/mieter'))
    nav.pfad = '/mieter'
    seite.melden(false)
    pushState.mockClear()
  }

  it('guards the next page again after the old changes were saved (AC-27)', () => {
    const seite = aufbauen(true)
    seite.melden(false)
    zurNaechstenSeite(seite)

    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog', { name: FRAGE })).toBeInTheDocument()
  })

  it('guards the next page again after the old changes were discarded (AC-27)', () => {
    const seite = aufbauen(true)
    act(() => rahmen.navigieren('/mieter'))
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))
    expect(nav.push).toHaveBeenCalledTimes(1)
    zurNaechstenSeite(seite)

    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog', { name: FRAGE })).toBeInTheDocument()
  })

  // BUG-1, 2nd run: back on a page whose old guard entry lies deep below - an equal address is
  // not the same history entry.
  function zurueckZurErstenSeite(seite: { melden: (wert: boolean) => void }) {
    act(() => window.history.pushState(null, '', '/wohnungen'))
    nav.pfad = '/wohnungen'
    seite.melden(false)
    pushState.mockClear()
  }

  it('guards the first page again on return after saving (A → B → A, AC-27)', () => {
    const seite = aufbauen(true)
    seite.melden(false)
    zurNaechstenSeite(seite)
    zurueckZurErstenSeite(seite)

    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog', { name: FRAGE })).toBeInTheDocument()
  })

  it('guards the first page again on return after discarding (A → B → A, AC-27)', () => {
    const seite = aufbauen(true)
    act(() => rahmen.navigieren('/mieter'))
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))
    zurNaechstenSeite(seite)
    zurueckZurErstenSeite(seite)

    seite.melden(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    zurueckImBrowser()
    expect(screen.getByRole('alertdialog', { name: FRAGE })).toBeInTheDocument()
  })

  it('leaves the history alone without unsaved changes', () => {
    aufbauen(false)
    zurueckImBrowser()
    expect(pushState).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
