import 'server-only'
// Every signed-in page checks access itself. The layout is not enough: a partial render (RSC
// navigation) skips it, and the proxy skips addresses by file ending (PROJ-2 BUG-2).
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AKTIVITAET_COOKIE } from './konto.rules'
import { zugangPruefen } from './zugang'

/** Returns the fully signed-in user or redirects to the sign-in. Fails closed. */
export async function seiteSchuetzen(weiter?: string): Promise<User> {
  let nutzer: User | null = null
  try {
    const supabase = await createClient()
    const aktivitaet = (await cookies()).get(AKTIVITAET_COOKIE)?.value
    const zugang = await zugangPruefen(supabase, aktivitaet, Date.now())
    if (zugang.stufe === 'voll') nutzer = zugang.nutzer
  } catch {
    nutzer = null
  }
  if (!nutzer) redirect(weiter ? `/anmelden?weiter=${encodeURIComponent(weiter)}` : '/anmelden')
  return nutzer
}
