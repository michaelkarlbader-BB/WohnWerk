// QA (PROJ-1, AC-7): the browser client must write session cookies — no Max-Age/Expires —
// so the login is gone when the browser closes; removals must still remove.
import type { CookieOptions } from '@supabase/ssr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CookieMethoden = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => void
}

const erfasst = vi.hoisted(() => ({ cookies: null as CookieMethoden | null }))
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (_url: string, _key: string, optionen: { cookies: CookieMethoden }) => {
    erfasst.cookies = optionen.cookies
    return {}
  },
}))

import { createClient } from './client'

const BIBLIOTHEK_OPTIONEN: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
}

let geschrieben: string[]
let cookieTextFuerGetter: string

function methoden(): CookieMethoden {
  createClient()
  if (!erfasst.cookies) throw new Error('createBrowserClient wurde nicht aufgerufen')
  return erfasst.cookies
}

beforeEach(() => {
  geschrieben = []
  cookieTextFuerGetter = ''
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieTextFuerGetter,
    set: (wert: string) => {
      geschrieben.push(wert)
    },
  })
})

afterEach(() => {
  // Restore jsdom's own accessor from the prototype.
  delete (document as unknown as Record<string, unknown>).cookie
  erfasst.cookies = null
})

describe('Browser-Client: Cookies schreiben (AC-7)', () => {
  it('schreibt Auth-Cookies als Sitzungs-Cookies ohne Max-Age und Expires', () => {
    methoden().setAll([
      {
        name: 'sb-test-auth-token',
        value: 'base64-abc',
        options: { ...BIBLIOTHEK_OPTIONEN, expires: new Date('2027-12-01T00:00:00Z') },
      },
    ])

    expect(geschrieben).toEqual(['sb-test-auth-token=base64-abc; Path=/; SameSite=lax'])
  })

  it('löscht ein Cookie weiterhin mit Max-Age=0 (leerer Wert)', () => {
    methoden().setAll([{ name: 'sb-test-auth-token', value: '', options: BIBLIOTHEK_OPTIONEN }])

    expect(geschrieben).toEqual(['sb-test-auth-token=; Path=/; Max-Age=0; SameSite=lax'])
  })

  it('löscht ein Cookie weiterhin mit Max-Age=0 (maxAge 0 von der Bibliothek)', () => {
    methoden().setAll([
      { name: 'sb-test-auth-token', value: 'x', options: { ...BIBLIOTHEK_OPTIONEN, maxAge: 0 } },
    ])

    expect(geschrieben).toEqual(['sb-test-auth-token=x; Path=/; Max-Age=0; SameSite=lax'])
  })

  it('übernimmt Domain, Secure und SameSite=Strict und kodiert den Wert', () => {
    methoden().setAll([
      {
        name: 'sb-a',
        value: 'a b;c',
        options: { path: '/konto', domain: 'example.test', secure: true, sameSite: true },
      },
    ])

    expect(geschrieben).toEqual([
      'sb-a=a%20b%3Bc; Path=/konto; Domain=example.test; SameSite=Strict; Secure',
    ])
  })
})

describe('Browser-Client: Cookies lesen', () => {
  it('liest, dekodiert und überspringt Doppelte und Einträge ohne Namen', () => {
    cookieTextFuerGetter = 'sb-a=a%20b; =leer; ohne-trenner; sb-b=roh%ZZ; sb-a=zweiter'

    expect(methoden().getAll()).toEqual([
      { name: 'sb-a', value: 'a b' },
      { name: 'sb-b', value: 'roh%ZZ' },
    ])
  })
})
