// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AKTIVITAET_COOKIE } from '@/features/konto/konto.rules'

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { verifyOtp } })),
}))

import { GET } from './route'

const ORIGIN = 'https://wohnwerk.test'

function anfrage(query: Record<string, string>): NextRequest {
  const url = new URL('/auth/bestaetigen', ORIGIN)
  for (const [name, wert] of Object.entries(query)) url.searchParams.set(name, wert)
  return new NextRequest(url)
}

function aktivitaetsCookie(antwort: Response): string | undefined {
  return antwort.headers.getSetCookie().find((cookie) => cookie.startsWith(`${AKTIVITAET_COOKIE}=`))
}

function erwarteSchutzHeader(antwort: Response) {
  expect(antwort.headers.get('Cache-Control')).toBe('no-store')
  expect(antwort.headers.get('Referrer-Policy')).toBe('no-referrer')
}

function istWeiterleitung(antwort: Response) {
  expect(antwort.status).toBeGreaterThanOrEqual(300)
  expect(antwort.status).toBeLessThan(400)
}

beforeEach(() => {
  verifyOtp.mockReset()
  verifyOtp.mockResolvedValue({ data: { session: { access_token: 'x' }, user: {} }, error: null })
})

describe('GET /auth/bestaetigen', () => {
  describe('valid link', () => {
    it.each([
      ['email', '/wohnungen'],
      ['recovery', '/passwort-neu'],
      ['email_change', '/konto'],
    ])('type %s redirects to %s and starts the activity window', async (type, ziel) => {
      const vorher = Date.now()
      const antwort = await GET(anfrage({ token_hash: 'abc123', type }))

      istWeiterleitung(antwort)
      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}${ziel}`)
      expect(verifyOtp).toHaveBeenCalledTimes(1)
      expect(verifyOtp).toHaveBeenCalledWith({ type, token_hash: 'abc123' })
      erwarteSchutzHeader(antwort)

      const cookie = aktivitaetsCookie(antwort)
      expect(cookie).toBeDefined()
      const wert = Number(cookie!.split(';')[0].split('=')[1])
      expect(wert).toBeGreaterThanOrEqual(vorher)
      expect(wert).toBeLessThanOrEqual(Date.now())
      expect(cookie).toMatch(/;\s*HttpOnly/i)
      expect(cookie).toMatch(/;\s*SameSite=lax/i)
      expect(cookie).toMatch(/;\s*Path=\//i)
      // Session cookie: gone when the browser closes.
      expect(cookie).not.toMatch(/Max-Age/i)
      expect(cookie).not.toMatch(/Expires/i)
    })
  })

  describe('link that Supabase rejects', () => {
    it.each(['email', 'recovery', 'email_change'])(
      'type %s with an error goes to the invalid-link page without activity cookie',
      async (type) => {
        verifyOtp.mockResolvedValue({
          data: { session: null, user: null },
          error: { message: 'Email link is invalid or has expired' },
        })
        const antwort = await GET(anfrage({ token_hash: 'abc123', type }))

        istWeiterleitung(antwort)
        expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/link-ungueltig?art=${type}`)
        expect(aktivitaetsCookie(antwort)).toBeUndefined()
        erwarteSchutzHeader(antwort)
      },
    )

    it('no error but no session counts as invalid', async () => {
      verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: null })
      const antwort = await GET(anfrage({ token_hash: 'abc123', type: 'recovery' }))

      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/link-ungueltig?art=recovery`)
      expect(aktivitaetsCookie(antwort)).toBeUndefined()
    })

    it('a thrown exception counts as invalid', async () => {
      verifyOtp.mockRejectedValue(new Error('network down'))
      const antwort = await GET(anfrage({ token_hash: 'abc123', type: 'email_change' }))

      istWeiterleitung(antwort)
      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/link-ungueltig?art=email_change`)
      expect(aktivitaetsCookie(antwort)).toBeUndefined()
      erwarteSchutzHeader(antwort)
    })
  })

  describe('malformed link', () => {
    it.each<[string, Record<string, string>]>([
      ['missing token_hash', { type: 'email' }],
      ['empty token_hash', { token_hash: '', type: 'email' }],
      ['missing type', { token_hash: 'abc123' }],
      ['type magiclink', { token_hash: 'abc123', type: 'magiclink' }],
      ['type signup', { token_hash: 'abc123', type: 'signup' }],
      ['type invite', { token_hash: 'abc123', type: 'invite' }],
      ['type from the object prototype', { token_hash: 'abc123', type: 'constructor' }],
      ['over-long token_hash', { token_hash: 'a'.repeat(513), type: 'recovery' }],
    ])('%s goes to the invalid-link page and never reaches Supabase', async (_name, query) => {
      const antwort = await GET(anfrage(query))

      istWeiterleitung(antwort)
      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/link-ungueltig`)
      expect(verifyOtp).not.toHaveBeenCalled()
      expect(aktivitaetsCookie(antwort)).toBeUndefined()
      erwarteSchutzHeader(antwort)
    })

    it('accepts a token_hash of exactly 512 characters', async () => {
      const antwort = await GET(anfrage({ token_hash: 'a'.repeat(512), type: 'recovery' }))

      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/passwort-neu`)
    })
  })

  describe('redirect parameters from the query are ignored', () => {
    it.each([
      ['next', 'https://evil.example'],
      ['redirect_to', '//evil.example'],
      ['redirectTo', 'https://evil.example/x'],
    ])('%s=%s on success', async (name, wert) => {
      const antwort = await GET(anfrage({ token_hash: 'abc123', type: 'email', [name]: wert }))

      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/wohnungen`)
    })

    it.each([
      ['next', 'https://evil.example'],
      ['redirect_to', '//evil.example'],
    ])('%s=%s on failure', async (name, wert) => {
      verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'x' } })
      const antwort = await GET(anfrage({ token_hash: 'abc123', type: 'recovery', [name]: wert }))

      expect(antwort.headers.get('Location')).toBe(`${ORIGIN}/link-ungueltig?art=recovery`)
    })
  })
})
