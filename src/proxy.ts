// Runs before every matched request: refreshes the Supabase session, enforces the
// 30-minute inactivity limit and keeps signed-out visitors away from protected pages.
import { NextResponse, type NextRequest } from 'next/server'
import { AKTIVITAET_COOKIE, AKTIVITAET_COOKIE_OPTIONEN } from '@/features/konto/konto.rules'
import { zugangPruefen } from '@/features/konto/zugang'
import { createProxyClient, uebernehmeCookies } from '@/lib/supabase/proxy'

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

  const zugang = await zugangPruefen(
    supabase,
    request.cookies.get(AKTIVITAET_COOKIE)?.value,
    Date.now()
  )
  const abgelaufen = zugang.stufe === 'inaktiv'
  const angemeldet = zugang.stufe === 'voll' || zugang.stufe === 'zweiter-faktor-offen'
  const vollAngemeldet = zugang.stufe === 'voll'

  if (abgelaufen) {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // The session counts as ended either way.
    }
  }

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
