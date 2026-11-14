// Browser-side Supabase client — Client Components only ('use client').
// Shares the session cookie with the server client, so both see the same user.
import { createBrowserClient, type CookieOptions } from '@supabase/ssr'

// The library always writes the auth cookies with a 400-day maxAge (its `cookieOptions.maxAge`
// is ignored), so the browser client gets its own cookie methods that write session cookies:
// no Max-Age/Expires, gone when the browser closes. Removals keep their Max-Age=0.

function leseCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return []

  const cookies: { name: string; value: string }[] = []
  for (const teil of document.cookie.split(';')) {
    const trenner = teil.indexOf('=')
    if (trenner < 0) continue
    const name = teil.slice(0, trenner).trim()
    if (!name || cookies.some((cookie) => cookie.name === name)) continue
    const roh = teil.slice(trenner + 1).trim()
    let value = roh
    try {
      value = decodeURIComponent(roh)
    } catch {
      // Not URI-encoded: keep the raw value.
    }
    cookies.push({ name, value })
  }
  return cookies
}

function schreibeCookie(name: string, value: string, options: CookieOptions): void {
  const loeschen = value === '' || options.maxAge === 0
  const teile = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`]

  if (options.domain) teile.push(`Domain=${options.domain}`)
  if (loeschen) teile.push('Max-Age=0')
  if (options.sameSite === true) teile.push('SameSite=Strict')
  else if (options.sameSite) teile.push(`SameSite=${options.sameSite}`)
  if (options.secure) teile.push('Secure')

  document.cookie = teile.join('; ')
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: leseCookies,
        setAll(cookiesToSet) {
          // During server pre-rendering of a Client Component there is no document.
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => schreibeCookie(name, value, options))
        },
      },
    },
  )
}
