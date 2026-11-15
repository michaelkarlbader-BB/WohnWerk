import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ abmelden: vi.fn(), meldeAbmeldung: vi.fn() }))
vi.mock('../auth.actions', () => ({ abmelden: h.abmelden }))
vi.mock('./sitzungswaechter', () => ({ meldeAbmeldung: h.meldeAbmeldung }))

import { AbmeldenKnopf } from './abmelden-knopf'

// BUG-8, EC-4: signing out from the status line tells the other open tabs as well.
describe('AbmeldenKnopf', () => {
  it('tells the other tabs when the sign-out form is sent', () => {
    render(<AbmeldenKnopf />)
    const knopf = screen.getByRole('button', { name: 'Abmelden' })
    expect(h.meldeAbmeldung).not.toHaveBeenCalled()

    fireEvent.submit(knopf.closest('form') as HTMLFormElement)

    expect(h.meldeAbmeldung).toHaveBeenCalledTimes(1)
  })
})
