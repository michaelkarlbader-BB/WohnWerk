import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RahmenKontext,
  RahmenLink,
  useRahmen,
  useRahmenBereich,
  useRahmenLaden,
  useRahmenVorAbmelden,
  useRahmenZustand,
  type BereichEinrichtung,
  type RahmenSchnittstelle,
  type RahmenZustand,
} from './rahmen-kontext'

const nav = vi.hoisted(() => ({ pfad: '/wohnungen', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pfad,
  useRouter: () => ({ push: nav.push }),
}))

const OFFLINE = 'Keine Verbindung – Änderungen können nicht gespeichert werden.'

let zustand: RahmenZustand
let rahmen: RahmenSchnittstelle
let abmelden: ReturnType<typeof vi.fn<() => Promise<void>>>

function Sonde() {
  const aktuellerZustand = useRahmenZustand()
  const aktuellerRahmen = useRahmen()
  useEffect(() => {
    zustand = aktuellerZustand
    rahmen = aktuellerRahmen
  })
  return null
}

function Seite(einrichtung: BereichEinrichtung) {
  useRahmenBereich(einrichtung)
  return null
}

function aufbauen(seite?: BereichEinrichtung, extra?: React.ReactNode) {
  const baum = (s?: BereichEinrichtung, e?: React.ReactNode) => (
    <RahmenKontext abmelden={abmelden}>
      <Sonde />
      {s && <Seite {...s} />}
      {e}
    </RahmenKontext>
  )
  const { rerender, unmount } = render(baum(seite, extra))
  return {
    unmount,
    neu: (s?: BereichEinrichtung, e?: React.ReactNode) => rerender(baum(s, e)),
  }
}

function verbindung(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

beforeEach(() => {
  nav.pfad = '/wohnungen'
  nav.push.mockReset()
  abmelden = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Bereich einrichten', () => {
  it('starts empty: no actions, no count, "Bereit" (AC-17, AC-21)', () => {
    aufbauen()
    expect(zustand.aktionen).toEqual({})
    expect(zustand.anzahl).toBeNull()
    expect(zustand.detailtitel).toBeNull()
    expect(zustand.ungespeichert).toBe(false)
    expect(zustand.statustext).toBe('Bereit')
    expect(zustand.pfad).toBe('/wohnungen')
  })

  it('offers exactly the reported actions with their availability (AC-13, AC-17)', () => {
    aufbauen({
      aktionen: {
        neu: { ausfuehren: vi.fn(), verfuegbar: true },
        loeschen: { ausfuehren: vi.fn(), verfuegbar: false },
      },
      anzahl: ' 4 Wohnungen ',
      detailtitel: 'WE 03 – Musterstraße 5',
    })
    expect(zustand.aktionen).toEqual({ neu: true, loeschen: false })
    expect(zustand.anzahl).toBe('4 Wohnungen')
    expect(zustand.detailtitel).toBe('WE 03 – Musterstraße 5')
  })

  it('runs the latest function of an available action and nothing else (AC-13)', () => {
    const alt = vi.fn()
    const aktuell = vi.fn()
    const gesperrt = vi.fn()
    const seite = aufbauen({ aktionen: { neu: { ausfuehren: alt, verfuegbar: true } } })
    seite.neu({
      aktionen: {
        neu: { ausfuehren: aktuell, verfuegbar: true },
        loeschen: { ausfuehren: gesperrt, verfuegbar: false },
      },
    })

    act(() => {
      zustand.aktionAusfuehren('neu')
      zustand.aktionAusfuehren('loeschen') // reported, but not available
      zustand.aktionAusfuehren('bearbeiten') // not reported
    })

    expect(alt).not.toHaveBeenCalled()
    expect(aktuell).toHaveBeenCalledTimes(1)
    expect(gesperrt).not.toHaveBeenCalled()
  })

  it('resets everything when the page is left - no stale buttons', () => {
    const ausfuehren = vi.fn()
    const seite = aufbauen({
      aktionen: { neu: { ausfuehren, verfuegbar: true } },
      anzahl: '4 Wohnungen',
      detailtitel: 'WE 03',
      ungespeichert: true,
    })
    expect(zustand.ungespeichert).toBe(true)

    seite.neu()

    expect(zustand.aktionen).toEqual({})
    expect(zustand.anzahl).toBeNull()
    expect(zustand.detailtitel).toBeNull()
    expect(zustand.ungespeichert).toBe(false)
    act(() => zustand.aktionAusfuehren('neu'))
    expect(ausfuehren).not.toHaveBeenCalled()
  })

  it('locks a running action until it has finished, also when it fails (EC-9)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let fertig!: () => void
    let scheitern!: (grund: Error) => void
    const ausfuehren = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((ok) => (fertig = ok)))
      .mockImplementationOnce(() => new Promise<void>((_, nein) => (scheitern = nein)))
    aufbauen({ aktionen: { aktualisieren: { ausfuehren, verfuegbar: true } } })

    act(() => {
      zustand.aktionAusfuehren('aktualisieren')
      zustand.aktionAusfuehren('aktualisieren')
    })
    expect(ausfuehren).toHaveBeenCalledTimes(1)
    expect(zustand.laufendeAktionen).toEqual(['aktualisieren'])

    await act(async () => fertig())
    expect(zustand.laufendeAktionen).toEqual([])

    act(() => zustand.aktionAusfuehren('aktualisieren'))
    expect(ausfuehren).toHaveBeenCalledTimes(2)
    await act(async () => scheitern(new Error('kaputt')))
    expect(zustand.laufendeAktionen).toEqual([])
  })
})

