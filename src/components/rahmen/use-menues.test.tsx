import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Menue, MenueEintrag } from './navigation.rules'
import { RahmenKontext, useRahmenBereich, type BereichEinrichtung } from './rahmen-kontext'
import { useMenues } from './use-menues'

const h = vi.hoisted(() => ({
  pfad: '/wohnungen',
  push: vi.fn(),
  theme: undefined as string | undefined,
  setTheme: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pfad,
  useRouter: () => ({ push: h.push }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: h.theme, setTheme: h.setTheme }) }))

const abmelden = vi.fn<() => Promise<void>>()
const onUeber = vi.fn()

function Seite(einrichtung: BereichEinrichtung) {
  useRahmenBereich(einrichtung)
  return null
}

function aufbauen(seite: BereichEinrichtung = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RahmenKontext abmelden={abmelden}>
      <Seite {...seite} />
      {children}
    </RahmenKontext>
  )
  return renderHook(() => useMenues(onUeber), { wrapper })
}

function eintrag(liste: Menue[], menue: string, beschriftung: string): MenueEintrag {
  const gefunden = liste
    .find((m) => m.titel === menue)
    ?.eintraege.find((e) => e.beschriftung === beschriftung)
  if (!gefunden) throw new Error(`Kein Eintrag ${menue} → ${beschriftung}`)
  return gefunden
}

beforeEach(() => {
  h.pfad = '/wohnungen'
  h.theme = undefined
  h.push.mockReset()
  h.setTheme.mockReset()
  onUeber.mockReset()
  abmelden.mockReset().mockResolvedValue(undefined)
})

describe('useMenues', () => {
  it('reflects the actions of the page and the active area (AC-13)', () => {
    const { result } = aufbauen({ aktionen: { neu: { ausfuehren: vi.fn(), verfuegbar: true } } })
    expect(eintrag(result.current.menues, 'Datei', 'Neu…').verfuegbar).toBe(true)
    expect(eintrag(result.current.menues, 'Bearbeiten', 'Löschen…').verfuegbar).toBe(false)
    expect(eintrag(result.current.menues, 'Ansicht', 'Wohnungen')).toMatchObject({ markiert: true })
  })

  it('runs the action of the page - the same one the toolbar runs (AC-13)', () => {
    const ausfuehren = vi.fn()
    const { result } = aufbauen({ aktionen: { neu: { ausfuehren, verfuegbar: true } } })
    act(() => result.current.ausfuehren(eintrag(result.current.menues, 'Datei', 'Neu…')))
    expect(ausfuehren).toHaveBeenCalledTimes(1)
  })

  it('locks the entry of a running action (EC-9)', async () => {
    let fertig!: () => void
    const ausfuehren = vi.fn(() => new Promise<void>((ok) => (fertig = ok)))
    const { result } = aufbauen({ aktionen: { aktualisieren: { ausfuehren, verfuegbar: true } } })

    act(() => result.current.ausfuehren(eintrag(result.current.menues, 'Ansicht', 'Aktualisieren')))
    expect(eintrag(result.current.menues, 'Ansicht', 'Aktualisieren').verfuegbar).toBe(false)

    await act(async () => fertig())
    expect(eintrag(result.current.menues, 'Ansicht', 'Aktualisieren').verfuegbar).toBe(true)
  })

  it('opens destinations, the about dialog and signs out (AC-14, AC-15, AC-16)', async () => {
    const { result } = aufbauen()

    act(() => result.current.ausfuehren(eintrag(result.current.menues, 'Extras', 'Konto…')))
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/konto')

    act(() => result.current.ausfuehren(eintrag(result.current.menues, '?', 'Über WohnWerk')))
    expect(onUeber).toHaveBeenCalledTimes(1)

    await act(async () =>
      result.current.ausfuehren(eintrag(result.current.menues, 'Datei', 'Abmelden'))
    )
    expect(abmelden).toHaveBeenCalledTimes(1)
  })

  it('does nothing for entries that are greyed out (AC-7)', () => {
    const { result } = aufbauen()
    act(() => {
      result.current.ausfuehren(eintrag(result.current.menues, 'Ansicht', 'Mieter'))
      result.current.ausfuehren(eintrag(result.current.menues, 'Extras', 'Export & Import…'))
      result.current.ausfuehren(eintrag(result.current.menues, 'Datei', 'Neu…'))
    })
    expect(h.push).not.toHaveBeenCalled()
  })

  it('reports the chosen appearance, "system" by default (AC-18, AC-19)', () => {
    expect(aufbauen().result.current.darstellung).toBe('system')
    h.theme = 'dark'
    expect(aufbauen().result.current.darstellung).toBe('dark')
    h.theme = 'etwas-anderes'
    expect(aufbauen().result.current.darstellung).toBe('system')
  })

  it('switches the appearance and ignores unknown values (AC-19)', () => {
    const { result } = aufbauen()
    act(() => result.current.darstellungWaehlen('dark'))
    expect(h.setTheme).toHaveBeenCalledExactlyOnceWith('dark')
    act(() => result.current.darstellungWaehlen('pink'))
    expect(h.setTheme).toHaveBeenCalledTimes(1)
  })
})
