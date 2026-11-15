'use server'

// Server Actions of the account settings (PROJ-1): display name, e-mail, password,
// two-factor sign-in and account deletion. Every action follows React `useActionState`.
import { createClient as createEinmalClient, type SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { alsVersuch, anzeigenameAendern, eigenesKontoLoeschen } from './konto.data'
import {
  AKTIVITAET_COOKIE,
  authFehler,
  fehlerMeldung,
  sperrMeldung,
  type AuthFehler,
} from './konto.rules'
import {
  anzeigenameSchema,
  emailSchema,
  kontoLoeschenSchema,
  passwortAendernSchema,
  sichereRuecksprungadresse,
  totpCodeSchema,
} from './konto.schema'
import { sendeHinweisAlteAdresse, sendeSicherheitshinweis } from './mail.integration'

export type AktionsErgebnis = {
  ok: boolean
  meldung?: string // German text (error or confirmation)
  code?: AuthFehler | 'gesperrt' | 'eingabe'
  feldFehler?: Record<string, string> // first Zod message per field
  einrichtung?: { factorId: string; qrCode: string; secret: string } // 2FA enrolment step
}

type Client = SupabaseClient
type Sitzung = { supabase: Client; email: string }
type SupabaseFehler = Parameters<typeof authFehler>[0]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE_FEHLT = 'Der Code besteht aus 6 Ziffern.'

function fehler(code: AuthFehler): AktionsErgebnis {
  return { ok: false, code, meldung: fehlerMeldung(code) }
}

/** Never passes a raw Supabase message on. */
function supabaseFehler(error: SupabaseFehler): AktionsErgebnis {
  return fehler(authFehler(error))
}

/** A form value as string; a missing field or an uploaded file becomes undefined. */
function feld(formData: FormData, name: string): string | undefined {
  const wert = formData.get(name)
  return typeof wert === 'string' ? wert : undefined
}

/** First Zod message per field; `einzelfeld` names the field of a non-object schema. */
function eingabeFehler(error: ZodError, einzelfeld = 'formular'): AktionsErgebnis {
  const feldFehler: Record<string, string> = {}
  for (const issue of error.issues) {
    const name = typeof issue.path[0] === 'string' ? issue.path[0] : einzelfeld
    feldFehler[name] ??= issue.message
  }
  return { ok: false, code: 'eingabe', feldFehler }
}

/**
 * Signed-in user of this request, or null. A session that still owes its second factor counts
 * as not signed in: it must not change the account (SEC-03).
 */
async function sitzungLesen(): Promise<Sitzung | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const email = data?.user?.email
  if (error || !email) return null

  const { data: aal, error: aalFehler } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalFehler || !aal) return null
  if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return null

  return { supabase, email }
}

/**
 * EC-3, BUG-7: a session that ended meanwhile (other tab, other device, server-side expiry)
 * leads to the sign-in window and afterwards back to the page the form was sent from.
 */
async function zurAnmeldung(): Promise<never> {
  let herkunft: string | undefined
  try {
    const referer = (await headers()).get('referer')
    if (referer) {
      const url = new URL(referer)
      herkunft = url.pathname + url.search
    }
  } catch {
    // Without a usable referer the sign-in leads to the default page.
  }
  const weiter = sichereRuecksprungadresse(herkunft, '')
  redirect(weiter ? `/anmelden?weiter=${encodeURIComponent(weiter)}` : '/anmelden')
}

/** Runs one action for the signed-in user; anything thrown becomes "service unavailable". */
async function mitSitzung(
  aktion: (sitzung: Sitzung) => Promise<AktionsErgebnis>,
): Promise<AktionsErgebnis> {
  let ergebnis: AktionsErgebnis
  try {
    const sitzung = await sitzungLesen()
    ergebnis = sitzung ? await aktion(sitzung) : fehler('nicht_angemeldet')
  } catch (ausnahme) {
    // Only the error name: the error itself may carry request details.
    console.error(
      '[konto/actions] Aktion fehlgeschlagen:',
      ausnahme instanceof Error ? ausnahme.name : 'unbekannt',
    )
    return fehler('dienst_nicht_erreichbar')
  }
  // Outside the try block: redirect() throws by design.
  if (ergebnis.code === 'nicht_angemeldet') await zurAnmeldung()
  return ergebnis
}

