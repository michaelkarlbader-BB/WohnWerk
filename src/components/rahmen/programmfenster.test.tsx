import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Programmfenster } from './programmfenster'
import { RahmenKontext, useRahmenBereich, type BereichEinrichtung } from './rahmen-kontext'

const h = vi.hoisted(() => ({ pfad: '/wohnungen', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => h.pfad,
  useRouter: () => ({ push: h.push }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'system', setTheme: vi.fn() }) }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }))

const abmelden = vi.fn<() => Promise<void>>()

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
  return <p>Inhalt der Seite</p>
}

function aufbauen(maximiertStart = false, seite: BereichEinrichtung = {}) {
  return render(
    <RahmenKontext abmelden={abmelden}>
      <Programmfenster maximiertStart={maximiertStart} nutzer="Erika Muster" version="1.2.3">
        <Seite {...seite} />
      </Programmfenster>
    </RahmenKontext>
  )
}

function fensterCookieGesetzt(): boolean {
  return document.cookie.split('; ').includes('wohnwerk-fenster=1')
}

beforeEach(() => {
  h.pfad = '/wohnungen'
  h.push.mockReset()
  document.cookie = 'wohnwerk-fenster=; Path=/; Max-Age=0'
  window.history.replaceState(null, '', '/wohnungen')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Aufbau', () => {
  it('shows title bar, menu bar, toolbar, area list, content and status bar (AC-1)', () => {
    aufbauen()

    const fenster = screen.getByRole('region', { name: 'WohnWerk – Wohnungen' })
    expect(within(fenster).getByRole('heading', { level: 1, name: 'WohnWerk – Wohnungen' })).toBeInTheDocument()
    expect(within(fenster).getByRole('navigation', { name: 'Menü' })).toBeInTheDocument()
    expect(within(fenster).getByRole('toolbar', { name: 'Werkzeugleiste' })).toBeInTheDocument()
    expect(within(fenster).getByRole('navigation', { name: 'Bereiche' })).toBeInTheDocument()
    expect(within(fenster).getByRole('main')).toHaveTextContent('Inhalt der Seite')
    expect(within(fenster).getByRole('status')).toHaveTextContent('Bereit')
    expect(within(fenster).getByText('Angemeldet: Erika Muster')).toBeInTheDocument()
  })

  it('names the area in the title bar, with the detail a page reports (AC-6, AC-14)', () => {
    h.pfad = '/konto'
    aufbauen()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WohnWerk – Konto')
  })

  it('adds the detail name a page reports to the title bar', () => {
    h.pfad = '/wohnungen/7c1e'
    aufbauen(false, { detailtitel: 'WE 03 – Musterstraße 5' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'WohnWerk – Wohnungen – WE 03 – Musterstraße 5'
    )
  })

  it('shows only the program name for an unknown address (AC-10)', () => {
    h.pfad = '/gibt-es-nicht'
    aufbauen()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^WohnWerk$/)
  })

  it('lets only the content scroll (AC-2)', () => {
    const { container } = aufbauen()
    const aussen = container.firstElementChild as HTMLElement
    expect(aussen).toHaveClass('rahmen-hoehe', 'overflow-hidden')
    expect(screen.getByRole('region', { name: 'WohnWerk – Wohnungen' })).toHaveClass('h-full')
    expect(screen.getByRole('main')).toHaveClass('overflow-auto', 'min-h-0', 'flex-1')
    for (const leiste of [
      screen.getByRole('navigation', { name: 'Menü' }),
      screen.getByRole('toolbar'),
      screen.getByRole('contentinfo'),
    ]) {
      expect(leiste).toHaveClass('shrink-0')
    }
  })

  it('switches between desktop and phone only through the breakpoint md (AC-24, EC-4)', () => {
    aufbauen()
    expect(screen.getByRole('button', { name: 'Menü öffnen' })).toHaveClass('md:hidden', 'size-11')
    expect(screen.getByRole('button', { name: 'Maximieren' })).toHaveClass('hidden', 'md:inline-flex')
    expect(screen.getByRole('navigation', { name: 'Menü' })).toHaveClass('hidden', 'md:flex')
    expect(screen.getByRole('navigation', { name: 'Bereiche' })).toHaveClass('hidden', 'md:block')
    // The page exists exactly once - nothing is drawn twice for the two layouts.
    expect(screen.getAllByText('Inhalt der Seite')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})

describe('Maximieren', () => {
  it('starts with the margin of the desktop surface (AC-1)', () => {
    const { container } = aufbauen()
    expect(container.firstElementChild).toHaveClass('md:p-4')
    expect(screen.getByRole('button', { name: 'Maximieren' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('fills the browser without reloading and remembers it in the cookie (AC-3)', () => {
    const { container } = aufbauen()

    fireEvent.click(screen.getByRole('button', { name: 'Maximieren' }))
    expect(container.firstElementChild).not.toHaveClass('md:p-4')
    expect(fensterCookieGesetzt()).toBe(true)
    const zurueck = screen.getByRole('button', { name: 'Wiederherstellen' })
    expect(zurueck).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(zurueck)
    expect(container.firstElementChild).toHaveClass('md:p-4')
    expect(fensterCookieGesetzt()).toBe(false)
    expect(screen.getByRole('button', { name: 'Maximieren' })).toBeInTheDocument()
  })

  it('is drawn maximised at once when the server read the cookie (AC-3)', () => {
    const { container } = aufbauen(true)
    expect(container.firstElementChild).not.toHaveClass('md:p-4')
    expect(screen.getByRole('button', { name: 'Wiederherstellen' })).toBeInTheDocument()
  })

  it('still works for this visit when storing fails, without an error (EC-7)', () => {
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { container } = aufbauen()

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Maximieren' }))).not.toThrow()
    expect(container.firstElementChild).not.toHaveClass('md:p-4')
    expect(screen.getByRole('button', { name: 'Wiederherstellen' })).toBeInTheDocument()
  })
})

describe('Schublade und Dialog', () => {
  it('opens the drawer from the menu button and keeps the page as it is (AC-24, AC-25)', async () => {
    aufbauen()
    const knopf = screen.getByRole('button', { name: 'Menü öffnen' })
    expect(knopf).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(knopf)

    expect(await screen.findByRole('dialog', { name: 'Menü' }, { timeout: 10_000 })).toBeInTheDocument()
    // The drawer covers the page, so the button is found by its label only.
    expect(screen.getByLabelText('Menü öffnen')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('Inhalt der Seite')).toHaveLength(1)
  })

  it('shows name and version in the dialog "Über WohnWerk" (AC-16)', async () => {
    aufbauen()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hilfe' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Über WohnWerk' }))

    const dialog = await screen.findByRole('dialog', { name: 'Über WohnWerk' }, { timeout: 10_000 })
    expect(dialog).toHaveTextContent('Version 1.2.3')
    expect(within(dialog).getByRole('link', { name: 'Datenschutz' })).toHaveAttribute('href', '/datenschutz')
    expect(within(dialog).getByRole('link', { name: 'Impressum' })).toHaveAttribute('href', '/impressum')

    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
