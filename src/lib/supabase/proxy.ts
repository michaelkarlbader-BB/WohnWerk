// Supabase client for src/proxy.ts — reads the session from the incoming request and writes
// refreshed or cleared auth cookies onto the outgoing response.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Headers the library asks for on responses that set auth cookies (never cache them).
const CACHE_KOPFZEILEN = ['cache-control', 'expires', 'pragma'] as const

/**
 * Turns the library's cookie options into session-cookie options: without `maxAge`/`expires`
 * the browser drops the cookie when it closes (the library default is 400 days).
 * A removal (empty value or `maxAge: 0`) keeps its options, otherwise it would not remove anything.
 */
export function sitzungsCookieOptionen(options: CookieOptions, value: string): CookieOptions {
  if (value === '' || options.maxAge === 0) return options

  const sitzung = { ...options }
  delete sitzung.maxAge
  delete sitzung.expires
  return sitzung
}

/** Copies the cookie changes (and no-cache headers) of one response onto another, e.g. a redirect. */
export function uebernehmeCookies(von: NextResponse, nach: NextResponse): NextResponse {
  von.cookies.getAll().forEach((cookie) => nach.cookies.set(cookie))
  CACHE_KOPFZEILEN.forEach((name) => {
    const wert = von.headers.get(name)
    if (wert !== null) nach.headers.set(name, wert)
  })
  return nach
}

export function createProxyClient(request: NextRequest): {
  supabase: SupabaseClient
  /** The latest response object — it carries the refreshed or cleared auth cookies. */
  response: () => NextResponse
} {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // A fresh response forwards the updated request cookies to the render;
          // cookie changes of an earlier setAll call must not get lost.
          response = uebernehmeCookies(response, NextResponse.next({ request }))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, sitzungsCookieOptionen(options, value)),
          )
          Object.entries(headers).forEach(([name, wert]) => response.headers.set(name, wert))
        },
      },
    },
  )

  return { supabase, response: () => response }
}
