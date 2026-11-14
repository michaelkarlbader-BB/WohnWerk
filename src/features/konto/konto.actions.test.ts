// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Faktor = { id: string; factor_type: string; status: 'verified' | 'unverified' }

const F1 = '11111111-1111-4111-8111-111111111111'
const F2 = '22222222-2222-4222-8222-222222222222'
const F3 = '33333333-3333-4333-8333-333333333333'
const NEU = '99999999-9999-4999-8999-999999999999'
const EMAIL = 'vermieter@example.com'
const RICHTIGER_CODE = '123456'
const FALSCHER_CODE = '000000'
const ALTES_PASSWORT = 'altes-passwort-123'
const NEUES_PASSWORT = 'neues-passwort-456'

// Hand-written fakes: the cookie client of the request, the throw-away client of the
// password check, and the mocked modules around them.
const h = vi.hoisted(() => {
  const zustand = {
    faktoren: [] as { id: string; factor_type: string; status: 'verified' | 'unverified' }[],
  }
  const cookieClient = {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
        challengeAndVerify: vi.fn(),
        enroll: vi.fn(),
        unenroll: vi.fn(),
      },
    },
  }
  const einmalClient = { auth: { signInWithPassword: vi.fn(), signOut: vi.fn() } }
  return {
    zustand,
    cookieClient,
    einmalClient,
    createEinmalClient: vi.fn(),
    cookieDelete: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    anzeigenameAendern: vi.fn(),
    eigenesKontoLoeschen: vi.fn(),
    fehlversuchZaehlen: vi.fn(),
    sperreLesen: vi.fn(),
    sendeHinweisAlteAdresse: vi.fn(),
    sendeSicherheitshinweis: vi.fn(),
  }
})

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: h.cookieDelete }) }))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.cookieClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: h.createEinmalClient }))
vi.mock('./konto.data', () => ({
  anzeigenameAendern: h.anzeigenameAendern,
  eigenesKontoLoeschen: h.eigenesKontoLoeschen,
  fehlversuchZaehlen: h.fehlversuchZaehlen,
  sperreLesen: h.sperreLesen,
}))
vi.mock('./mail.integration', () => ({
  sendeHinweisAlteAdresse: h.sendeHinweisAlteAdresse,
  sendeSicherheitshinweis: h.sendeSicherheitshinweis,
}))

import {
  anzeigenameSpeichern,
  emailAendern,
  kontoLoeschen,
  passwortAendern,
  zweiFaktorAusschalten,
  zweiFaktorBestaetigen,
  zweiFaktorStarten,
  type AktionsErgebnis,
} from './konto.actions'

const VORHER: AktionsErgebnis = { ok: true }
const auth = h.cookieClient.auth
const mfa = auth.mfa

function fd(felder: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, wert] of Object.entries(felder)) formData.set(name, wert)
  return formData
}

const faktor = (id: string, status: Faktor['status'] = 'verified'): Faktor => ({
  id,
  factor_type: 'totp',
  status,
})

const PASSWORT_FORMULAR = {
  aktuellesPasswort: ALTES_PASSWORT,
  passwort: NEUES_PASSWORT,
  passwortWiederholung: NEUES_PASSWORT,
  captchaToken: 'captcha-ok',
}
const LOESCH_FORMULAR = {
  passwort: ALTES_PASSWORT,
  code: '',
  bestaetigung: 'LÖSCHEN',
  captchaToken: 'captcha-ok',
}

