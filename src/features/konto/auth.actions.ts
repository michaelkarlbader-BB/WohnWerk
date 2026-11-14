'use server'

// Server Actions for sign-in, registration, password reset and sign-out (PROJ-1).
// Nothing here logs passwords, tokens, codes or e-mail addresses, and no raw Supabase
// message ever reaches the browser.
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fehlversuchZaehlen, fehlversucheLoeschen, sperreLesen } from './konto.data'
import {
  AKTIVITAET_COOKIE,
  AKTIVITAET_COOKIE_OPTIONEN,
  MELDUNG,
  authFehler,
  fehlerMeldung,
  istInaktiv,
  sperrMeldung,
  type AuthFehler,
} from './konto.rules'
import {
  anmeldenSchema,
  emailSchema,
  passwortNeuSchema,
  registrierenSchema,
  sichereRuecksprungadresse,
  totpCodeSchema,
} from './konto.schema'
import { sendeBereitsRegistriert, sendeSicherheitshinweis } from './mail.integration'

export type AktionsErgebnis = {
  ok: boolean
  /** German text to show (error or confirmation). */
  meldung?: string
  code?: AuthFehler | 'gesperrt' | 'eingabe' | 'code_noetig'
  /** First Zod message per field name. */
  feldFehler?: Record<string, string>
  /** Login: the second factor is required next. */
  schritt?: 'code'
}

type Client = Awaited<ReturnType<typeof createClient>>
type Weiterleitung = { ziel: string }

const ERNEUT_GESENDET =
  'Falls die Adresse registriert und noch nicht bestätigt ist, haben wir die E-Mail erneut gesendet.'
const LINK_ABGELAUFEN = 'Der Link ist abgelaufen. Bitte fordere einen neuen an.'
const CODE_NOETIG = 'Bitte gib zusätzlich den Code aus deiner Authenticator-App ein.'
const GLEICHES_PASSWORT = 'Das neue Passwort muss sich vom bisherigen unterscheiden.'

function fehler(code: AuthFehler): AktionsErgebnis {
  return { ok: false, code, meldung: fehlerMeldung(code) }
}

/**
 * Runs an action body. Anything thrown (DatenFehler, network) becomes "service unreachable";
 * a redirect is issued outside the try block because `redirect()` throws by design.
 */
async function ausfuehren(
  aktion: () => Promise<AktionsErgebnis | Weiterleitung>,
): Promise<AktionsErgebnis> {
  let ergebnis: AktionsErgebnis | Weiterleitung
  try {
    ergebnis = await aktion()
  } catch {
    return fehler('dienst_nicht_erreichbar')
  }
  if ('ziel' in ergebnis) redirect(ergebnis.ziel)
  return ergebnis
}

function text(formData: FormData, name: string): string | undefined {
  const wert = formData.get(name)
  return typeof wert === 'string' ? wert : undefined
}

function eingabeFehler(error: z.ZodError): AktionsErgebnis {
  const feldFehler: Record<string, string> = {}
  for (const issue of error.issues) {
    const feld = String(issue.path[0] ?? 'formular')
    if (!(feld in feldFehler)) feldFehler[feld] = issue.message
  }
  return { ok: false, code: 'eingabe', feldFehler }
}

/** Base URL of the confirmation route that every mail link points to. */
function bestaetigenUrl(): string {
  return `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')}/auth/bestaetigen`
}

/** Without this cookie the proxy treats the fresh session as inactive and signs it out. */
async function aktivitaetSetzen(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AKTIVITAET_COOKIE, String(Date.now()), {
    ...AKTIVITAET_COOKIE_OPTIONEN,
    secure: process.env.NODE_ENV === 'production',
  })
}

/** A failure to clear the attempts must not block a successful sign-in. */
async function fehlversucheLoeschenStill(): Promise<void> {
  try {
    await fehlversucheLoeschen()
  } catch {
    // The attempts simply age out.
  }
}

/** True while the session still owes the second factor. Fails closed. */
async function zweiterFaktorOffen(supabase: Client): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return true
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  } catch {
    return true
  }
}

/** Lock check (AC-22). Returns the rejection while the address is locked, else null. */
async function sperrePruefen(email: string): Promise<AktionsErgebnis | null> {
  const sperre = await sperreLesen(email)
  if (!sperre.gesperrt) return null
  const jetzt = new Date()
  return { ok: false, code: 'gesperrt', meldung: sperrMeldung(sperre.gesperrtBis ?? jetzt, jetzt) }
}