/** AC-22: rejection while the address is locked. */
function gesperrt(gesperrtBis: Date): AktionsErgebnis {
  return { ok: false, code: 'gesperrt', meldung: sperrMeldung(gesperrtBis, new Date()) }
}

type FrischeAnmeldung = { ergebnis: AktionsErgebnis; einmal?: never } | { ergebnis: null; einmal: Client }

/**
 * Confirms the current password through a sign-in that counts as an attempt. It runs on a
 * throw-away client, so the user's cookie session is never replaced. On success the caller gets
 * that fresh session and must end it (or use it, e.g. for the deletion that demands it).
 */
async function frischAnmelden(
  email: string,
  passwort: string,
  captchaToken: string | undefined,
): Promise<FrischeAnmeldung> {
  // Supabase has CAPTCHA switched on: without a token the sign-in can only fail.
  if (!captchaToken) return { ergebnis: fehler('captcha') }

  const einmal = createEinmalClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
  const versuch = await alsVersuch(email, 'passwort', async () => {
    const { error } = await einmal.auth.signInWithPassword({
      email,
      password: passwort,
      options: { captchaToken },
    })
    const code = error ? authFehler(error) : null
    return { falsch: code === 'anmeldung_falsch', wert: code }
  })

  if (versuch.gesperrt) return { ergebnis: gesperrt(versuch.gesperrtBis) }
  if (versuch.wert === 'anmeldung_falsch') {
    return {
      ergebnis: { ok: false, code: 'anmeldung_falsch', meldung: 'Das aktuelle Passwort ist falsch.' },
    }
  }
  if (versuch.wert) return { ergebnis: fehler(versuch.wert) }
  return { ergebnis: null, einmal }
}

/** Ends a throw-away session. A failure here changes nothing. */
async function beenden(einmal: Client): Promise<void> {
  await einmal.auth.signOut({ scope: 'local' }).catch(() => undefined)
}

/** The user's TOTP factors. Unverified factors only appear in `all`. */
async function faktorenLesen(supabase: Client) {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error || !data) return { fehler: supabaseFehler(error) }
  const totp = data.all.filter((faktor) => faktor.factor_type === 'totp')
  return {
    alle: data.all,
    verifiziert: totp.filter((faktor) => faktor.status === 'verified'),
    unbestaetigt: totp.filter((faktor) => faktor.status === 'unverified'),
  }
}

/** Checks a TOTP code against the user's verified authenticators as one counted attempt. */
async function codePruefen(supabase: Client, email: string, code: string): Promise<AktionsErgebnis> {
  const versuch = await alsVersuch(email, 'totp', async () => {
    const faktoren = await faktorenLesen(supabase)
    if (faktoren.fehler) return { falsch: false, wert: faktoren.fehler }

    let ausfall = false
    for (const faktor of faktoren.verifiziert) {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: faktor.id, code })
      if (!error) return { falsch: false, wert: { ok: true } }
      if (authFehler(error) === 'dienst_nicht_erreichbar') ausfall = true
    }
    // An outage is not a wrong code and must not lock the user out.
    if (ausfall) return { falsch: false, wert: fehler('dienst_nicht_erreichbar') }
    return { falsch: true, wert: fehler('code_falsch') }
  })
  return versuch.gesperrt ? gesperrt(versuch.gesperrtBis) : versuch.wert
}

