import { z } from 'zod'

export const PASSWORT_MIN = 12
export const PASSWORT_MAX = 72

const EMAIL_FEHLER = 'Bitte gib eine gültige E-Mail-Adresse ein.'
const PASSWORT_FEHLT = 'Bitte gib dein Passwort ein.'
const PASSWORT_ZU_KURZ = `Das Passwort muss mindestens ${PASSWORT_MIN} Zeichen haben.`
const PASSWORT_ZU_LANG = `Das Passwort darf höchstens ${PASSWORT_MAX} Zeichen haben.`
const ANZEIGENAME_ZU_LANG = 'Der Anzeigename darf höchstens 60 Zeichen haben.'
const CODE_FEHLER = 'Der Code besteht aus 6 Ziffern.'
const BESTAETIGUNG_FEHLER = 'Bitte gib LÖSCHEN ein.'
const PASSWOERTER_UNGLEICH = 'Die Passwörter stimmen nicht überein.'

export const emailSchema = z
  .string({ error: EMAIL_FEHLER })
  .trim()
  .toLowerCase()
  .max(254, { error: EMAIL_FEHLER })
  .pipe(z.email({ error: EMAIL_FEHLER }))

/** Neues Passwort – bewusst ohne trim, Leerzeichen gehören zum Passwort. */
export const passwortSchema = z
  .string({ error: PASSWORT_ZU_KURZ })
  .min(PASSWORT_MIN, { error: PASSWORT_ZU_KURZ })
  .max(PASSWORT_MAX, { error: PASSWORT_ZU_LANG })

/** Vorhandenes Passwort (Anmeldung, Bestätigung) – keine Mindestlänge, die Prüfung macht die Anmeldung. */
export const vorhandenesPasswortSchema = z
  .string({ error: PASSWORT_FEHLT })
  .min(1, { error: PASSWORT_FEHLT })
  .max(PASSWORT_MAX, { error: PASSWORT_FEHLT })

export const anzeigenameSchema = z
  .string({ error: ANZEIGENAME_ZU_LANG })
  .trim()
  .max(60, { error: ANZEIGENAME_ZU_LANG })
  .transform((wert) => (wert === '' ? null : wert))

export const totpCodeSchema = z
  .string({ error: CODE_FEHLER })
  .trim()
  .regex(/^[0-9]{6}$/, { error: CODE_FEHLER })

export const loeschBestaetigungSchema = z.literal('LÖSCHEN', { error: BESTAETIGUNG_FEHLER })

const GESPERRTE_RUECKSPRUNGZIELE = [
  '/anmelden',
  '/registrieren',
  '/passwort-vergessen',
  '/passwort-neu',
  '/link-ungueltig',
  '/auth/',
]

// Steuerzeichen (inkl. Tab, CR, LF) und Unicode-Zeilenumbrüche
const STEUERZEICHEN = /[\p{Cc}\p{Zl}\p{Zp}]/u

/** Schutz vor offenen Weiterleitungen: nur interne Pfade, sonst der Fallback. */
export function sichereRuecksprungadresse(wert: unknown, fallback = '/wohnungen'): string {
  if (typeof wert !== 'string') return fallback
  if (wert.length > 2000) return fallback
  if (!wert.startsWith('/')) return fallback
  if (wert.includes('//') || wert.includes('\\')) return fallback
  if (STEUERZEICHEN.test(wert)) return fallback
  if (GESPERRTE_RUECKSPRUNGZIELE.some((ziel) => wert.startsWith(ziel))) return fallback
  return wert
}

const passwoerterGleich = (daten: { passwort: string; passwortWiederholung: string }) =>
  daten.passwort === daten.passwortWiederholung

const UNGLEICH = { error: PASSWOERTER_UNGLEICH, path: ['passwortWiederholung'] }

export const anmeldenSchema = z.object({
  email: emailSchema,
  passwort: vorhandenesPasswortSchema,
})

export const registrierenSchema = z
  .object({
    email: emailSchema,
    passwort: passwortSchema,
    passwortWiederholung: z.string({ error: PASSWOERTER_UNGLEICH }),
  })
  .refine(passwoerterGleich, UNGLEICH)

export const passwortNeuSchema = z
  .object({
    passwort: passwortSchema,
    passwortWiederholung: z.string({ error: PASSWOERTER_UNGLEICH }),
  })
  .refine(passwoerterGleich, UNGLEICH)

export const passwortAendernSchema = z
  .object({
    aktuellesPasswort: vorhandenesPasswortSchema,
    passwort: passwortSchema,
    passwortWiederholung: z.string({ error: PASSWOERTER_UNGLEICH }),
  })
  .refine(passwoerterGleich, UNGLEICH)

export const kontoLoeschenSchema = z.object({
  passwort: vorhandenesPasswortSchema,
  code: totpCodeSchema.optional(),
  bestaetigung: loeschBestaetigungSchema,
})
