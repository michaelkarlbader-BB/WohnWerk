import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RahmenKontext, useRahmenBereich, type BereichEinrichtung } from './rahmen-kontext'
import { Schublade } from './schublade'

const h = vi.hoisted(() => ({
  pfad: '/wohnungen',
  push: vi.fn(),
  theme: 'system' as string | undefined,
  setTheme: vi.fn(),
  mobil: true,
}))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pfad,
  useRouter: () => ({ push: h.push }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: h.theme, setTheme: h.setTheme }) }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => h.mobil }))

const abmelden = vi.fn<() => Promise<void>>()
const onUeber = vi.fn()
const onOffenChange = vi.fn()
let pushState: ReturnType<typeof vi.spyOn>
let back: ReturnType<typeof vi.spyOn>

function Seite(einrichtung: BereichEinrichtung) {
  useRahmenBereich(einrichtung)
  return null
}

function aufbauen(offen = true, seite: BereichEinrichtung = {}) {
  const baum = (o: boolean) => (
    <RahmenKontext abmelden={abmelden}>
      <Seite {...seite} />
      <Schublade offen={o} onOffenChange={onOffenChange} onUeber={onUeber} />
    </RahmenKontext>
  )
  const { rerender } = render(baum(offen))
  return { setzen: (o: boolean) => rerender(baum(o)) }
}

