// @vitest-environment node
// BUG-2: addresses the proxy skips (e.g. /konto.png) reach the signed-in pages directly. Their
// own checks must be as strict as the proxy: session, 30-minute inactivity, second factor.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AKTIVITAET_COOKIE } from '@/features/konto/konto.rules'

const h = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    mfa: { getAuthenticatorAssuranceLevel: vi.fn(), listFactors: vi.fn() },
  },
  cookie: undefined as string | undefined,
  redirect: vi.fn((ziel: string) => {
    throw new Error(`REDIRECT ${ziel}`)
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === AKTIVITAET_COOKIE && h.cookie !== undefined ? { value: h.cookie } : undefined,
  }),
}))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: h.auth }) }))
vi.mock('@/features/konto/konto.data', () => ({
  profilLesen: async () => ({ id: 'u1', anzeigename: null, angelegtAm: '2026-11-01' }),
}))
vi.mock('@/features/konto/auth.actions', () => ({ abmelden: vi.fn() }))

import AngemeldetLayout from './layout'
import KontoPage from './konto/page'

const JETZT = new Date('2026-11-16T10:00:00Z').getTime()
const MINUTE = 60_000

function sitzung({ faktorOffen = false, aktivVorMin = 1 } = {}) {
  h.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.de' } }, error: null })
  h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: faktorOffen ? 'aal2' : 'aal1' },
    error: null,
  })
  h.cookie = String(JETZT - aktivVorMin * MINUTE)
}

const SEITEN = [
  ['layout', () => AngemeldetLayout({ children: null })],
  ['account page', () => KontoPage()],
] as const

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
  h.redirect.mockClear()
  h.auth.getUser.mockReset()
  h.auth.mfa.getAuthenticatorAssuranceLevel.mockReset()
  h.auth.mfa.listFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null })
  h.cookie = undefined
})

describe.each(SEITEN)('%s', (_, zeichnen) => {
  it('is shown to a fully signed-in, active session', async () => {
    sitzung()
    await expect(zeichnen()).resolves.toBeTruthy()
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('sends a session whose second factor is still open to the sign-in', async () => {
    sitzung({ faktorOffen: true })
    await expect(zeichnen()).rejects.toThrow(/REDIRECT \/anmelden/)
  })

  it('sends a session inactive for more than 30 minutes to the sign-in', async () => {
    sitzung({ aktivVorMin: 31 })
    await expect(zeichnen()).rejects.toThrow(/REDIRECT \/anmelden/)
  })

  it('sends a session without activity cookie to the sign-in (fail closed)', async () => {
    sitzung()
    h.cookie = undefined
    await expect(zeichnen()).rejects.toThrow(/REDIRECT \/anmelden/)
  })

  it('sends a visitor without session to the sign-in', async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(zeichnen()).rejects.toThrow(/REDIRECT \/anmelden/)
  })
})
