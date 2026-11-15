import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RahmenKontext,
  useRahmen,
  useRahmenBereich,
  type BereichEinrichtung,
  type RahmenSchnittstelle,
} from './rahmen-kontext'
import { Statusleiste } from './statusleiste'

vi.mock('next/navigation', () => ({
  usePathname: () => '/wohnungen',
  useRouter: () => ({ push: vi.fn() }),
}))

const OFFLINE = 'Keine Verbindung – Änderungen können nicht gespeichert werden.'
const abmelden = vi.fn<() => Promise<void>>()
let rahmen: RahmenSchnittstelle

function Seite(einrichtung: BereichEinrichtung) {
  const schnittstelle = useRahmen()
  useRahmenBereich(einrichtung)
  useEffect(() => {
    rahmen = schnittstelle
  })
  return null
}

function aufbauen(seite: BereichEinrichtung = {}, nutzer = 'Erika Muster') {
  render(
    <RahmenKontext abmelden={abmelden}>
      <Seite {...seite} />
      <Statusleiste nutzer={nutzer} />
    </RahmenKontext>
  )
}

function verbindung(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Statusleiste', () => {
  it('shows status text, count and the signed-in user from left to right (AC-21)', () => {
    aufbauen({ anzahl: '4 Wohnungen' })

    const leiste = screen.getByRole('contentinfo')
    expect(Array.from(leiste.children).map((feld) => feld.textContent)).toEqual([
      'Bereit',
      '4 Wohnungen',
      'Angemeldet: Erika Muster',
    ])
    expect(screen.getByRole('status')).toHaveTextContent('Bereit')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('leaves the count empty when the area reports none (AC-21)', () => {
    aufbauen()
    expect(screen.getByTestId('status-anzahl')).toBeEmptyDOMElement()
  })

  it('shows the e-mail address when there is no display name (AC-21)', () => {
    aufbauen({}, 'erika@example.org')
    expect(screen.getByText('Angemeldet: erika@example.org')).toBeInTheDocument()
  })

  it('shows a confirmation and "Bereit" again after 10 seconds (AC-22)', () => {
    vi.useFakeTimers()
    aufbauen()

    act(() => rahmen.bestaetigen('Wohnung gespeichert.'))
    expect(screen.getByRole('status')).toHaveTextContent('Wohnung gespeichert.')

    act(() => void vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('status')).toHaveTextContent('Bereit')
  })

  it('shows the segment progress bar and "Bitte warten…" while loading (AC-23)', () => {
    aufbauen()
    let ende!: () => void
    act(() => {
      ende = rahmen.ladenBeginnen()
    })

    expect(screen.getByRole('status')).toHaveTextContent('Bitte warten…')
    const balken = screen.getByRole('progressbar', { name: 'Ladevorgang' })
    expect(balken).toHaveClass('segment-fortschritt')
    expect(balken).not.toHaveAttribute('aria-valuenow') // indeterminate

    act(() => ende())
    expect(screen.getByRole('status')).toHaveTextContent('Bereit')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows the offline hint instead of an endless progress bar (AC-33, EC-10)', () => {
    aufbauen()
    act(() => {
      rahmen.ladenBeginnen()
    })

    verbindung(false)
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    verbindung(true)
    expect(screen.getByRole('status')).toHaveTextContent('Bereit')
  })

  it('cuts long texts with "…" in one line instead of wrapping (EC-5)', () => {
    const langerName = 'Dr. Maximiliane Alexandra von und zu Musterhausen-Beispielstadt'
    aufbauen({ anzahl: '4 Wohnungen' }, langerName)

    const nutzer = screen.getByText(`Angemeldet: ${langerName}`)
    expect(nutzer).toHaveClass('truncate', 'shrink-0', 'max-w-[40%]')
    expect(nutzer).toHaveAttribute('title', `Angemeldet: ${langerName}`)
    expect(screen.getByRole('status')).toHaveClass('truncate', 'min-w-0')
    expect(screen.getByTestId('status-anzahl')).toHaveClass('truncate')
  })

  it('shows only the status text on the phone (AC-24)', () => {
    aufbauen({ anzahl: '4 Wohnungen' })
    // Count and user appear from md upwards only.
    expect(screen.getByTestId('status-anzahl')).toHaveClass('hidden', 'md:block')
    expect(screen.getByText('Angemeldet: Erika Muster')).toHaveClass('hidden', 'md:block')
    expect(screen.getByRole('status')).not.toHaveClass('hidden')
  })
})
