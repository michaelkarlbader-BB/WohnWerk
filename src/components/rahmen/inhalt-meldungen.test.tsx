import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LadePlatzhalter, NichtGefunden, Schiefgelaufen } from './inhalt-meldungen'
import { RahmenKontext, useRahmenZustand } from './rahmen-kontext'

const nav = vi.hoisted(() => ({ pfad: '/gibt-es-nicht', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pfad,
  useRouter: () => ({ push: nav.push }),
}))

const abmelden = vi.fn<() => Promise<void>>()

function Status() {
  const { statustext, laedt } = useRahmenZustand()
  return <output data-laedt={laedt}>{statustext}</output>
}

function imRahmen(inhalt: ReactNode) {
  return (
    <RahmenKontext abmelden={abmelden}>
      <Status />
      {inhalt}
    </RahmenKontext>
  )
}

beforeEach(() => {
  nav.pfad = '/gibt-es-nicht'
  nav.push.mockReset()
})

describe('NichtGefunden', () => {
  it('says that the page does not exist and leads to the apartments (AC-10, EC-2)', () => {
    render(imRahmen(<NichtGefunden />))
    expect(screen.getByText('Diese Seite gibt es nicht.')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Zu den Wohnungen' })
    expect(link).toHaveAttribute('href', '/wohnungen')
    fireEvent.click(link)
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/wohnungen')
  })
})

describe('Schiefgelaufen', () => {
  it('shows the message with both ways out and no technical details (AC-32)', () => {
    const onErneut = vi.fn()
    render(imRahmen(<Schiefgelaufen onErneut={onErneut} />))

    const meldung = screen.getByRole('alert')
    expect(meldung).toHaveTextContent('Hier ist etwas schiefgelaufen.')
    expect(meldung.textContent).toBe('FehlerHier ist etwas schiefgelaufen.Erneut versuchenZu den Wohnungen')
    expect(screen.getByRole('link', { name: 'Zu den Wohnungen' })).toHaveAttribute('href', '/wohnungen')

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(onErneut).toHaveBeenCalledTimes(1)
  })
})

describe('LadePlatzhalter', () => {
  it('reports loading for as long as it is visible (AC-23)', () => {
    const { rerender } = render(imRahmen(<LadePlatzhalter />))
    expect(screen.getByRole('status')).toHaveTextContent('Bitte warten…')
    expect(screen.getByRole('status')).toHaveAttribute('data-laedt', 'true')

    rerender(imRahmen(<p>Inhalt</p>))
    expect(screen.getByRole('status')).toHaveTextContent('Bereit')
    expect(screen.getByRole('status')).toHaveAttribute('data-laedt', 'false')
  })
})