const NICHT_ANGEMELDET = {
  ok: false,
  code: 'nicht_angemeldet',
  meldung: 'Bitte melde dich erneut an.',
}
const CODE_FALSCH = {
  ok: false,
  code: 'code_falsch',
  meldung: 'Der Code ist falsch oder abgelaufen.',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projekt.supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wohnwerk.test/')

  h.zustand.faktoren = []

  auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: EMAIL } }, error: null })
  auth.updateUser.mockResolvedValue({ data: { user: {} }, error: null })
  auth.signOut.mockResolvedValue({ error: null })
  mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal1' },
    error: null,
  })
  mfa.listFactors.mockImplementation(async () => ({
    data: {
      all: [...h.zustand.faktoren],
      totp: h.zustand.faktoren.filter((f) => f.status === 'verified'),
    },
    error: null,
  }))
  mfa.challengeAndVerify.mockImplementation(async ({ code }: { code: string }) =>
    code === RICHTIGER_CODE
      ? { data: {}, error: null }
      : { data: null, error: { code: 'mfa_verification_failed', status: 422, message: 'raw supabase text' } },
  )
  mfa.enroll.mockResolvedValue({
    data: { id: NEU, type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'GEHEIM', uri: 'otpauth://x' } },
    error: null,
  })
  mfa.unenroll.mockImplementation(async ({ factorId }: { factorId: string }) => ({
    data: { id: factorId },
    error: null,
  }))

  h.createEinmalClient.mockReturnValue(h.einmalClient)
  h.einmalClient.auth.signInWithPassword.mockImplementation(
    async ({ password }: { password: string }) =>
      password === ALTES_PASSWORT
        ? { data: { session: {} }, error: null }
        : { data: null, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } },
  )
  h.einmalClient.auth.signOut.mockResolvedValue({ error: null })

  h.redirect.mockImplementation((ziel: string) => {
    throw new Error(`REDIRECT:${ziel}`)
  })
  h.sperreLesen.mockResolvedValue({ gesperrt: false, gesperrtBis: null })
  h.sendeHinweisAlteAdresse.mockResolvedValue(true)
  h.sendeSicherheitshinweis.mockResolvedValue(true)
})

const gesperrtIn10Minuten = () =>
  h.sperreLesen.mockResolvedValue({
    gesperrt: true,
    gesperrtBis: new Date(Date.now() + 10 * 60_000 - 5_000),
  })

const ALLE_AKTIONEN: [string, typeof anzeigenameSpeichern, Record<string, string>][] = [
  ['anzeigenameSpeichern', anzeigenameSpeichern, { anzeigename: 'Micha' }],
  ['emailAendern', emailAendern, { email: 'neu@example.com' }],
  ['passwortAendern', passwortAendern, PASSWORT_FORMULAR],
  ['zweiFaktorStarten', zweiFaktorStarten, { code: RICHTIGER_CODE }],
  ['zweiFaktorBestaetigen', zweiFaktorBestaetigen, { factorId: F1, code: RICHTIGER_CODE }],
  ['zweiFaktorAusschalten', zweiFaktorAusschalten, { code: RICHTIGER_CODE }],
  ['kontoLoeschen', kontoLoeschen, LOESCH_FORMULAR],
]

function erwarteKeineWirkung() {
  expect(mfa.listFactors).not.toHaveBeenCalled()
  expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
  expect(mfa.enroll).not.toHaveBeenCalled()
  expect(mfa.unenroll).not.toHaveBeenCalled()
  expect(auth.updateUser).not.toHaveBeenCalled()
  expect(auth.signOut).not.toHaveBeenCalled()
  expect(h.createEinmalClient).not.toHaveBeenCalled()
  expect(h.sperreLesen).not.toHaveBeenCalled()
  expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
  expect(h.anzeigenameAendern).not.toHaveBeenCalled()
  expect(h.eigenesKontoLoeschen).not.toHaveBeenCalled()
  expect(h.sendeHinweisAlteAdresse).not.toHaveBeenCalled()
  expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
  expect(h.revalidatePath).not.toHaveBeenCalled()
  expect(h.cookieDelete).not.toHaveBeenCalled()
  expect(h.redirect).not.toHaveBeenCalled()
}

