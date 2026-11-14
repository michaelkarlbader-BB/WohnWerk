// Target of the links in the mails (confirm registration, reset password, confirm new address).
// Exchanges the one-time token for a session and sends the browser to a fixed internal page.
import { NextResponse, type NextRequest } from 'next/server'
import { AKTIVITAET_COOKIE, AKTIVITAET_COOKIE_OPTIONEN } from '@/features/konto/konto.rules'
import { createClient } from '@/lib/supabase/server'

// The only link types our mail templates produce, each with its fixed target after success.
const ZIELE = {
  email: '/wohnungen',
  recovery: '/passwort-neu',
  email_change: '/konto',
} as const

type LinkArt = keyof typeof ZIELE

const TOKEN_MAX_LAENGE = 512
const UNGUELTIG_PFAD = '/link-ungueltig'

function istLinkArt(wert: string | null): wert is LinkArt {
  return wert !== null && Object.hasOwn(ZIELE, wert)
}

// Targets are fixed internal paths on the request's own origin; nothing from the query is used.
function weiterleiten(request: NextRequest, pfad: string): NextResponse {
  const antwort = NextResponse.redirect(new URL(pfad, request.url))
  // The token is part of this request's URL: keep it out of caches and Referer headers.
  antwort.headers.set('Cache-Control', 'no-store')
  antwort.headers.set('Referrer-Policy', 'no-referrer')
  return antwort
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')

  if (!istLinkArt(type) || !tokenHash || tokenHash.length > TOKEN_MAX_LAENGE) {
    return weiterleiten(request, UNGUELTIG_PFAD)
  }

  // `art` is one of the three literals above, never text from the request.
  const ungueltig = `${UNGUELTIG_PFAD}?art=${type}`

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error || !data.session) return weiterleiten(request, ungueltig)
  } catch {
    // Deliberately not logged: the error may carry the token or the full URL.
    return weiterleiten(request, ungueltig)
  }

  const antwort = weiterleiten(request, ZIELE[type])
  // Without a fresh activity timestamp the proxy would treat the new session as inactive.
  antwort.cookies.set(AKTIVITAET_COOKIE, String(Date.now()), {
    ...AKTIVITAET_COOKIE_OPTIONEN,
    secure: process.env.NODE_ENV === 'production',
  })
  return antwort
}
