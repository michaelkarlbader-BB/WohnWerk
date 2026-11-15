import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Window } from './window'

describe('Window', () => {
  it('shows the title as heading of a labelled window (AC-1)', () => {
    render(<Window title="WohnWerk – Wohnungen">Inhalt</Window>)

    const titel = screen.getByRole('heading', { level: 1, name: 'WohnWerk – Wohnungen' })
    expect(screen.getByRole('region', { name: 'WohnWerk – Wohnungen' })).toContainElement(titel)
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
  })

  it('places buttons left and right of the title inside the title bar (AC-3, AC-24)', () => {
    render(
      <Window
        title="WohnWerk – Wohnungen"
        titelLinks={<button type="button">Menü</button>}
        titelRechts={<button type="button">Maximieren</button>}
      >
        Inhalt
      </Window>
    )

    const leiste = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement
    const reihenfolge = Array.from(leiste.children).map((kind) => kind.textContent)
    expect(reihenfolge).toEqual(['Menü', 'WohnWerk – Wohnungen', 'Maximieren'])
  })

  it('keeps the title in one line so buttons are never pushed away (EC-5)', () => {
    render(
      <Window title={'Sehr langer Titel '.repeat(20)} titelRechts={<button type="button">Max</button>}>
        Inhalt
      </Window>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('truncate', 'min-w-0', 'flex-1')
  })

  it('draws no title bar and no frame of its own when embedded, but stays named (AC-14)', () => {
    render(
      <Window title="WohnWerk – Konto" variante="eingebettet" statusText="Gespeichert.">
        Inhalt
      </Window>
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    const bereich = screen.getByRole('region', { name: 'WohnWerk – Konto' })
    expect(bereich).not.toHaveClass('edge-raised')
    expect(bereich).toHaveTextContent('Inhalt')
    expect(screen.getByRole('status')).toHaveTextContent('Gespeichert.')
  })

  it('renders the status line only when a status text is passed', () => {
    const { rerender } = render(<Window title="T">Inhalt</Window>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(
      <Window title="T" statusText="">
        Inhalt
      </Window>
    )
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