describe('Sitzungsprüfung (SEC-03)', () => {
  it.each(ALLE_AKTIONEN)('%s ohne Nutzer → nicht_angemeldet, kein weiterer Aufruf', async (_n, aktion, felder) => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    h.zustand.faktoren = [faktor(F1, 'unverified')]

    expect(await aktion(VORHER, fd(felder))).toEqual(NICHT_ANGEMELDET)
    expect(mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled()
    erwarteKeineWirkung()
  })

  it.each(ALLE_AKTIONEN)('%s mit offener zweiter Stufe → nicht_angemeldet', async (_n, aktion, felder) => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    h.zustand.faktoren = [faktor(F1, 'unverified')]

    expect(await aktion(VORHER, fd(felder))).toEqual(NICHT_ANGEMELDET)
    erwarteKeineWirkung()
  })

  it('Fehler bei getUser oder bei der Stufenprüfung → nicht_angemeldet', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { code: 'bad_jwt' } })
    expect(await anzeigenameSpeichern(VORHER, fd({ anzeigename: 'A' }))).toEqual(NICHT_ANGEMELDET)

    mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({ data: null, error: { status: 500 } })
    expect(await anzeigenameSpeichern(VORHER, fd({ anzeigename: 'A' }))).toEqual(NICHT_ANGEMELDET)
    expect(h.anzeigenameAendern).not.toHaveBeenCalled()
  })

  it('Sitzung mit erfüllter zweiter Stufe darf ändern', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    expect((await anzeigenameSpeichern(VORHER, fd({ anzeigename: 'A' }))).ok).toBe(true)
  })
})

