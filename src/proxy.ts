// Runs before every matched request: refreshes the Supabase session, enforces the
// 30-minute inactivity limit and keeps signed-out visitors away from protected pages.
import { NextResponse, type NextRequest } from 'next/server'
import {
  AKTIVITAET_COOKIE,
  AKTIVITAET_COOKIE_OPTIONEN,
  istInaktiv,
} from '@/features/konto/konto.rules'
import { createProxyClient, uebernehmeCookies } from '@/lib/supabase/proxy'

type ProxyClient = ReturnType<typeof createProxyClient>['supabase']

// Everything that is not listed here is protected (fail closed).
const OEFFENTLICHE_PFADE = [
  '/anmelden',
  '/registrieren',
  '/passwort-vergessen',
  '/passwort-neu',
  '/link-ungueltig',
  '/auth/bestaetigen',
  '/datenschutz',
  '/impressum',
] as const

const NUR_ABGEMELDET = ['/anmelden', '/registrieren']

function istOeffentlich(pfad: string): boolean {
  return OEFFENTLICHE_PFADE.some((basis) => pfad === basis || pfad.startsWith(`${basis}/`))
}

/** Asks the Auth server (not just the local token), so "sign out everywhere" takes effect. */
async function istAngemeldet(supabase: ProxyClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser()
    return !error && Boolean(data?.user)
  } catch {
    return false
  }
}

/** True while a session with an enrolled second factor has not passed it yet. Fails closed. */
async function zweiterFaktorOffen(supabase: ProxyClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return true
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  } catch {
    return true
  }
}

function umleitung(request: NextRequest, pfad: string, weiter?: string): NextResponse {
  const ziel = request.nextUrl.clone()
  ziel.pathname = pfad
  ziel.search = ''
  if (weiter) ziel.searchParams.set('weiter', weiter)
  return NextResponse.redirect(ziel)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { supabase, response } = createProxyClient(request)

  let angemeldet = await istAngemeldet(supabase)
  let abgelaufen = false

  if (angemeldet && istInaktiv(request.cookies.get(AKTIVITAET_COOKIE)?.value, Date.now())) {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // The session counts as ended either way.
    }
    angemeldet = false
    abgelaufen = true
  }

  const vollAngemeldet = angemeldet && !(await zweiterFaktorOffen(supabase))

  let antwort: NextResponse
  if (!istOeffentlich(pathname) && !vollAngemeldet) {
    // Only an internal path + query ever goes into `weiter`.
    const intern = /^\/(?![/\\])/.test(pathname) && pathname !== '/'
    antwort = umleitung(request, '/anmelden', intern ? pathname + search : undefined)
  } else if (vollAngemeldet && NUR_ABGEMELDET.includes(pathname)) {
    antwort = umleitung(request, '/wohnungen')
  } else {
    antwort = response()
  }

  // A redirect must not lose refreshed or cleared auth cookies.
  if (antwort !== response()) uebernehmeCookies(response(), antwort)

  if (abgelaufen) {
    antwort.cookies.delete(AKTIVITAET_COOKIE)
  } else if (angemeldet) {
    antwort.cookies.set(AKTIVITAET_COOKIE, String(Date.now()), {
      ...AKTIVITAET_COOKIE_OPTIONEN,
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return antwort
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