/** AC-15: sets or clears the display name. Field: `anzeigename`. */
export async function anzeigenameSpeichern(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async () => {
    const eingabe = anzeigenameSchema.safeParse(feld(formData, 'anzeigename'))
    if (!eingabe.success) return eingabeFehler(eingabe.error, 'anzeigename')

    await anzeigenameAendern(eingabe.data)
    revalidatePath('/', 'layout') // the status line shows the name
    return { ok: true, meldung: 'Anzeigename gespeichert.' }
  })
}

/** AC-17, EC-8: requests a new login address. Field: `email`. */
export async function emailAendern(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async ({ supabase, email: alteAdresse }) => {
    const eingabe = emailSchema.safeParse(feld(formData, 'email'))
    if (!eingabe.success) return eingabeFehler(eingabe.error, 'email')

    const neueAdresse = eingabe.data
    if (neueAdresse === alteAdresse.toLowerCase()) return fehler('adresse_nicht_verwendbar')

    const basis = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
    const { error } = await supabase.auth.updateUser(
      { email: neueAdresse },
      { emailRedirectTo: `${basis}/auth/bestaetigen` },
    )
    // EC-8: an address that belongs to another account gets the same message, without a reason.
    if (error) return supabaseFehler(error)

    await sendeHinweisAlteAdresse(alteAdresse, neueAdresse)
    return {
      ok: true,
      meldung:
        'Wir haben einen Bestätigungslink an die neue Adresse gesendet. Sie gilt erst nach der Bestätigung als Login.',
    }
  })
}

/** AC-16, AC-27. Fields: `aktuellesPasswort`, `passwort`, `passwortWiederholung`, `captchaToken`. */
export async function passwortAendern(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async ({ supabase, email }) => {
    const eingabe = passwortAendernSchema.safeParse({
      aktuellesPasswort: feld(formData, 'aktuellesPasswort'),
      passwort: feld(formData, 'passwort'),
      passwortWiederholung: feld(formData, 'passwortWiederholung'),
    })
    if (!eingabe.success) return eingabeFehler(eingabe.error)

    const anmeldung = await frischAnmelden(
      email,
      eingabe.data.aktuellesPasswort,
      feld(formData, 'captchaToken'),
    )
    if (anmeldung.ergebnis) return anmeldung.ergebnis
    await beenden(anmeldung.einmal)

    // BUG-3: with "require current password" switched on, Supabase itself demands it as well.
    const { error } = await supabase.auth.updateUser({
      password: eingabe.data.passwort,
      current_password: eingabe.data.aktuellesPasswort,
    })
    if (error) {
      if (error.code === 'same_password') {
        return {
          ok: false,
          code: 'eingabe',
          meldung: 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
        }
      }
      return supabaseFehler(error)
    }

    await sendeSicherheitshinweis(email, 'passwort_geaendert')
    return { ok: true, meldung: 'Passwort geändert.' }
  })
}

/**
 * AC-12, AC-14: starts enrolling an authenticator app. Field: `code` — only required when an
 * authenticator is already active (adding the second one).
 */
export async function zweiFaktorStarten(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async ({ supabase, email }) => {
    const faktoren = await faktorenLesen(supabase)
    if (faktoren.fehler) return faktoren.fehler

    const aktiv = faktoren.verifiziert.length
    if (aktiv >= 2) {
      return { ok: false, meldung: 'Es sind bereits zwei Authenticator-Apps eingerichtet.' }
    }

    if (aktiv > 0) {
      const eingabe = totpCodeSchema.safeParse(feld(formData, 'code'))
      if (!eingabe.success) return eingabeFehler(eingabe.error, 'code')
      const pruefung = await codePruefen(supabase, email, eingabe.data)
      if (!pruefung.ok) return pruefung
    }

    // Leftovers of an abandoned enrolment would block the friendly name.
    for (const faktor of faktoren.unbestaetigt) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: faktor.id })
      if (error) return supabaseFehler(error)
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: aktiv === 0 ? 'Authenticator 1' : 'Authenticator 2',
    })
    if (error || !data) return supabaseFehler(error)

    return {
      ok: true,
      einrichtung: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
    }
  })
}