describe('anzeigenameSpeichern', () => {
  it('speichert den getrimmten Namen und aktualisiert das Layout', async () => {
    const ergebnis = await anzeigenameSpeichern(VORHER, fd({ anzeigename: '  Micha  ' }))

    expect(ergebnis).toEqual({ ok: true, meldung: 'Anzeigename gespeichert.' })
    expect(h.anzeigenameAendern).toHaveBeenCalledExactlyOnceWith('Micha')
    expect(h.revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout')
  })

  it('leerer Name → null', async () => {
    await anzeigenameSpeichern(VORHER, fd({ anzeigename: '' }))
    expect(h.anzeigenameAendern).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('61 Zeichen → eingabe, nichts gespeichert', async () => {
    const ergebnis = await anzeigenameSpeichern(VORHER, fd({ anzeigename: 'x'.repeat(61) }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { anzeigename: 'Der Anzeigename darf höchstens 60 Zeichen haben.' },
    })
    expect(h.anzeigenameAendern).not.toHaveBeenCalled()
  })

  it('fehlendes Feld → eingabe, der Name wird nicht gelöscht', async () => {
    expect((await anzeigenameSpeichern(VORHER, fd({}))).code).toBe('eingabe')
    expect(h.anzeigenameAendern).not.toHaveBeenCalled()
  })

  it('Datenfehler → dienst_nicht_erreichbar', async () => {
    h.anzeigenameAendern.mockRejectedValue(new Error('DatenFehler'))

    expect(await anzeigenameSpeichern(VORHER, fd({ anzeigename: 'A' }))).toEqual({
      ok: false,
      code: 'dienst_nicht_erreichbar',
      meldung: 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut.',
    })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('emailAendern', () => {
  const NICHT_VERWENDBAR = {
    ok: false,
    code: 'adresse_nicht_verwendbar',
    meldung: 'Diese Adresse kann nicht verwendet werden.',
  }

  it('Erfolg → Bestätigungslink, Hinweis an die ALTE Adresse mit der neuen', async () => {
    const ergebnis = await emailAendern(VORHER, fd({ email: ' Neu@Example.com ' }))

    expect(ergebnis).toEqual({
      ok: true,
      meldung:
        'Wir haben einen Bestätigungslink an die neue Adresse gesendet. Sie gilt erst nach der Bestätigung als Login.',
    })
    expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith(
      { email: 'neu@example.com' },
      { emailRedirectTo: 'https://wohnwerk.test/auth/bestaetigen' },
    )
    expect(h.sendeHinweisAlteAdresse).toHaveBeenCalledExactlyOnceWith(EMAIL, 'neu@example.com')
  })

  it('ein fehlgeschlagener Hinweis ändert das Ergebnis nicht', async () => {
    h.sendeHinweisAlteAdresse.mockResolvedValue(false)
    expect((await emailAendern(VORHER, fd({ email: 'neu@example.com' }))).ok).toBe(true)
  })

  it('gleiche Adresse → abgelehnt ohne Aufruf', async () => {
    expect(await emailAendern(VORHER, fd({ email: 'Vermieter@Example.com' }))).toEqual(NICHT_VERWENDBAR)
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(h.sendeHinweisAlteAdresse).not.toHaveBeenCalled()
  })

  it('email_exists → gleiche Meldung ohne Grund, KEINE Mail (EC-8)', async () => {
    auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', status: 422, message: 'A user with this email address has already been registered' },
    })

    expect(await emailAendern(VORHER, fd({ email: 'fremd@example.com' }))).toEqual(NICHT_VERWENDBAR)
    expect(h.sendeHinweisAlteAdresse).not.toHaveBeenCalled()
  })

  it('ungültige Adresse → eingabe', async () => {
    expect(await emailAendern(VORHER, fd({ email: 'keine-adresse' }))).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { email: 'Bitte gib eine gültige E-Mail-Adresse ein.' },
    })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('Netzwerkausnahme → dienst_nicht_erreichbar', async () => {
    auth.updateUser.mockRejectedValue(new TypeError('fetch failed'))
    expect((await emailAendern(VORHER, fd({ email: 'neu@example.com' }))).code).toBe('dienst_nicht_erreichbar')
  })
})

describe('passwortAendern', () => {
  it('Erfolg → neues Passwort gesetzt, Einmal-Sitzung beendet, Sicherheitshinweis', async () => {
    const ergebnis = await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))

    expect(ergebnis).toEqual({ ok: true, meldung: 'Passwort geändert.' })
    expect(h.sperreLesen).toHaveBeenCalledExactlyOnceWith(EMAIL)
    expect(h.createEinmalClient).toHaveBeenCalledExactlyOnceWith(
      'https://projekt.supabase.test',
      'anon-key',
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    )
    expect(h.einmalClient.auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: EMAIL,
      password: ALTES_PASSWORT,
      options: { captchaToken: 'captcha-ok' },
    })
    expect(h.einmalClient.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' })
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith({ password: NEUES_PASSWORT })
    expect(h.sendeSicherheitshinweis).toHaveBeenCalledExactlyOnceWith(EMAIL, 'passwort_geaendert')
    expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
  })

  it('falsches aktuelles Passwort → einmal gezählt, kein updateUser, keine Mail', async () => {
    const ergebnis = await passwortAendern(
      VORHER,
      fd({ ...PASSWORT_FORMULAR, aktuellesPasswort: 'falsch' }),
    )

    expect(ergebnis).toEqual({
      ok: false,
      code: 'anmeldung_falsch',
      meldung: 'Das aktuelle Passwort ist falsch.',
    })
    expect(h.fehlversuchZaehlen).toHaveBeenCalledExactlyOnceWith(EMAIL, 'passwort')
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('gesperrt → keine Anmeldeprüfung', async () => {
    gesperrtIn10Minuten()

    expect(await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))).toEqual({
      ok: false,
      code: 'gesperrt',
      meldung: 'Zu viele Fehlversuche. Bitte versuche es in 10 Minuten erneut.',
    })
    expect(h.createEinmalClient).not.toHaveBeenCalled()
    expect(h.einmalClient.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it.each([['fehlt', undefined], ['leer', '']])('CAPTCHA-Token %s → keine Anmeldeprüfung', async (_n, token) => {
    const felder: Record<string, string> = { ...PASSWORT_FORMULAR }
    if (token === undefined) delete felder.captchaToken
    else felder.captchaToken = token

    expect(await passwortAendern(VORHER, fd(felder))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.',
    })
    expect(h.einmalClient.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('abgelehntes CAPTCHA → Meldung, nicht gezählt', async () => {
    h.einmalClient.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { code: 'captcha_failed', status: 400, message: 'captcha protection: request disallowed' },
    })

    const ergebnis = await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))

    expect(ergebnis.code).toBe('captcha')
    expect(ergebnis.meldung).toBe('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.')
    expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('neues Passwort mit 11 Zeichen → eingabe, nichts wird aufgerufen', async () => {
    const ergebnis = await passwortAendern(
      VORHER,
      fd({ ...PASSWORT_FORMULAR, passwort: 'x'.repeat(11), passwortWiederholung: 'x'.repeat(11) }),
    )

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { passwort: 'Das Passwort muss mindestens 12 Zeichen haben.' },
    })
    expect(h.sperreLesen).not.toHaveBeenCalled()
    expect(h.createEinmalClient).not.toHaveBeenCalled()
  })

  it('ungleiche Wiederholung → eingabe', async () => {
    const ergebnis = await passwortAendern(
      VORHER,
      fd({ ...PASSWORT_FORMULAR, passwortWiederholung: 'etwas-anderes-123' }),
    )
    expect(ergebnis.feldFehler).toEqual({ passwortWiederholung: 'Die Passwörter stimmen nicht überein.' })
    expect(h.createEinmalClient).not.toHaveBeenCalled()
  })

  it('weak_password → Meldung zur Mindestlänge, keine Mail', async () => {
    auth.updateUser.mockResolvedValue({ data: { user: null }, error: { code: 'weak_password', status: 422, message: 'raw' } })

    expect(await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))).toEqual({
      ok: false,
      code: 'passwort_zu_kurz',
      meldung: 'Das Passwort muss mindestens 12 Zeichen haben.',
    })
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
  })

  it('same_password → eigener Hinweis', async () => {
    auth.updateUser.mockResolvedValue({ data: { user: null }, error: { code: 'same_password', status: 422, message: 'raw' } })

    expect(await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))).toEqual({
      ok: false,
      code: 'eingabe',
      meldung: 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
    })
  })

  it('ein Fehler beim Beenden der Einmal-Sitzung ändert nichts', async () => {
    h.einmalClient.auth.signOut.mockRejectedValue(new Error('network'))
    expect((await passwortAendern(VORHER, fd(PASSWORT_FORMULAR))).ok).toBe(true)
  })
})

