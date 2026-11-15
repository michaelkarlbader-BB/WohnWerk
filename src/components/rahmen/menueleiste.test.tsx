import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Menueleiste } from './menueleiste'
import { RahmenKontext, useRahmenBereich, type BereichEinrichtung } from './rahmen-kontext'

const h = vi.hoisted(() => ({
  pfad: '/wohnungen',
  push: vi.fn(),
  theme: 'system' as string | undefined,
  setTheme: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pfad,
  useRouter: () => ({ push: h.push }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: h.theme, setTheme: h.setTheme }) }))

const abmelden = vi.fn<() => Promise<void>>()
const onUeber = vi.fn()

// Radix menus use browser APIs that jsdom does not have.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function Seite(einrichtung: BereichEinrichtung) {
  useRahmenBereich(einrichtung)
  return null
}

function aufbauen(seite: BereichEinrichtung = {}) {
  render(
    <RahmenKontext abmelden={abmelden}>
      <Seite {...seite} />
      <Menueleiste onUeber={onUeber} />
    </RahmenKontext>
  )
}

function oeffnen(titel: string) {
  fireEvent.pointerDown(screen.getByRole('button', { name: titel }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  })
  return screen.getByRole('menu')
}

function texte(menue: HTMLElement): string[] {
  return within(menue)
    .getAllByRole('menuitem')
    .map((eintrag) => eintrag.textContent?.replace('•', '') ?? '')
}

beforeEach(() => {
  h.pfad = '/wohnungen'
  h.theme = 'system'
  h.push.mockReset()
  h.setTheme.mockReset()
  onUeber.mockReset()
  abmelden.mockReset().mockResolvedValue(undefined)
})

describe('Menueleiste', () => {
  it('has five menu titles, each a button of its own for the Tab key (AC-11, AC-30)', () => {
    aufbauen()
    const leiste = screen.getByRole('navigation', { name: 'Menü' })
    const titel = within(leiste).getAllByRole('button')
    expect(titel.map((knopf) => knopf.textContent)).toEqual(['Datei', 'Bearbeiten', 'Ansicht', 'Extras', '?'])
    for (const knopf of titel) {
      expect(knopf.tagName).toBe('BUTTON')
      expect(knopf).not.toHaveAttribute('tabindex', '-1')
    }
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the entries of AC-11 below each title', () => {
    aufbauen()
    const erwartet: [string, string[]][] = [
      ['Datei', ['Neu…', 'Abmelden']],
      ['Bearbeiten', ['Bearbeiten…', 'Löschen…']],
      ['Ansicht', ['Wohnungen', 'Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren', 'Darstellung']],
      ['Extras', ['Export & Import…', 'Konto…']],
      ['Hilfe', ['Über WohnWerk', 'Datenschutz', 'Impressum']],
    ]
    for (const [titel, eintraege] of erwartet) {
      const menue = oeffnen(titel)
      expect(texte(menue)).toEqual(eintraege)
      fireEvent.keyDown(menue, { key: 'Escape' })
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    }
  })

  it('greys out what is not built or not offered, and such entries do nothing (AC-7, AC-13)', () => {
    aufbauen()
    const ansicht = oeffnen('Ansicht')
    for (const name of ['Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren']) {
      expect(within(ansicht).getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true')
    }
    expect(within(ansicht).getByRole('menuitem', { name: 'Wohnungen' })).not.toHaveAttribute('aria-disabled')

    fireEvent.click(within(ansicht).getByRole('menuitem', { name: 'Mieter' }))
    expect(h.push).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('marks the active area (AC-6)', () => {
    aufbauen()
    const ansicht = oeffnen('Ansicht')
    expect(within(ansicht).getByRole('menuitem', { name: 'Wohnungen' })).toHaveAttribute('aria-current', 'page')
    expect(within(ansicht).getByRole('menuitem', { name: 'Mieter' })).not.toHaveAttribute('aria-current')
  })

  it('runs the action of the page once and closes the menu (AC-12, AC-13)', () => {
    const neu = vi.fn()
    aufbauen({ aktionen: { neu: { ausfuehren: neu, verfuegbar: true } } })

    fireEvent.click(within(oeffnen('Datei')).getByRole('menuitem', { name: 'Neu…' }))

    expect(neu).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the account page, signs out and shows the about dialog (AC-14, AC-15, AC-16)', () => {
    aufbauen()

    fireEvent.click(within(oeffnen('Extras')).getByRole('menuitem', { name: 'Konto…' }))
    expect(h.push).toHaveBeenCalledExactlyOnceWith('/konto')

    fireEvent.click(within(oeffnen('Hilfe')).getByRole('menuitem', { name: 'Über WohnWerk' }))
    expect(onUeber).toHaveBeenCalledTimes(1)

    fireEvent.click(within(oeffnen('Datei')).getByRole('menuitem', { name: 'Abmelden' }))
    expect(abmelden).toHaveBeenCalledTimes(1)
  })

  it('opens the legal pages (AC-16)', () => {
    aufbauen()
    fireEvent.click(within(oeffnen('Hilfe')).getByRole('menuitem', { name: 'Datenschutz' }))
    expect(h.push).toHaveBeenLastCalledWith('/datenschutz')
  })

  it('offers the appearance as a marked option group and switches it (AC-19)', () => {
    h.theme = 'light'
    aufbauen()
    const ansicht = oeffnen('Ansicht')

    fireEvent.click(within(ansicht).getByRole('menuitem', { name: 'Darstellung' }))
    const optionen = screen.getAllByRole('menuitemradio')
    expect(optionen.map((option) => option.textContent)).toEqual(['Hell', 'Dunkel', 'Wie System'])
    expect(optionen.map((option) => option.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Dunkel' }))
    expect(h.setTheme).toHaveBeenCalledExactlyOnceWith('dark')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on Esc without doing anything (AC-12, AC-30)', () => {
    const neu = vi.fn()
    aufbauen({ aktionen: { neu: { ausfuehren: neu, verfuegbar: true } } })
    fireEvent.keyDown(oeffnen('Datei'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(neu).not.toHaveBeenCalled()
  })

  it('opens with Enter from the keyboard (AC-30)', () => {
    aufbauen()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Datei' }), { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})