/**
 * Checks a TOTP code against the user's verified factors (there may be two authenticators),
 * with lock check before and attempt counting after. Returns null when the code was accepted.
 */
async function totpPruefen(
  supabase: Client,
  email: string,
  code: string,
): Promise<AktionsErgebnis | null> {
  const gesperrt = await sperrePruefen(email)
  if (gesperrt) return gesperrt

  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error || !data) return fehler(authFehler(error))

  for (const faktor of data.totp.filter((f) => f.status === 'verified')) {
    const { error: pruefFehler } = await supabase.auth.mfa.challengeAndVerify({
      factorId: faktor.id,
      code,
    })
    if (!pruefFehler) return null
    // An outage is not a wrong code: do not count it.
    if (authFehler(pruefFehler) === 'dienst_nicht_erreichbar') {
      return fehler('dienst_nicht_erreichbar')
    }
  }

  await fehlversuchZaehlen(email, 'totp')
  return fehler('code_falsch')
}

export async function anmelden(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const eingabe = anmeldenSchema.safeParse({
      email: text(formData, 'email'),
      passwort: text(formData, 'passwort'),
    })
    if (!eingabe.success) return eingabeFehler(eingabe.error)
    const { email, passwort } = eingabe.data

    const captchaToken = text(formData, 'captchaToken')
    if (!captchaToken) return fehler('captcha')

    // AC-22: a locked address is rejected before the credentials are even looked at.
    const gesperrt = await sperrePruefen(email)
    if (gesperrt) return gesperrt

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort,
      options: { captchaToken },
    })
    if (error) {
      const kategorie = authFehler(error)
      if (kategorie === 'anmeldung_falsch') await fehlversuchZaehlen(email, 'passwort')
      return fehler(kategorie)
    }

    await aktivitaetSetzen()
    // The attempts stay until the second factor has passed.
    if (await zweiterFaktorOffen(supabase)) return { ok: true, schritt: 'code' }

    await fehlversucheLoeschenStill()
    return { ziel: sichereRuecksprungadresse(text(formData, 'weiter')) }
  })
}

export async function zweiFaktorPruefen(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const code = totpCodeSchema.safeParse(text(formData, 'code'))
    if (!code.success) {
      return { ok: false, code: 'eingabe', feldFehler: { code: code.error.issues[0].message } }
    }

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const email = data?.user?.email
    if (!email) return fehler('nicht_angemeldet')

    const abgelehnt = await totpPruefen(supabase, email, code.data)
    if (abgelehnt) return abgelehnt

    await aktivitaetSetzen()
    await fehlversucheLoeschenStill()
    return { ziel: sichereRuecksprungadresse(text(formData, 'weiter')) }
  })
}

export async function registrieren(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const eingabe = registrierenSchema.safeParse({
      email: text(formData, 'email'),
      passwort: text(formData, 'passwort'),
      passwortWiederholung: text(formData, 'passwortWiederholung'),
    })
    if (!eingabe.success) return eingabeFehler(eingabe.error)
    const { email, passwort } = eingabe.data

    const captchaToken = text(formData, 'captchaToken')
    if (!captchaToken) return fehler('captcha')

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: passwort,
      options: { captchaToken, emailRedirectTo: bestaetigenUrl() },
    })
    if (error) {
      const kategorie = authFehler(error)
      const benannt: AuthFehler[] = [
        'nur_auf_einladung',
        'passwort_zu_kurz',
        'captcha',
        'dienst_nicht_erreichbar',
      ]
      return fehler(benannt.includes(kategorie) ? kategorie : 'unerwartet')
    }

    // With "Confirm email" on, Supabase answers a sign-up for an existing address with an
    // obfuscated user without identities. Same answer as for a new address (AC-24); the
    // owner of the address gets a notice instead.
    if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
      await sendeBereitsRegistriert(email).catch(() => false)
    }
    return { ok: true, meldung: MELDUNG.registriert }
  })
}