describe('zweiFaktorStarten', () => {
  it('erster Authenticator braucht keinen Code', async () => {
    const ergebnis = await zweiFaktorStarten(VORHER, fd({}))

    expect(ergebnis).toEqual({
      ok: true,
      einrichtung: { factorId: NEU, qrCode: 'data:image/svg+xml;utf-8,<svg/>', secret: 'GEHEIM' },
    })
    expect(mfa.enroll).toHaveBeenCalledExactlyOnceWith({ factorType: 'totp', friendlyName: 'Authenticator 1' })
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(h.sperreLesen).not.toHaveBeenCalled()
  })

  it('liegengebliebener unbestätigter Faktor wird vor dem Anlegen entfernt', async () => {
    h.zustand.faktoren = [faktor(F3, 'unverified')]

    await zweiFaktorStarten(VORHER, fd({}))

    expect(mfa.unenroll).toHaveBeenCalledExactlyOnceWith({ factorId: F3 })
    expect(mfa.unenroll.mock.invocationCallOrder[0]).toBeLessThan(mfa.enroll.mock.invocationCallOrder[0])
    expect(mfa.enroll).toHaveBeenCalledExactlyOnceWith({ factorType: 'totp', friendlyName: 'Authenticator 1' })
  })

  it('zweiter Authenticator mit gültigem Code', async () => {
    h.zustand.faktoren = [faktor(F1)]

    const ergebnis = await zweiFaktorStarten(VORHER, fd({ code: RICHTIGER_CODE }))

    expect(ergebnis.ok).toBe(true)
    expect(mfa.challengeAndVerify).toHaveBeenCalledExactlyOnceWith({ factorId: F1, code: RICHTIGER_CODE })
    expect(mfa.enroll).toHaveBeenCalledExactlyOnceWith({ factorType: 'totp', friendlyName: 'Authenticator 2' })
    expect(mfa.unenroll).not.toHaveBeenCalled()
    expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
  })

  it('zweiter Authenticator mit falschem Code → als totp gezählt, kein enroll', async () => {
    h.zustand.faktoren = [faktor(F1)]

    expect(await zweiFaktorStarten(VORHER, fd({ code: FALSCHER_CODE }))).toEqual(CODE_FALSCH)
    expect(h.fehlversuchZaehlen).toHaveBeenCalledExactlyOnceWith(EMAIL, 'totp')
    expect(mfa.enroll).not.toHaveBeenCalled()
  })

  it('zweiter Authenticator ohne Code → eingabe, kein enroll', async () => {
    h.zustand.faktoren = [faktor(F1)]

    expect(await zweiFaktorStarten(VORHER, fd({}))).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { code: 'Der Code besteht aus 6 Ziffern.' },
    })
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(mfa.enroll).not.toHaveBeenCalled()
  })

  it('gesperrt → keine Codeprüfung, kein enroll', async () => {
    h.zustand.faktoren = [faktor(F1)]
    gesperrtIn10Minuten()

    const ergebnis = await zweiFaktorStarten(VORHER, fd({ code: RICHTIGER_CODE }))

    expect(ergebnis.code).toBe('gesperrt')
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(mfa.enroll).not.toHaveBeenCalled()
  })

  it('dritter Authenticator → abgelehnt', async () => {
    h.zustand.faktoren = [faktor(F1), faktor(F2)]

    expect(await zweiFaktorStarten(VORHER, fd({ code: RICHTIGER_CODE }))).toEqual({
      ok: false,
      meldung: 'Es sind bereits zwei Authenticator-Apps eingerichtet.',
    })
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(mfa.enroll).not.toHaveBeenCalled()
  })

  it('Fehler beim Anlegen → zugeordnete Meldung, kein Rohtext', async () => {
    mfa.enroll.mockResolvedValue({ data: null, error: { code: 'mfa_factor_name_conflict', status: 422, message: 'raw supabase text' } })

    expect(await zweiFaktorStarten(VORHER, fd({}))).toEqual({
      ok: false,
      code: 'unerwartet',
      meldung: 'Das hat nicht geklappt. Bitte versuche es erneut.',
    })
  })
})

