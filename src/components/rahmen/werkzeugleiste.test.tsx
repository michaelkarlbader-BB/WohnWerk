import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RahmenKontext, useRahmenBereich, type BereichEinrichtung } from './rahmen-kontext'
import { Werkzeugleiste } from './werkzeugleiste'

vi.mock('next/navigation', () => ({
  usePathname: () => '/wohnungen',
  useRouter: () => ({ push: vi.fn() }),
}))

const abmelden = vi.fn<() => Promise<void>>()

function Seite(einrichtung: BereichEinrichtung) {
  useRahmenBereich(einrichtung)
  return null
}

function aufbauen(seite?: BereichEinrichtung) {
  const baum = (s?: BereichEinrichtung) => (
    <RahmenKontext abmelden={abmelden}>
      {s && <Seite {...s} />}
      <Werkzeugleiste />
    </RahmenKontext>
  )
  const { rerender } = render(baum(seite))
  return { neu: (s?: BereichEinrichtung) => rerender(baum(s)) }
}

function knoepfe(): string[] {
  return within(screen.getByRole('toolbar', { name: 'Werkzeugleiste' }))
    .queryAllByRole('button')
    .map((knopf) => knopf.getAttribute('aria-label') ?? '')
}

beforeEach(() => {
  abmelden.mockReset()
})

describe('Werkzeugleiste', () => {
  it('is an empty bar for an area without actions (AC-17)', () => {
    aufbauen()
    expect(screen.getByRole('toolbar', { name: 'Werkzeugleiste' })).toBeInTheDocument()
    expect(knoepfe()).toEqual([])
  })

  it('shows exactly the reported actions in a fixed order (AC-17)', () => {
    const aktion = { ausfuehren: vi.fn(), verfuegbar: true }
    const seite = aufbauen({ aktionen: { aktualisieren: aktion, neu: aktion } })
    expect(knoepfe()).toEqual(['Neu', 'Aktualisieren'])

    seite.neu({ aktionen: { loeschen: aktion, bearbeiten: aktion, neu: aktion, aktualisieren: aktion } })
    expect(knoepfe()).toEqual(['Neu', 'Bearbeiten', 'Löschen', 'Aktualisieren'])

    seite.neu()
    expect(knoepfe()).toEqual([])
  })

  it('greys out an action that is not available right now (AC-13, AC-17)', () => {
    const loeschen = vi.fn()
    aufbauen({
      aktionen: {
        neu: { ausfuehren: vi.fn(), verfuegbar: true },
        loeschen: { ausfuehren: loeschen, verfuegbar: false },
      },
    })

    expect(screen.getByRole('button', { name: 'Neu' })).toBeEnabled()
    const knopf = screen.getByRole('button', { name: 'Löschen' })
    expect(knopf).toBeDisabled()
    fireEvent.click(knopf)
    expect(loeschen).not.toHaveBeenCalled()
  })

  it('runs the action of the page on click (AC-13)', () => {
    const neu = vi.fn()
    aufbauen({ aktionen: { neu: { ausfuehren: neu, verfuegbar: true } } })
    fireEvent.click(screen.getByRole('button', { name: 'Neu' }))
    expect(neu).toHaveBeenCalledTimes(1)
  })

  it('locks the button while its action runs (EC-9)', async () => {
    let fertig!: () => void
    const aktualisieren = vi.fn(() => new Promise<void>((ok) => (fertig = ok)))
    aufbauen({ aktionen: { aktualisieren: { ausfuehren: aktualisieren, verfuegbar: true } } })
    const knopf = screen.getByRole('button', { name: 'Aktualisieren' })

    fireEvent.click(knopf)
    fireEvent.click(knopf)
    expect(aktualisieren).toHaveBeenCalledTimes(1)
    expect(knopf).toBeDisabled()
    expect(knopf).toHaveAttribute('aria-busy', 'true')

    await act(async () => fertig())
    expect(knopf).toBeEnabled()
    expect(knopf).not.toHaveAttribute('aria-busy')
  })

  it('uses the shadcn button, which globals.css sizes to 44 px on the phone (AC-24)', () => {
    aufbauen({ aktionen: { neu: { ausfuehren: vi.fn(), verfuegbar: true } } })
    // globals.css recognises the shadcn Button by these base classes.
    expect(screen.getByRole('button', { name: 'Neu' })).toHaveClass(
      'gap-2',
      'whitespace-nowrap',
      'ring-offset-background'
    )
    expect(screen.getByRole('toolbar')).toHaveClass('min-h-11')
  })
})
