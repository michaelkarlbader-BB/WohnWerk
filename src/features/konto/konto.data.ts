// Server-side data access for PROJ-1 (account & login).
// Every call uses the per-request client: the session comes from the cookies, so Row Level
// Security and the database functions decide what the caller may see or change. No service
// key, and no user-id parameter a caller could forge.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { istFrischeWiederherstellung } from './konto.rules'

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

/**
 * Narrow server key of the attempt functions (BUG-6). Without it the database rejects every
 * call, so a missing value fails closed instead of skipping the lock.
 */
function sperreSchluessel(): string {
  const schluessel = process.env.LOGIN_SPERRE_SCHLUESSEL
  if (!schluessel) throw new DatenFehler('LOGIN_SPERRE_SCHLUESSEL is not set')
  return schluessel
}

type Reservierung = { gesperrt: true; gesperrtBis: Date } | { gesperrt: false; versuchId: number }

/** Checks the lock and counts the attempt in one database step (BUG-10). Fails closed. */
async function versuchBeginnen(email: string, art: Fehlversuchsart): Promise<Reservierung> {
  return zugriff('versuchBeginnen', async (supabase) => {
    const { data, error } = await supabase.rpc('login_versuch_beginnen', {
      p_schluessel: sperreSchluessel(),
      p_email: email,
      p_art: art,
    })
    if (error) throw new DatenFehler('versuchBeginnen failed', error)

    const zeile: unknown = Array.isArray(data) ? data[0] : undefined
    if (typeof zeile !== 'object' || zeile === null) {
      throw new DatenFehler('versuchBeginnen: unexpected result')
    }
    const { gesperrt, gesperrt_bis: bis, versuch_id: id } = zeile as Record<string, unknown>

    if (gesperrt === false && typeof id === 'number' && Number.isSafeInteger(id)) {
      return { gesperrt: false, versuchId: id }
    }
    if (gesperrt === true && typeof bis === 'string') {
      const gesperrtBis = new Date(bis)
      if (!Number.isNaN(gesperrtBis.getTime())) return { gesperrt: true, gesperrtBis }
    }
    throw new DatenFehler('versuchBeginnen: unexpected result')
  })
}

/** Gives a reserved attempt back. A failure only leaves one attempt too many counted. */
async function versuchZuruecknehmenStill(versuchId: number): Promise<void> {
  try {
    await zugriff('versuchZuruecknehmen', async (supabase) => {
      const { error } = await supabase.rpc('login_versuch_zuruecknehmen', {
        p_schluessel: sperreSchluessel(),
        p_versuch_id: versuchId,
      })
      if (error) throw new DatenFehler('versuchZuruecknehmen failed', error)
    })
  } catch {
    // The attempt ages out after 15 minutes.
  }
}

export type Fehlversuchsart = 'passwort' | 'totp'
export type Versuch<T> = { gesperrt: true; gesperrtBis: Date } | { gesperrt: false; wert: T }

/**
 * AC-22, EC-9: runs one credential check as a counted attempt. The attempt is reserved before
 * the check — atomically with the lock check — and given back unless `pruefen` reports wrong
 * credentials (`falsch: true`). A locked address never reaches `pruefen`.
 */
export async function alsVersuch<T>(
  email: string,
  art: Fehlversuchsart,
  pruefen: () => Promise<{ falsch: boolean; wert: T }>,
): Promise<Versuch<T>> {
  const reservierung = await versuchBeginnen(email, art)
  if (reservierung.gesperrt) return reservierung

  let ergebnis: { falsch: boolean; wert: T }
  try {
    ergebnis = await pruefen()
  } catch (fehler) {
    await versuchZuruecknehmenStill(reservierung.versuchId)
    throw fehler
  }
  if (!ergebnis.falsch) await versuchZuruecknehmenStill(reservierung.versuchId)
  return { gesperrt: false, wert: ergebnis.wert }
}

/**
 * BUG-1: the e-mail of this session, but only when a recovery link created it moments ago
 * (verified token claims, not the cookie as it stands). Any other session gets null.
 */
export async function wiederherstellungsEmail(): Promise<string | null> {
  return zugriff('wiederherstellungsEmail', async (supabase) => {
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) return null
    const { amr, email } = data.claims
    if (typeof email !== 'string' || !email) return null
    return istFrischeWiederherstellung(amr, Date.now()) ? email : null
  })
}

/** Clears the attempts of the signed-in user's own e-mail. */
export async function fehlversucheLoeschen(): Promise<void> {
  return zugriff('fehlversucheLoeschen', async (supabase) => {
    const { error } = await supabase.rpc('login_fehlversuche_loeschen')
    if (error) throw new DatenFehler('fehlversucheLoeschen failed', error)
  })
}

/**
 * Deletes the account (and its allow-list entry) through `frischeSitzung`: a session that was
 * created by a password sign-in moments ago — the database rejects any older one (BUG-3).
 */
export async function eigenesKontoLoeschen(frischeSitzung: SupabaseClient): Promise<void> {
  try {
    const { error } = await frischeSitzung.rpc('delete_own_account')
    if (error) throw new DatenFehler('eigenesKontoLoeschen failed', error)
  } catch (fehler) {
    if (fehler instanceof DatenFehler) throw fehler
    throw new DatenFehler('eigenesKontoLoeschen failed', fehler)
  }
}