describe('zweiFaktorBestaetigen', () => {
  it('richtiger Code → eingeschaltet', async () => {
    h.zustand.faktoren = [faktor(F3, 'unverified')]

    const ergebnis = await zweiFaktorBestaetigen(VORHER, fd({ factorId: F3, code: RICHTIGER_CODE }))

    expect(ergebnis).toEqual({ ok: true, meldung: 'Zwei-Faktor-Anmeldung ist eingeschaltet.' })
    expect(mfa.challengeAndVerify).toHaveBeenCalledExactlyOnceWith({ factorId: F3, code: RICHTIGER_CODE })
    expect(h.revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout')
  })

  it('falscher Code → nicht aktiviert (AC-12)', async () => {
    h.zustand.faktoren = [faktor(F3, 'unverified')]

    expect(await zweiFaktorBestaetigen(VORHER, fd({ factorId: F3, code: FALSCHER_CODE }))).toEqual(CODE_FALSCH)
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    ['unbekannte factorId', F2],
    ['bereits bestätigter eigener Faktor', F1],
    ['keine UUID', 'abc'],
    ['fehlende factorId', undefined],
  ])('%s → abgelehnt ohne Prüfaufruf', async (_n, factorId) => {
    h.zustand.faktoren = [faktor(F1), faktor(F3, 'unverified')]
    const felder: Record<string, string> = { code: RICHTIGER_CODE }
    if (factorId !== undefined) felder.factorId = factorId

    expect(await zweiFaktorBestaetigen(VORHER, fd(felder))).toEqual(CODE_FALSCH)
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('Code mit 5 Ziffern → eingabe', async () => {
    h.zustand.faktoren = [faktor(F3, 'unverified')]

    expect(await zweiFaktorBestaetigen(VORHER, fd({ factorId: F3, code: '12345' }))).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { code: 'Der Code besteht aus 6 Ziffern.' },
    })
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
  })
})

describe('zweiFaktorAusschalten', () => {
  it('richtiger Code → alle Faktoren entfernt, Sicherheitshinweis', async () => {
    h.zustand.faktoren = [faktor(F1), faktor(F2), faktor(F3, 'unverified')]
    // The first authenticator rejects the code, the second accepts it.
    mfa.challengeAndVerify.mockImplementation(async ({ factorId }: { factorId: string }) =>
      factorId === F2 ? { data: {}, error: null } : { data: null, error: { code: 'mfa_verification_failed' } },
    )

    const ergebnis = await zweiFaktorAusschalten(VORHER, fd({ code: RICHTIGER_CODE }))

    expect(ergebnis).toEqual({ ok: true, meldung: 'Zwei-Faktor-Anmeldung ist ausgeschaltet.' })
    expect(mfa.challengeAndVerify).toHaveBeenCalledTimes(2)
    expect(mfa.unenroll.mock.calls.map(([arg]) => arg.factorId).sort()).toEqual([F1, F2, F3])
    expect(h.sendeSicherheitshinweis).toHaveBeenCalledExactlyOnceWith(EMAIL, 'zwei_faktor_aus')
    expect(h.revalidatePath).toHaveBeenCalledExactlyOnceWith('/', 'layout')
    expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
  })

  it('falscher Code → einmal gezählt, kein unenroll, keine Mail', async () => {
    h.zustand.faktoren = [faktor(F1), faktor(F2)]

    expect(await zweiFaktorAusschalten(VORHER, fd({ code: FALSCHER_CODE }))).toEqual(CODE_FALSCH)
    expect(h.fehlversuchZaehlen).toHaveBeenCalledExactlyOnceWith(EMAIL, 'totp')
    expect(mfa.unenroll).not.toHaveBeenCalled()
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
  })

  it('gesperrt → keine Codeprüfung', async () => {
    h.zustand.faktoren = [faktor(F1)]
    gesperrtIn10Minuten()

    expect((await zweiFaktorAusschalten(VORHER, fd({ code: RICHTIGER_CODE }))).code).toBe('gesperrt')
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(mfa.unenroll).not.toHaveBeenCalled()
  })

  it('Ausfall bei der Codeprüfung → kein Fehlversuch', async () => {
    h.zustand.faktoren = [faktor(F1)]
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { status: 503, message: 'raw' } })

    expect((await zweiFaktorAusschalten(VORHER, fd({ code: RICHTIGER_CODE }))).code).toBe('dienst_nicht_erreichbar')
    expect(h.fehlversuchZaehlen).not.toHaveBeenCalled()
    expect(mfa.unenroll).not.toHaveBeenCalled()
  })

  it('Fehler beim Entfernen → zugeordnete Meldung, keine Mail', async () => {
    h.zustand.faktoren = [faktor(F1)]
    mfa.unenroll.mockResolvedValue({ data: null, error: { code: 'insufficient_aal', status: 400, message: 'raw' } })

    expect(await zweiFaktorAusschalten(VORHER, fd({ code: RICHTIGER_CODE }))).toEqual(NICHT_ANGEMELDET)
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
  })

  it('ungültiger Code → eingabe', async () => {
    h.zustand.faktoren = [faktor(F1)]
    expect((await zweiFaktorAusschalten(VORHER, fd({ code: 'abcdef' }))).code).toBe('eingabe')
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
  })
})