/** The browser went back: the drawer's entry is gone. */
function zurueckImBrowser() {
  act(() => {
    window.history.replaceState(null, '', window.location.href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

function gruppe(name: string) {
  return screen.getByRole('region', { name })
}

function texte(bereich: HTMLElement): string[] {
  return within(bereich)
    .getAllByRole('button')
    .map((knopf) => knopf.textContent ?? '')
}

beforeEach(() => {
  h.pfad = '/wohnungen'
  h.theme = 'system'
  h.mobil = true
  h.push.mockReset()
  h.setTheme.mockReset()
  onUeber.mockReset()
  onOffenChange.mockReset()
  abmelden.mockReset().mockResolvedValue(undefined)
  window.history.replaceState(null, '', '/wohnungen')
  pushState = vi.spyOn(window.history, 'pushState')
  back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Schublade', () => {
  it('shows nothing while closed and touches no history', () => {
    aufbauen(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(pushState).not.toHaveBeenCalled()
  })

  it('shows the areas and all menu entries of AC-11, grouped (AC-25)', () => {
    aufbauen()
    expect(screen.getByRole('dialog', { name: 'Menü' })).toBeInTheDocument()

    expect(texte(screen.getByRole('navigation', { name: 'Bereiche' }))).toEqual([
      'Wohnungen',
      'Mieter',
      'Mietverträge',
      'Darlehen',
    ])
    expect(texte(gruppe('Datei'))).toEqual(['Neu…', 'Abmelden'])
    expect(texte(gruppe('Bearbeiten'))).toEqual(['Bearbeiten…', 'Löschen…'])
    expect(texte(gruppe('Ansicht'))).toEqual(['Wohnungen', 'Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren'])
    expect(texte(gruppe('Extras'))).toEqual(['Export & Import…', 'Konto…'])
    expect(texte(gruppe('Hilfe'))).toEqual(['Über WohnWerk', 'Datenschutz', 'Impressum'])
    expect(
      within(screen.getByRole('radiogroup', { name: 'Darstellung' }))
        .getAllByRole('radio')
        .map((option) => option.textContent?.replace('•', ''))
    ).toEqual(['Hell', 'Dunkel', 'Wie System'])
  })

  it('gives every entry at least 44 px height (AC-24, AC-26)', () => {
    aufbauen()
    // The sheet's built-in close button is hidden by CSS and not an entry.
    const alle = [
      ...within(screen.getByRole('dialog'))
        .getAllByRole('button')
        .filter((knopf) => knopf.textContent !== 'Close'),
      ...screen.getAllByRole('radio'),
    ]
    expect(alle.length).toBeGreaterThanOrEqual(20)
    for (const knopf of alle) expect(knopf).toHaveClass('min-h-11', 'w-full')
  })

  it('greys out the same entries as the menu bar; they do nothing (AC-7, AC-25)', () => {
    aufbauen()
    const bereiche = screen.getByRole('navigation', { name: 'Bereiche' })
    expect(within(bereiche).getByRole('button', { name: 'Wohnungen' })).toBeEnabled()
    for (const name of ['Mieter', 'Mietverträge', 'Darlehen']) {
      expect(within(bereiche).getByRole('button', { name })).toBeDisabled()
    }
    expect(within(gruppe('Datei')).getByRole('button', { name: 'Neu…' })).toBeDisabled()
    expect(within(gruppe('Extras')).getByRole('button', { name: 'Export & Import…' })).toBeDisabled()
    expect(within(gruppe('Extras')).getByRole('button', { name: 'Konto…' })).toBeEnabled()

    fireEvent.click(within(bereiche).getByRole('button', { name: 'Mieter' }))
    expect(h.push).not.toHaveBeenCalled()
    expect(onOffenChange).not.toHaveBeenCalled()
  })

  it('marks the active area', () => {
    aufbauen()
    const wohnungen = within(screen.getByRole('navigation', { name: 'Bereiche' })).getByRole('button', {
      name: 'Wohnungen',
    })
    expect(wohnungen).toHaveAttribute('aria-current', 'page')
  })

  it('adds one history entry of the same address when it opens', () => {
    const schublade = aufbauen(false)
    schublade.setzen(true)
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/wohnungen')
    expect(window.history.state).toMatchObject({ wohnwerkMarke: 'schublade' })
  })

  it('keeps one entry and stays open when its effects run twice (React StrictMode)', () => {
    render(
      <StrictMode>
        <RahmenKontext abmelden={abmelden}>
          <Schublade offen onOffenChange={onOffenChange} onUeber={onUeber} />
        </RahmenKontext>
      </StrictMode>
    )
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()
    expect(onOffenChange).not.toHaveBeenCalled()
  })

  it('"Zurück" closes it without any action (AC-25)', () => {
    aufbauen()
    zurueckImBrowser()
    expect(onOffenChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(h.push).not.toHaveBeenCalled()
    expect(back).not.toHaveBeenCalled()
  })

  it('Esc closes it without any action (AC-30)', () => {
    aufbauen()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onOffenChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(h.push).not.toHaveBeenCalled()
  })

  it('takes its history entry out again when it is closed in another way', () => {
    const schublade = aufbauen()
    schublade.setzen(false)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('runs a chosen entry only after its history entry is gone, and closes (AC-25)', () => {
    aufbauen()

    fireEvent.click(within(gruppe('Extras')).getByRole('button', { name: 'Konto…' }))
    expect(back).toHaveBeenCalledTimes(1)
    expect(h.push).not.toHaveBeenCalled()

    zurueckImBrowser()
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/konto')
    expect(onOffenChange).toHaveBeenCalledWith(false)
    expect(onOffenChange).not.toHaveBeenCalledWith(true)
  })

  it('still runs the entry when the browser does not report the step back', () => {
    vi.useFakeTimers()
    aufbauen()
    fireEvent.click(within(gruppe('Extras')).getByRole('button', { name: 'Konto…' }))
    expect(h.push).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(300))
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/konto')
    expect(onOffenChange).toHaveBeenCalledWith(false)
  })

  it('runs an entry once on quick repeated taps (EC-9)', () => {
    aufbauen()
    const konto = within(gruppe('Extras')).getByRole('button', { name: 'Konto…' })
    fireEvent.click(konto)
    fireEvent.click(konto)
    expect(back).toHaveBeenCalledTimes(1)

    zurueckImBrowser()
    expect(h.push).toHaveBeenCalledTimes(1)
  })

  it('runs page actions, the about dialog and the sign-out (AC-13, AC-15, AC-16)', () => {
    const neu = vi.fn()
    aufbauen(true, { aktionen: { neu: { ausfuehren: neu, verfuegbar: true } } })

    fireEvent.click(within(gruppe('Datei')).getByRole('button', { name: 'Neu…' }))
    zurueckImBrowser()
    expect(neu).toHaveBeenCalledTimes(1)

    // Without the history entry on top the entry runs at once.
    fireEvent.click(within(gruppe('Hilfe')).getByRole('button', { name: 'Über WohnWerk' }))
    expect(onUeber).toHaveBeenCalledTimes(1)

    fireEvent.click(within(gruppe('Datei')).getByRole('button', { name: 'Abmelden' }))
    expect(abmelden).toHaveBeenCalledTimes(1)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('offers the appearance as an option group with the current one checked (AC-19, AC-25)', () => {
    h.theme = 'dark'
    aufbauen()
    const optionen = screen.getAllByRole('radio')
    expect(optionen.map((option) => option.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])

    fireEvent.click(screen.getByRole('radio', { name: 'Hell' }))
    zurueckImBrowser()
    expect(h.setTheme).toHaveBeenCalledExactlyOnceWith('light')
    expect(onOffenChange).toHaveBeenCalledWith(false)
  })

  it('closes when the window becomes desktop width (EC-4)', () => {
    const schublade = aufbauen()
    expect(onOffenChange).not.toHaveBeenCalled()

    h.mobil = false
    schublade.setzen(true)
    expect(onOffenChange).toHaveBeenCalledExactlyOnceWith(false)
  })
})