describe('Bestätigung', () => {
  it('shows the text and returns to "Bereit" after 10 seconds (AC-22)', () => {
    vi.useFakeTimers()
    aufbauen()

    act(() => rahmen.bestaetigen('Wohnung gespeichert.'))
    expect(zustand.statustext).toBe('Wohnung gespeichert.')

    act(() => void vi.advanceTimersByTime(9_999))
    expect(zustand.statustext).toBe('Wohnung gespeichert.')
    act(() => void vi.advanceTimersByTime(1))
    expect(zustand.statustext).toBe('Bereit')
  })

  it('replaces the previous one at once and restarts the 10 seconds (AC-22)', () => {
    vi.useFakeTimers()
    aufbauen()

    act(() => rahmen.bestaetigen('Wohnung gespeichert.'))
    act(() => void vi.advanceTimersByTime(8_000))
    act(() => rahmen.bestaetigen('Mieter gespeichert.'))
    expect(zustand.statustext).toBe('Mieter gespeichert.')

    act(() => void vi.advanceTimersByTime(8_000))
    expect(zustand.statustext).toBe('Mieter gespeichert.')
    act(() => void vi.advanceTimersByTime(2_000))
    expect(zustand.statustext).toBe('Bereit')
  })

  it('cuts a confirmation at 120 characters', () => {
    aufbauen()
    act(() => rahmen.bestaetigen('x'.repeat(300)))
    expect(zustand.statustext).toHaveLength(120)
  })
})

describe('Laden', () => {
  it('shows "Bitte warten…" while at least one loading runs, then the previous text (AC-23)', () => {
    aufbauen()
    act(() => rahmen.bestaetigen('Wohnung gespeichert.'))

    let endeA!: () => void
    let endeB!: () => void
    act(() => {
      endeA = rahmen.ladenBeginnen()
      endeB = rahmen.ladenBeginnen()
    })
    expect(zustand.laedt).toBe(true)
    expect(zustand.statustext).toBe('Bitte warten…')

    act(() => {
      endeA()
      endeA() // ending twice counts once
    })
    expect(zustand.laedt).toBe(true)

    act(() => endeB())
    expect(zustand.laedt).toBe(false)
    expect(zustand.statustext).toBe('Wohnung gespeichert.')
  })

  it('useRahmenLaden reports loading for as long as it is active and on unmount ends it', () => {
    function Lader({ aktiv }: { aktiv: boolean }) {
      useRahmenLaden(aktiv)
      return null
    }
    const seite = aufbauen(undefined, <Lader aktiv />)
    expect(zustand.laedt).toBe(true)

    seite.neu(undefined, <Lader aktiv={false} />)
    expect(zustand.laedt).toBe(false)

    seite.neu(undefined, <Lader aktiv />)
    expect(zustand.laedt).toBe(true)
    seite.neu()
    expect(zustand.laedt).toBe(false)
  })
})