export async function bestaetigungErneutSenden(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const email = emailSchema.safeParse(text(formData, 'email'))
    if (!email.success) {
      return { ok: false, code: 'eingabe', feldFehler: { email: email.error.issues[0].message } }
    }

    const captchaToken = text(formData, 'captchaToken')
    if (!captchaToken) return fehler('captcha')

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.data,
      options: { captchaToken, emailRedirectTo: bestaetigenUrl() },
    })
    const kategorie = error ? authFehler(error) : null
    if (kategorie === 'captcha' || kategorie === 'dienst_nicht_erreichbar') return fehler(kategorie)

    // Every other outcome gets the same answer: no account enumeration.
    return { ok: true, meldung: ERNEUT_GESENDET }
  })
}

export async function passwortVergessen(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const email = emailSchema.safeParse(text(formData, 'email'))
    if (!email.success) {
      return { ok: false, code: 'eingabe', feldFehler: { email: email.error.issues[0].message } }
    }

    const captchaToken = text(formData, 'captchaToken')
    if (!captchaToken) return fehler('captcha')

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      captchaToken,
      redirectTo: bestaetigenUrl(),
    })
    const kategorie = error ? authFehler(error) : null
    if (kategorie === 'captcha' || kategorie === 'dienst_nicht_erreichbar') return fehler(kategorie)

    // AC-11: same answer whether or not an account exists.
    return { ok: true, meldung: MELDUNG.passwortVergessen }
  })
}

export async function passwortNeuSetzen(
  _vorher: AktionsErgebnis,
  formData: FormData,
): Promise<AktionsErgebnis> {
  return ausfuehren(async () => {
    const eingabe = passwortNeuSchema.safeParse({
      passwort: text(formData, 'passwort'),
      passwortWiederholung: text(formData, 'passwortWiederholung'),
    })
    if (!eingabe.success) return eingabeFehler(eingabe.error)

    const supabase = await createClient()
    // The recovery link created the session.
    const { data } = await supabase.auth.getUser()
    const email = data?.user?.email
    if (!email) return { ok: false, code: 'nicht_angemeldet', meldung: LINK_ABGELAUFEN }

    // A recovery link alone must not replace the password of a 2FA-protected account.
    if (await zweiterFaktorOffen(supabase)) {
      const roh = text(formData, 'code')?.trim()
      if (!roh) return { ok: false, code: 'code_noetig', meldung: CODE_NOETIG }

      const code = totpCodeSchema.safeParse(roh)
      if (!code.success) {
        return { ok: false, code: 'eingabe', feldFehler: { code: code.error.issues[0].message } }
      }
      const abgelehnt = await totpPruefen(supabase, email, code.data)
      if (abgelehnt) return abgelehnt
    }

    const { error } = await supabase.auth.updateUser({ password: eingabe.data.passwort })
    if (error) {
      if (error.code === 'same_password') {
        return {
          ok: false,
          code: 'eingabe',
          meldung: GLEICHES_PASSWORT,
          feldFehler: { passwort: GLEICHES_PASSWORT },
        }
      }
      return fehler(authFehler(error))
    }

    // AC-27: the notice must not block the change it reports.
    await sendeSicherheitshinweis(email, 'passwort_geaendert').catch(() => false)
    await aktivitaetSetzen()
    return { ziel: '/wohnungen' }
  })
}

async function abmeldenMit(scope: 'local' | 'global'): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope })
  } catch {
    // The visitor leaves either way.
  }
  try {
    const cookieStore = await cookies()
    cookieStore.delete(AKTIVITAET_COOKIE)
  } catch {
    // Without the cookie store there is nothing to delete.
  }
  redirect('/anmelden')
}

/** AC-9: ends this session only. Usable as a plain form action. */
export async function abmelden(_formData?: FormData): Promise<void> {
  await abmeldenMit('local')
}

/** AC-10: ends every session of the account. */
export async function ueberallAbmelden(_formData?: FormData): Promise<void> {
  await abmeldenMit('global')
}

/** AC-7: the client reports activity; an already expired session is never revived. */
export async function aktivitaetMelden(): Promise<{ aktiv: boolean }> {
  try {
    const cookieStore = await cookies()
    if (istInaktiv(cookieStore.get(AKTIVITAET_COOKIE)?.value, Date.now())) return { aktiv: false }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return { aktiv: false }

    await aktivitaetSetzen()
    return { aktiv: true }
  } catch {
    return { aktiv: false }
  }
}
