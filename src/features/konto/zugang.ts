// Who may see signed-in pages. One check for the proxy and for the server-rendered fallbacks
// behind it (layout, account page), so no path that slips past the proxy gets a weaker check
// (PROJ-2 BUG-2). Fails closed: every error counts as "not allowed".
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { istInaktiv } from './konto.rules'

export type Zugang =
  | { stufe: 'voll'; nutzer: User }
  | { stufe: 'zweiter-faktor-offen'; nutzer: User }
  | { stufe: 'inaktiv' }
  | { stufe: 'abgemeldet' }

/** Asks the Auth server (not just the local token), so "sign out everywhere" takes effect. */
async function angemeldeterNutzer(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    return !error && data?.user ? data.user : null
  } catch {
    return null
  }
}

/** True while a session with an enrolled second factor has not passed it yet. */
async function zweiterFaktorOffen(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return true
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  } catch {
    return true
  }
}

/**
 * Checks session, the 30-minute inactivity limit (value of the activity cookie) and the second
 * factor, in this order. Only `voll` may see signed-in pages.
 */
export async function zugangPruefen(
  supabase: SupabaseClient,
  letzteAktivitaet: string | undefined,
  jetztMs: number
): Promise<Zugang> {
  const nutzer = await angemeldeterNutzer(supabase)
  if (!nutzer) return { stufe: 'abgemeldet' }
  if (istInaktiv(letzteAktivitaet, jetztMs)) return { stufe: 'inaktiv' }
  if (await zweiterFaktorOffen(supabase)) return { stufe: 'zweiter-faktor-offen', nutzer }
  return { stufe: 'voll', nutzer }
}
