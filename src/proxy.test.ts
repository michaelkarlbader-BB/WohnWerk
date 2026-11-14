// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { AKTIVITAET_COOKIE } from '@/features/konto/konto.rules'

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  mfa: { getAuthenticatorAssuranceLevel: vi.fn() },
}))

vi.mock('@/lib/supabase/proxy', async (importOriginal) => {
  const { NextResponse: Antwort } = await import('next/server')
  return {
    ...(await importOriginal<typeof import('@/lib/supabase/proxy')>()),
    createProxyClient: (request: NextRequest) => {
      // Stands for an auth cookie the Supabase client refreshed during this request.
      const response = Antwort.next({ request })
      response.cookies.set('sb-test-auth-token', 'erneuert', { path: '/' })
      return { supabase: { auth }, response: () => response }
    },
  }
})

import { sitzungsCookieOptionen, uebernehmeCookies } from '@/lib/supabase/proxy'
import { config, proxy } from './proxy'

const JETZT = new Date('2026-11-14T10:00:00Z').getTime()
const MINUTE = 60_000

function anfrage(pfad: string, aktivVorMs?: number): NextRequest {
  const headers = new Headers()
  if (aktivVorMs !== undefined) {
    headers.set('cookie', `${AKTIVITAET_COOKIE}=${JETZT - aktivVorMs}`)
  }
  return new NextRequest(`https://wohnwerk.test${pfad}`, { headers })
}

function angemeldet() {
  auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
}

function faktorOffen() {
  auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    error: null,
  })
}

/** Pathname + query of the redirect target, or null when the request passes. */
function ziel(antwort: NextResponse): string | null {
  const location = antwort.headers.get('location')
  if (location === null) return null
  const url = new URL(location)
  return url.pathname + url.search
}

function aktivitaetsCookie(antwort: NextResponse): string | undefined {
  return antwort.headers.getSetCookie().find((zeile) => zeile.startsWith(`${AKTIVITAET_COOKIE}=`))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
  auth.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null })
  auth.signOut.mockReset().mockResolvedValue({ error: null })
  auth.mfa.getAuthenticatorAssuranceLevel.mockReset().mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal1' },
    error: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('proxy — not signed in', () => {
  it('redirects a protected path to the login with the internal target', async () => {
    const antwort = await proxy(anfrage('/wohnungen?x=1'))

    expect(antwort.status).toBe(307)
    expect(ziel(antwort)).toBe('/anmelden?weiter=%2Fwohnungen%3Fx%3D1')
    expect(aktivitaetsCookie(antwort)).toBeUndefined()
  })

  it('redirects the start page without `weiter`', async () => {
    expect(ziel(await proxy(anfrage('/')))).toBe('/anmelden')
  })

  it('protects unknown paths (fail closed)', async () => {
    expect(ziel(await proxy(anfrage('/irgendwas')))).toBe('/anmelden?weiter=%2Firgendwas')
    expect(ziel(await proxy(anfrage('/anmelden-x')))).toBe('/anmelden?weiter=%2Fanmelden-x')
  })

  it('never puts a protocol-relative path into `weiter`', async () => {
    expect(ziel(await proxy(anfrage('//evil.example/x')))).toBe('/anmelden')
  })

  it.each([
    '/anmelden',
    '/registrieren',
    '/passwort-vergessen',
    '/passwort-neu',
    '/link-ungueltig',
    '/auth/bestaetigen',
    '/datenschutz',
    '/impressum',
    '/auth/bestaetigen/unterseite',
  ])('lets the public path %s pass', async (pfad) => {
    const antwort = await proxy(anfrage(pfad))

    expect(ziel(antwort)).toBeNull()
    expect(antwort.status).toBe(200)
  })

  it('treats a getUser error as not signed in', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } })

    expect(ziel(await proxy(anfrage('/konto', MINUTE)))).toBe('/anmelden?weiter=%2Fkonto')
  })

  it('treats an error next to a user as not signed in', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: { message: 'boom' } })

    expect(ziel(await proxy(anfrage('/konto', MINUTE)))).toBe('/anmelden?weiter=%2Fkonto')
  })

  it('treats a throwing getUser as not signed in', async () => {
    auth.getUser.mockRejectedValue(new Error('network'))

    expect(ziel(await proxy(anfrage('/konto', MINUTE)))).toBe('/anmelden?weiter=%2Fkonto')
  })

  it('carries the Supabase cookie changes over to the redirect', async () => {
    const antwort = await proxy(anfrage('/konto'))

    expect(antwort.cookies.get('sb-test-auth-token')?.value).toBe('erneuert')
  })
})