/** AC-12: activates the enrolled authenticator with its first code. Fields: `factorId`, `code`. */
export async function zweiFaktorBestaetigen(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async ({ supabase }) => {
    const eingabe = totpCodeSchema.safeParse(feld(formData, 'code'))
    if (!eingabe.success) return eingabeFehler(eingabe.error, 'code')

    const factorId = feld(formData, 'factorId')
    if (!factorId || !UUID.test(factorId)) return fehler('code_falsch')

    const faktoren = await faktorenLesen(supabase)
    if (faktoren.fehler) return faktoren.fehler
    // Only an own factor that is still waiting for its first code.
    if (!faktoren.unbestaetigt.some((faktor) => faktor.id === factorId)) return fehler('code_falsch')

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: eingabe.data })
    if (error) {
      const code = authFehler(error)
      return fehler(code === 'dienst_nicht_erreichbar' ? code : 'code_falsch')
    }

    revalidatePath('/', 'layout')
    return { ok: true, meldung: 'Zwei-Faktor-Anmeldung ist eingeschaltet.' }
  })
}

/** AC-14, AC-27: switches 2FA off, only with a valid code. Field: `code`. */
export async function zweiFaktorAusschalten(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return mitSitzung(async ({ supabase, email }) => {
    const eingabe = totpCodeSchema.safeParse(feld(formData, 'code'))
    if (!eingabe.success) return eingabeFehler(eingabe.error, 'code')

    const pruefung = await codePruefen(supabase, email, eingabe.data)
    if (!pruefung.ok) return pruefung

    const faktoren = await faktorenLesen(supabase)
    if (faktoren.fehler) return faktoren.fehler
    for (const faktor of faktoren.alle) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: faktor.id })
      if (error) return supabaseFehler(error)
    }

    await sendeSicherheitshinweis(email, 'zwei_faktor_aus')
    revalidatePath('/', 'layout')
    return { ok: true, meldung: 'Zwei-Faktor-Anmeldung ist ausgeschaltet.' }
  })
}

/**
 * AC-19, AC-20, EC-6: deletes the own account. Fields: `passwort`, `code` (mandatory with 2FA),
 * `bestaetigung`, `captchaToken`. Any wrong input deletes nothing.
 */
export async function kontoLoeschen(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  const ergebnis = await mitSitzung(async ({ supabase, email }) => {
    const eingabe = kontoLoeschenSchema.safeParse({
      passwort: feld(formData, 'passwort'),
      code: feld(formData, 'code') || undefined,
      bestaetigung: feld(formData, 'bestaetigung'),
    })
    if (!eingabe.success) return eingabeFehler(eingabe.error)

    const anmeldung = await frischAnmelden(email, eingabe.data.passwort, feld(formData, 'captchaToken'))
    if (anmeldung.ergebnis) return anmeldung.ergebnis

    // BUG-3: the database only deletes through a session that was just created with the
    // password (and, with 2FA, a fresh code) - so the whole check runs on that session.
    const { einmal } = anmeldung
    try {
      const faktoren = await faktorenLesen(einmal)
      if (faktoren.fehler) return faktoren.fehler
      if (faktoren.verifiziert.length > 0) {
        if (!eingabe.data.code) return { ok: false, code: 'eingabe', feldFehler: { code: CODE_FEHLT } }
        const codePruefung = await codePruefen(einmal, email, eingabe.data.code)
        if (!codePruefung.ok) return codePruefung
      }

      await eigenesKontoLoeschen(einmal)
    } finally {
      // After a deletion this fails harmlessly: the session is gone with the account.
      await beenden(einmal)
    }

    // The account is gone: clearing the session cookies is best effort.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    ;(await cookies()).delete(AKTIVITAET_COOKIE)
    return { ok: true }
  })

  if (!ergebnis.ok) return ergebnis
  redirect('/anmelden') // throws by design, so it stays outside of every try/catch
}
