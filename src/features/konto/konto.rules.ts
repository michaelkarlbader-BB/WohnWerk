// Pure rules for PROJ-1 (account & login). No imports, no clock, no environment:
// time is always passed in.

// --- Sperre (AC-22, EC-9) ---

export const SPERRE_MAX_FEHLVERSUCHE = 5
export const SPERRE_FENSTER_MS = 15 * 60 * 1000
export const SPERRE_DAUER_MS = 15 * 60 * 1000

export type Sperrstatus = { gesperrt: boolean; gesperrtBis: Date | null }

/**
 * Reference implementation of the lock rule (the database implements the same rule in SQL):
 * 5 or more failed attempts within the last 15 minutes lock the key until 15 minutes
 * after the youngest of those attempts.
 */
export function sperrstatus(fehlversuche: readonly Date[], jetzt: Date): Sperrstatus {
  const jetztMs = jetzt.getTime()
  let anzahl = 0
  let juengster = -Infinity

  for (const versuch of fehlversuche) {
    const t = versuch.getTime()
    if (t <= jetztMs && jetztMs - t < SPERRE_FENSTER_MS) {
      anzahl += 1
      if (t > juengster) juengster = t
    }
  }

  if (anzahl >= SPERRE_MAX_FEHLVERSUCHE) {
    return { gesperrt: true, gesperrtBis: new Date(juengster + SPERRE_DAUER_MS) }
  }
  return { gesperrt: false, gesperrtBis: null }
}

export function sperrMeldung(gesperrtBis: Date, jetzt: Date): string {
  const restMs = gesperrtBis.getTime() - jetzt.getTime()
  const minuten = Math.max(1, Math.ceil(restMs / 60_000))
  const einheit = minuten === 1 ? 'Minute' : 'Minuten'
  return `Zu viele Fehlversuche. Bitte versuche es in ${minuten} ${einheit} erneut.`
}

// --- Inaktivität (AC-7) ---

/** Cookie holding the last-activity time as epoch milliseconds (decimal string). */
export const AKTIVITAET_COOKIE = 'ww-aktiv'
export const INAKTIVITAET_MAX_MS = 30 * 60 * 1000
export const AKTIVITAET_MELDE_INTERVALL_MS = 5 * 60 * 1000

const ZUKUNFT_TOLERANZ_MS = 60_000

/** Fails closed: anything that is not a plausible, recent activity timestamp counts as inactive. */
export function istInaktiv(letzteAktivitaet: string | undefined, jetztMs: number): boolean {
  if (letzteAktivitaet === undefined || !/^[1-9]\d*$/.test(letzteAktivitaet)) return true

  const wert = Number(letzteAktivitaet)
  if (!Number.isSafeInteger(wert)) return true
  if (wert - jetztMs > ZUKUNFT_TOLERANZ_MS) return true

  return jetztMs - wert > INAKTIVITAET_MAX_MS
}

// --- Meldungen (Spec-Texte) ---

export const MELDUNG = {
  anmeldungFalsch: 'E-Mail oder Passwort falsch.',
  nichtBestaetigt: 'Bitte bestätige zuerst deine E-Mail-Adresse',
  nurAufEinladung: 'WohnWerk ist derzeit nur auf Einladung nutzbar.',
  registriert: 'Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link gesendet.',
  passwortVergessen: 'Falls ein Konto existiert, haben wir eine E-Mail gesendet.',
  adresseNichtVerwendbar: 'Diese Adresse kann nicht verwendet werden.',
  codeFalsch: 'Der Code ist falsch oder abgelaufen.',
  captcha: 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.',
  passwortZuKurz: 'Das Passwort muss mindestens 12 Zeichen haben.',
  nichtAngemeldet: 'Bitte melde dich erneut an.',
  dienstNichtErreichbar:
    'Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut.',
  unerwartet: 'Das hat nicht geklappt. Bitte versuche es erneut.',
} as const