describe('proxy — signed in', () => {
  beforeEach(angemeldet)

  it('lets an active session pass and renews the activity cookie as a session cookie', async () => {
    const antwort = await proxy(anfrage('/konto', 10 * MINUTE))

    expect(ziel(antwort)).toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()

    const cookie = aktivitaetsCookie(antwort)
    expect(cookie).toContain(`${AKTIVITAET_COOKIE}=${JETZT}`)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=lax/i)
    expect(cookie).toMatch(/Path=\//i)
    expect(cookie).not.toMatch(/Max-Age/i)
    expect(cookie).not.toMatch(/Expires/i)
  })

  it('signs out locally after 31 minutes without activity', async () => {
    const antwort = await proxy(anfrage('/konto?tab=2', 31 * MINUTE))

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(ziel(antwort)).toBe('/anmelden?weiter=%2Fkonto%3Ftab%3D2')
    expect(aktivitaetsCookie(antwort)).toMatch(/^ww-aktiv=;.*Expires=Thu, 01 Jan 1970/i)
    expect(auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled()
  })

  it('signs out a session without an activity cookie', async () => {
    const antwort = await proxy(anfrage('/konto'))

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(ziel(antwort)).toBe('/anmelden?weiter=%2Fkonto')
    expect(aktivitaetsCookie(antwort)).toMatch(/^ww-aktiv=;/)
  })

  it('still ends the session when signOut throws', async () => {
    auth.signOut.mockRejectedValue(new Error('network'))

    expect(ziel(await proxy(anfrage('/konto', 31 * MINUTE)))).toBe('/anmelden?weiter=%2Fkonto')
  })

  it('shows the login to an expired session instead of redirecting into the app', async () => {
    const antwort = await proxy(anfrage('/anmelden', 31 * MINUTE))

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(ziel(antwort)).toBeNull()
    expect(aktivitaetsCookie(antwort)).toMatch(/^ww-aktiv=;/)
  })

  it('redirects a session that owes the second factor without signing it out', async () => {
    faktorOffen()

    const antwort = await proxy(anfrage('/wohnungen', MINUTE))

    expect(ziel(antwort)).toBe('/anmelden?weiter=%2Fwohnungen')
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(aktivitaetsCookie(antwort)).toContain(`${AKTIVITAET_COOKIE}=${JETZT}`)
    expect(antwort.cookies.get('sb-test-auth-token')?.value).toBe('erneuert')
  })

  it('lets a session that owes the second factor stay on the login (no redirect loop)', async () => {
    faktorOffen()

    const antwort = await proxy(anfrage('/anmelden', MINUTE))

    expect(ziel(antwort)).toBeNull()
    expect(aktivitaetsCookie(antwort)).toContain(`${AKTIVITAET_COOKIE}=${JETZT}`)
  })

  it.each([
    ['an error result', () => ({ data: null, error: { message: 'boom' } })],
    ['a thrown error', () => Promise.reject(new Error('network'))],
  ])('treats %s of the AAL lookup as an owed factor', async (_name, ergebnis) => {
    auth.mfa.getAuthenticatorAssuranceLevel.mockImplementation(async () => ergebnis())

    expect(ziel(await proxy(anfrage('/wohnungen', MINUTE)))).toBe('/anmelden?weiter=%2Fwohnungen')
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('lets a session that passed the second factor through', async () => {
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })

    expect(ziel(await proxy(anfrage('/wohnungen', MINUTE)))).toBeNull()
  })

  it.each(['/anmelden', '/registrieren'])(
    'redirects a fully signed-in user from %s into the app',
    async (pfad) => {
      const antwort = await proxy(anfrage(pfad, MINUTE))

      expect(ziel(antwort)).toBe('/wohnungen')
      expect(aktivitaetsCookie(antwort)).toContain(`${AKTIVITAET_COOKIE}=${JETZT}`)
      expect(antwort.cookies.get('sb-test-auth-token')?.value).toBe('erneuert')
    },
  )

  it('lets a fully signed-in user read the other public pages', async () => {
    expect(ziel(await proxy(anfrage('/datenschutz', MINUTE)))).toBeNull()
  })
})

describe('matcher', () => {
  it('skips Next.js internals and static images, nothing else', () => {
    const muster = new RegExp(`^${config.matcher[0]}$`)

    expect(muster.test('/wohnungen')).toBe(true)
    expect(muster.test('/')).toBe(true)
    expect(muster.test('/_next/static/chunk.js')).toBe(false)
    expect(muster.test('/_next/image')).toBe(false)
    expect(muster.test('/favicon.ico')).toBe(false)
    expect(muster.test('/logo.png')).toBe(false)
  })
})

describe('sitzungsCookieOptionen', () => {
  const optionen = { path: '/', sameSite: 'lax', httpOnly: false, maxAge: 400 * 24 * 60 * 60 } as const

  it('removes maxAge and expires for a normal value', () => {
    expect(sitzungsCookieOptionen({ ...optionen, expires: new Date(JETZT) }, 'token')).toEqual({
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    })
  })

  it('keeps the options of a removal', () => {
    expect(sitzungsCookieOptionen({ ...optionen, maxAge: 0 }, '')).toEqual({ ...optionen, maxAge: 0 })
    expect(sitzungsCookieOptionen({ ...optionen, maxAge: 0 }, 'x').maxAge).toBe(0)
    expect(sitzungsCookieOptionen(optionen, '').maxAge).toBe(optionen.maxAge)
  })
})

describe('uebernehmeCookies', () => {
  it('copies set and removed cookies and the no-cache headers', () => {
    const von = NextResponse.next()
    von.cookies.set('sb-a', 'wert', { path: '/', httpOnly: true })
    von.cookies.set('sb-b', '', { path: '/', maxAge: 0 })
    von.headers.set('Cache-Control', 'private, no-store')

    const nach = uebernehmeCookies(von, NextResponse.redirect('https://wohnwerk.test/anmelden'))
    const zeilen = nach.headers.getSetCookie()

    expect(zeilen.find((z) => z.startsWith('sb-a='))).toMatch(/sb-a=wert;.*HttpOnly/i)
    expect(zeilen.find((z) => z.startsWith('sb-b='))).toMatch(/Max-Age=0/i)
    expect(nach.headers.get('cache-control')).toBe('private, no-store')
  })
})