describe('kontoLoeschen', () => {
  function erwarteNichtsGeloescht() {
    expect(h.eigenesKontoLoeschen).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(h.cookieDelete).not.toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalled()
  }

  it('Erfolg ohne 2FA → gelöscht, abgemeldet, Cookie entfernt, Weiterleitung', async () => {
    await expect(kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).rejects.toThrow('REDIRECT:/anmelden')

    expect(h.einmalClient.auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: EMAIL,
      password: ALTES_PASSWORT,
      options: { captchaToken: 'captcha-ok' },
    })
    expect(h.eigenesKontoLoeschen).toHaveBeenCalledTimes(1)
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' })
    expect(h.cookieDelete).toHaveBeenCalledExactlyOnceWith('ww-aktiv')
    expect(h.redirect).toHaveBeenCalledExactlyOnceWith('/anmelden')
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('Erfolg mit 2FA und gültigem Code', async () => {
    h.zustand.faktoren = [faktor(F1)]

    await expect(
      kontoLoeschen(VORHER, fd({ ...LOESCH_FORMULAR, code: RICHTIGER_CODE })),
    ).rejects.toThrow('REDIRECT:/anmelden')
    expect(mfa.challengeAndVerify).toHaveBeenCalledExactlyOnceWith({ factorId: F1, code: RICHTIGER_CODE })
    expect(h.eigenesKontoLoeschen).toHaveBeenCalledTimes(1)
  })

  it('ein Fehler beim Abmelden hält die Weiterleitung nicht auf', async () => {
    auth.signOut.mockRejectedValue(new Error('network'))

    await expect(kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).rejects.toThrow('REDIRECT:/anmelden')
    expect(h.cookieDelete).toHaveBeenCalledExactlyOnceWith('ww-aktiv')
  })

  it.each([['löschen'], ['LÖSCHEN '], ['LOESCHEN'], ['']])('Bestätigung „%s“ → nichts gelöscht', async (bestaetigung) => {
    const ergebnis = await kontoLoeschen(VORHER, fd({ ...LOESCH_FORMULAR, bestaetigung }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { bestaetigung: 'Bitte gib LÖSCHEN ein.' },
    })
    expect(h.createEinmalClient).not.toHaveBeenCalled()
    erwarteNichtsGeloescht()
  })

  it('falsches Passwort → gezählt, nichts gelöscht', async () => {
    const ergebnis = await kontoLoeschen(VORHER, fd({ ...LOESCH_FORMULAR, passwort: 'falsch' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'anmeldung_falsch',
      meldung: 'Das aktuelle Passwort ist falsch.',
    })
    expect(h.fehlversuchZaehlen).toHaveBeenCalledExactlyOnceWith(EMAIL, 'passwort')
    erwarteNichtsGeloescht()
  })

  it('fehlendes CAPTCHA-Token → nichts gelöscht', async () => {
    const ergebnis = await kontoLoeschen(VORHER, fd({ ...LOESCH_FORMULAR, captchaToken: '' }))

    expect(ergebnis.code).toBe('captcha')
    expect(h.einmalClient.auth.signInWithPassword).not.toHaveBeenCalled()
    erwarteNichtsGeloescht()
  })

  it('2FA aktiv, Code fehlt → Feldfehler, nichts gelöscht', async () => {
    h.zustand.faktoren = [faktor(F1)]

    expect(await kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { code: 'Der Code besteht aus 6 Ziffern.' },
    })
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled()
    erwarteNichtsGeloescht()
  })

  it('2FA aktiv, falscher Code → als totp gezählt, nichts gelöscht', async () => {
    h.zustand.faktoren = [faktor(F1)]

    expect(await kontoLoeschen(VORHER, fd({ ...LOESCH_FORMULAR, code: FALSCHER_CODE }))).toEqual(CODE_FALSCH)
    expect(h.fehlversuchZaehlen).toHaveBeenCalledExactlyOnceWith(EMAIL, 'totp')
    erwarteNichtsGeloescht()
  })

  it('Löschen schlägt fehl → dienst_nicht_erreichbar, keine Weiterleitung', async () => {
    h.eigenesKontoLoeschen.mockRejectedValue(new Error('DatenFehler'))

    expect(await kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).toEqual({
      ok: false,
      code: 'dienst_nicht_erreichbar',
      meldung: 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut.',
    })
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(h.cookieDelete).not.toHaveBeenCalled()
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('Doppelklick (EC-6): der zweite Aufruf findet keinen Nutzer', async () => {
    await expect(kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).rejects.toThrow('REDIRECT:/anmelden')
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'session_not_found' } })

    expect(await kontoLoeschen(VORHER, fd(LOESCH_FORMULAR))).toEqual(NICHT_ANGEMELDET)
    expect(h.eigenesKontoLoeschen).toHaveBeenCalledTimes(1)
    expect(h.redirect).toHaveBeenCalledTimes(1)
  })
})