export type AuthFehler =
  | 'anmeldung_falsch'
  | 'nicht_bestaetigt'
  | 'nur_auf_einladung'
  | 'adresse_nicht_verwendbar'
  | 'code_falsch'
  | 'captcha'
  | 'passwort_zu_kurz'
  | 'nicht_angemeldet'
  | 'dienst_nicht_erreichbar'
  | 'unerwartet'

/** Marker the "Before User Created" hook puts into its rejection message. */
const EINLADUNGS_MARKER = 'nur_auf_einladung'

// Supabase Auth error codes (see @supabase/auth-js error-codes).
// Unknown e-mail and wrong password share one category on purpose (AC-6).
const CODE_ZU_FEHLER: Readonly<Record<string, AuthFehler>> = {
  invalid_credentials: 'anmeldung_falsch',
  user_not_found: 'anmeldung_falsch',
  user_banned: 'anmeldung_falsch',

  email_not_confirmed: 'nicht_bestaetigt',
  captcha_failed: 'captcha',
  weak_password: 'passwort_zu_kurz',

  email_exists: 'adresse_nicht_verwendbar',
  user_already_exists: 'adresse_nicht_verwendbar',
  email_address_invalid: 'adresse_nicht_verwendbar',
  email_address_not_authorized: 'adresse_nicht_verwendbar',

  mfa_verification_failed: 'code_falsch',
  mfa_challenge_expired: 'code_falsch',
  mfa_verification_rejected: 'code_falsch',
  mfa_factor_not_found: 'code_falsch',

  session_not_found: 'nicht_angemeldet',
  session_expired: 'nicht_angemeldet',
  no_authorization: 'nicht_angemeldet',
  bad_jwt: 'nicht_angemeldet',
  refresh_token_not_found: 'nicht_angemeldet',
  refresh_token_already_used: 'nicht_angemeldet',
  insufficient_aal: 'nicht_angemeldet',

  hook_timeout: 'dienst_nicht_erreichbar',
  hook_timeout_after_retry: 'dienst_nicht_erreichbar',
  request_timeout: 'dienst_nicht_erreichbar',
  unexpected_failure: 'dienst_nicht_erreichbar',
  over_request_rate_limit: 'dienst_nicht_erreichbar',
  over_email_send_rate_limit: 'dienst_nicht_erreichbar',
}

const NETZWERK_MUSTER = /fetch|network|timeout|timed out|econn|enotfound|socket/i

export function authFehler(
  fehler: { code?: string | null; status?: number | null; message?: string | null } | null | undefined,
): AuthFehler {
  if (!fehler) return 'unerwartet'

  const { code, status, message } = fehler

  // Before the code mapping: Supabase may attach any (or no) code to a hook rejection.
  if (message?.includes(EINLADUNGS_MARKER)) return 'nur_auf_einladung'

  if (code) {
    return Object.hasOwn(CODE_ZU_FEHLER, code) ? CODE_ZU_FEHLER[code] : 'unerwartet'
  }

  if (status === 0) return 'dienst_nicht_erreichbar'
  if (status == null) {
    return message && NETZWERK_MUSTER.test(message) ? 'dienst_nicht_erreichbar' : 'unerwartet'
  }
  if (status >= 500) return 'dienst_nicht_erreichbar'

  return 'unerwartet'
}

const FEHLER_ZU_MELDUNG: Readonly<Record<AuthFehler, string>> = {
  anmeldung_falsch: MELDUNG.anmeldungFalsch,
  nicht_bestaetigt: MELDUNG.nichtBestaetigt,
  nur_auf_einladung: MELDUNG.nurAufEinladung,
  adresse_nicht_verwendbar: MELDUNG.adresseNichtVerwendbar,
  code_falsch: MELDUNG.codeFalsch,
  captcha: MELDUNG.captcha,
  passwort_zu_kurz: MELDUNG.passwortZuKurz,
  nicht_angemeldet: MELDUNG.nichtAngemeldet,
  dienst_nicht_erreichbar: MELDUNG.dienstNichtErreichbar,
  unerwartet: MELDUNG.unerwartet,
}

export function fehlerMeldung(fehler: AuthFehler): string {
  return FEHLER_ZU_MELDUNG[fehler]
}
