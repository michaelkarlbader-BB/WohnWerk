// Server-side data access for PROJ-1 (account & login).
// Every call uses the per-request client: the session comes from the cookies, so Row Level
// Security and the database functions decide what the caller may see or change. No service
// key, and no user-id parameter a caller could forge.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Sperrstatus } from './konto.rules'

export type Profil = { id: string; anzeigename: string | null; angelegtAm: string }

/** Thrown for any database/transport error; `cause` holds the original error. */
export class DatenFehler extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'DatenFehler'
  }
}

type Client = Awaited<ReturnType<typeof createClient>>

/** Runs one data access; anything thrown on the way (client creation, transport) becomes a DatenFehler. */
async function zugriff<T>(name: string, aktion: (supabase: Client) => Promise<T>): Promise<T> {
  try {
    return await aktion(await createClient())
  } catch (fehler) {
    if (fehler instanceof DatenFehler) throw fehler
    throw new DatenFehler(`${name} failed`, fehler)
  }
}

/** Own profile (RLS: only the session user's row is visible). null when no row is visible. */
export async function profilLesen(): Promise<Profil | null> {
  return zugriff('profilLesen', async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .maybeSingle()

    if (error) throw new DatenFehler('profilLesen failed', error)
    if (!data) return null

    return { id: data.id, anzeigename: data.display_name, angelegtAm: data.created_at }
  })
}

/** Sets or clears the display name of the own profile. Throws DatenFehler if nothing was updated. */
export async function anzeigenameAendern(anzeigename: string | null): Promise<void> {
  return zugriff('anzeigenameAendern', async (supabase) => {
    // Server-verified user id — never taken from a parameter.
    const { data: auth, error: authError } = await supabase.auth.getUser()
    const user = auth?.user
    if (authError || !user) throw new DatenFehler('anzeigenameAendern: no user', authError)

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: anzeigename })
      .eq('id', user.id)
      .select('id')

    if (error) throw new DatenFehler('anzeigenameAendern failed', error)
    if (!Array.isArray(data) || data.length !== 1) {
      throw new DatenFehler('anzeigenameAendern: no row updated')
    }
  })
}

/** Lock state of an e-mail. Fails closed: any error or unexpected shape throws DatenFehler. */
export async function sperreLesen(email: string): Promise<Sperrstatus> {
  return zugriff('sperreLesen', async (supabase) => {
    const { data, error } = await supabase.rpc('login_sperre_pruefen', { p_email: email })
    if (error) throw new DatenFehler('sperreLesen failed', error)

    const zeile: unknown = Array.isArray(data) ? data[0] : undefined
    if (typeof zeile !== 'object' || zeile === null) {
      throw new DatenFehler('sperreLesen: unexpected result')
    }

    const { gesperrt, gesperrt_bis: bis } = zeile as { gesperrt?: unknown; gesperrt_bis?: unknown }
    if (typeof gesperrt !== 'boolean') throw new DatenFehler('sperreLesen: unexpected result')
    if (bis === null || bis === undefined) return { gesperrt, gesperrtBis: null }

    const gesperrtBis = typeof bis === 'string' ? new Date(bis) : null
    if (!gesperrtBis || Number.isNaN(gesperrtBis.getTime())) {
      throw new DatenFehler('sperreLesen: unexpected result')
    }
    return { gesperrt, gesperrtBis }
  })
}

/** Counts one failed sign-in attempt for the e-mail. */
export async function fehlversuchZaehlen(email: string, art: 'passwort' | 'totp'): Promise<void> {
  return zugriff('fehlversuchZaehlen', async (supabase) => {
    const { error } = await supabase.rpc('login_fehlversuch_zaehlen', { p_email: email, p_art: art })
    if (error) throw new DatenFehler('fehlversuchZaehlen failed', error)
  })
}

/** Clears the attempts of the signed-in user's own e-mail. */
export async function fehlversucheLoeschen(): Promise<void> {
  return zugriff('fehlversucheLoeschen', async (supabase) => {
    const { error } = await supabase.rpc('login_fehlversuche_loeschen')
    if (error) throw new DatenFehler('fehlversucheLoeschen failed', error)
  })
}

/** Deletes the account of the current session (and its allow-list entry). */
export async function eigenesKontoLoeschen(): Promise<void> {
  return zugriff('eigenesKontoLoeschen', async (supabase) => {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) throw new DatenFehler('eigenesKontoLoeschen failed', error)
  })
}