describe('Verbindung', () => {
  it('shows the hint while offline and "Bereit" again afterwards (AC-33)', () => {
    aufbauen()

    verbindung(false)
    expect(zustand.online).toBe(false)
    expect(zustand.statustext).toBe(OFFLINE)

    verbindung(true)
    expect(zustand.online).toBe(true)
    expect(zustand.statustext).toBe('Bereit')
  })

  it('ends running loading indications when the connection is lost (EC-10)', () => {
    aufbauen()
    let ende!: () => void
    act(() => {
      ende = rahmen.ladenBeginnen()
    })

    verbindung(false)
    expect(zustand.laedt).toBe(false)
    expect(zustand.statustext).toBe(OFFLINE)

    verbindung(true)
    expect(zustand.laedt).toBe(false)
    expect(zustand.statustext).toBe('Bereit')

    // The late end of the aborted loading must not eat a new one.
    let neuesEnde!: () => void
    act(() => {
      neuesEnde = rahmen.ladenBeginnen()
      ende()
    })
    expect(zustand.laedt).toBe(true)
    act(() => neuesEnde())
    expect(zustand.laedt).toBe(false)
  })
})

describe('Navigation', () => {
  it('shows the destination at once and navigates (AC-35)', () => {
    const seite = aufbauen({ detailtitel: 'WE 03' })

    act(() => rahmen.navigieren('/konto'))

    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
    expect(zustand.pfad).toBe('/konto')
    expect(zustand.detailtitel).toBeNull()
    expect(zustand.laedt).toBe(true)
    expect(zustand.statustext).toBe('Bitte warten…')

    nav.pfad = '/konto'
    seite.neu()
    expect(zustand.pfad).toBe('/konto')
    expect(zustand.laedt).toBe(false)
    expect(zustand.statustext).toBe('Bereit')
  })

  it('forgets the destination once it is reached - also after going back (AC-9)', () => {
    const seite = aufbauen()
    act(() => rahmen.navigieren('/konto'))
    nav.pfad = '/konto'
    seite.neu()

    // "Zurück" in the browser: the old path is current again.
    nav.pfad = '/wohnungen'
    seite.neu()
    expect(zustand.pfad).toBe('/wohnungen')
    expect(zustand.laedt).toBe(false)

    // The same destination can be chosen again.
    act(() => rahmen.navigieren('/konto'))
    expect(nav.push).toHaveBeenCalledTimes(2)
    expect(zustand.pfad).toBe('/konto')
  })

  it('ignores the view that is already shown (EC-1)', () => {
    aufbauen()
    act(() => rahmen.navigieren('/wohnungen'))
    expect(nav.push).not.toHaveBeenCalled()
    expect(zustand.laedt).toBe(false)
  })

  it('navigates only once on quick repeated clicks (EC-9)', () => {
    aufbauen()
    act(() => {
      rahmen.navigieren('/konto')
      rahmen.navigieren('/konto')
    })
    act(() => rahmen.navigieren('/konto'))
    expect(nav.push).toHaveBeenCalledTimes(1)
  })
})

