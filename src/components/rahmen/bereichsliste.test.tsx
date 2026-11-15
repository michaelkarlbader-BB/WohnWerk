import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Bereichsliste } from './bereichsliste'
import { RahmenKontext } from './rahmen-kontext'

const nav = vi.hoisted(() => ({ pfad: '/wohnungen', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pfad,
  useRouter: () => ({ push: nav.push }),
}))

const abmelden = vi.fn<() => Promise<void>>()

function aufbauen() {
  render(
    <RahmenKontext abmelden={abmelden}>
      <Bereichsliste />
    </RahmenKontext>
  )
  return screen.getByRole('navigation', { name: 'Bereiche' })
}

beforeEach(() => {
  nav.pfad = '/wohnungen'
  nav.push.mockReset()
})

describe('Bereichsliste', () => {
  it('lists the four areas in order (AC-6)', () => {
    const liste = aufbauen()
    expect(within(liste).getAllByRole('listitem').map((eintrag) => eintrag.textContent)).toEqual([
      'Wohnungen',
      'Mieter',
      'Mietverträge',
      'Darlehen',
    ])
  })

  it('offers a built area as a real link and marks the active one (AC-6)', () => {
    const liste = aufbauen()
    const wohnungen = within(liste).getByRole('link', { name: 'Wohnungen' })
    expect(wohnungen).toHaveAttribute('href', '/wohnungen')
    expect(wohnungen).toHaveAttribute('aria-current', 'page')
    expect(wohnungen).toHaveClass('auswahl-primaer')
  })

  it('shows areas that are not built greyed out and not selectable (AC-7)', () => {
    const liste = aufbauen()
    expect(within(liste).getAllByRole('link')).toHaveLength(1)
    for (const name of ['Mieter', 'Mietverträge', 'Darlehen']) {
      const eintrag = within(liste).getByText(name)
      expect(eintrag).toHaveAttribute('aria-disabled', 'true')
      expect(eintrag).not.toHaveAttribute('href')
      expect(eintrag).not.toHaveAttribute('tabindex')
      fireEvent.click(eintrag)
    }
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('keeps the area marked on a detail page and marks nothing elsewhere (AC-9)', () => {
    nav.pfad = '/wohnungen/7c1e'
    expect(within(aufbauen()).getByRole('link', { name: 'Wohnungen' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks no area on a menu destination like the account page', () => {
    nav.pfad = '/konto'
    const wohnungen = within(aufbauen()).getByRole('link', { name: 'Wohnungen' })
    expect(wohnungen).not.toHaveAttribute('aria-current')
    expect(wohnungen).not.toHaveClass('auswahl-primaer')
  })

  it('ignores a click on the view that is already shown (EC-1)', () => {
    fireEvent.click(within(aufbauen()).getByRole('link', { name: 'Wohnungen' }))
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('navigates once on quick repeated clicks and marks the destination at once (EC-9, AC-35)', () => {
    nav.pfad = '/konto'
    const wohnungen = within(aufbauen()).getByRole('link', { name: 'Wohnungen' })

    fireEvent.click(wohnungen)
    fireEvent.click(wohnungen)
    fireEvent.click(wohnungen)

    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/wohnungen')
    expect(wohnungen).toHaveAttribute('aria-current', 'page')
  })

  it('goes from a detail page back to the list of its area', () => {
    nav.pfad = '/wohnungen/7c1e'
    fireEvent.click(within(aufbauen()).getByRole('link', { name: 'Wohnungen' }))
    expect(nav.push).toHaveBeenCalledExactlyOnceWith('/wohnungen')
  })
})