describe('Ungespeicherte Änderungen', () => {
  it('asks before navigating; "Abbrechen" stays, "Verwerfen" goes (AC-27)', () => {
    aufbauen({ ungespeichert: true })

    act(() => rahmen.navigieren('/konto'))
    expect(zustand.rueckfrageOffen).toBe(true)
    expect(nav.push).not.toHaveBeenCalled()
    expect(zustand.pfad).toBe('/wohnungen')

    act(() => zustand.rueckfrageBeantworten(false))
    expect(zustand.rueckfrageOffen).toBe(false)
    expect(nav.push).not.toHaveBeenCalled()
    expect(zustand.ungespeichert).toBe(true)
    expect(zustand.istUngespeichert()).toBe(true)

    act(() => rahmen.navigieren('/konto'))
    act(() => zustand.rueckfrageBeantworten(true))
    expect(zustand.rueckfrageOffen).toBe(false)
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
    expect(zustand.istUngespeichert()).toBe(false)
  })

  it('does not ask when nothing is unsaved (AC-29)', () => {
    aufbauen({ ungespeichert: false })
    act(() => rahmen.navigieren('/konto'))
    act(() => zustand.abmelden())
    expect(zustand.rueckfrageOffen).toBe(false)
    expect(nav.push).toHaveBeenCalledTimes(1)
    expect(abmelden).toHaveBeenCalledTimes(1)
  })

  it('runs the cancel handler of an explicitly asked question (back button)', () => {
    aufbauen({ ungespeichert: true })
    const weiter = vi.fn()
    const abbrechen = vi.fn()

    act(() => zustand.rueckfrageStellen(weiter, abbrechen))
    act(() => zustand.rueckfrageBeantworten(false))
    expect(abbrechen).toHaveBeenCalledTimes(1)
    expect(weiter).not.toHaveBeenCalled()

    act(() => zustand.rueckfrageStellen(weiter, abbrechen))
    act(() => zustand.rueckfrageBeantworten(true))
    expect(weiter).toHaveBeenCalledTimes(1)
    expect(abbrechen).toHaveBeenCalledTimes(1)
  })

  it('"ohne Rückfrage verlassen" removes the question and closes an open dialog (EC-3)', () => {
    aufbauen({ ungespeichert: true })
    act(() => rahmen.navigieren('/konto'))
    expect(zustand.rueckfrageOffen).toBe(true)

    act(() => rahmen.ohneRueckfrageVerlassen())

    expect(zustand.rueckfrageOffen).toBe(false)
    expect(zustand.istUngespeichert()).toBe(false)
    expect(zustand.ungespeichert).toBe(false)
    act(() => rahmen.navigieren('/konto'))
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
  })

  it('asks again on the next page that reports unsaved changes', () => {
    const seite = aufbauen({ ungespeichert: true })
    act(() => rahmen.ohneRueckfrageVerlassen())
    seite.neu()
    seite.neu({ ungespeichert: true })
    expect(zustand.istUngespeichert()).toBe(true)
  })
})

describe('Abmelden', () => {
  it('tells the session guard first and signs out once (AC-15, EC-9)', async () => {
    const reihenfolge: string[] = []
    const vorher = () => reihenfolge.push('andere Tabs')
    abmelden.mockImplementation(async () => void reihenfolge.push('abmelden'))
    function Waechter() {
      useRahmenVorAbmelden(vorher)
      return null
    }
    aufbauen(undefined, <Waechter />)

    await act(async () => {
      zustand.abmelden()
      zustand.abmelden()
    })

    expect(reihenfolge).toEqual(['andere Tabs', 'abmelden'])
  })

  it('asks while unsaved and signs out on "Verwerfen" (AC-27, EC-3)', async () => {
    aufbauen({ ungespeichert: true })

    act(() => zustand.abmelden())
    expect(zustand.rueckfrageOffen).toBe(true)
    expect(abmelden).not.toHaveBeenCalled()

    act(() => zustand.rueckfrageBeantworten(false))
    expect(abmelden).not.toHaveBeenCalled()

    act(() => zustand.abmelden())
    await act(async () => zustand.rueckfrageBeantworten(true))
    expect(abmelden).toHaveBeenCalledTimes(1)
  })
})

describe('RahmenLink', () => {
  it('is a real link that navigates through the frame', () => {
    aufbauen(undefined, <RahmenLink href="/konto">Konto</RahmenLink>)
    const link = screen.getByRole('link', { name: 'Konto' })
    expect(link).toHaveAttribute('href', '/konto')

    fireEvent.click(link)
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/konto')
  })

  it('asks first while unsaved (AC-27)', () => {
    aufbauen({ ungespeichert: true }, <RahmenLink href="/konto">Konto</RahmenLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Konto' }))
    expect(zustand.rueckfrageOffen).toBe(true)
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('leaves "open in a new tab" to the browser', () => {
    aufbauen({ ungespeichert: true }, <RahmenLink href="/konto">Konto</RahmenLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Konto' }), { ctrlKey: true })
    expect(zustand.rueckfrageOffen).toBe(false)
    expect(nav.push).not.toHaveBeenCalled()
  })
})

describe('außerhalb des Rahmens', () => {
  it('offers an interface that does nothing, so feature code runs without the frame', () => {
    function Frei() {
      const frei = useRahmen()
      useRahmenBereich({ ungespeichert: true })
      useRahmenLaden(true)
      frei.bestaetigen('x')
      frei.ohneRueckfrageVerlassen()
      frei.navigieren('/konto')
      return <p>ohne Rahmen</p>
    }
    render(<Frei />)
    expect(screen.getByText('ohne Rahmen')).toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('refuses to render a bar without the frame', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Leiste() {
      useRahmenZustand()
      return null
    }
    expect(() => render(<Leiste />)).toThrow('RahmenKontext')
  })
})
