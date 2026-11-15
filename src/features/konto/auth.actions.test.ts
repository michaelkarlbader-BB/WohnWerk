// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Hand-written fakes: cookie store, Supabase auth client, data access and mail.
const h = vi.hoisted(() => {
  const cookieWerte = new Map<string, string>()
  const cookieSet: { name: string; value: string; options: unknown }[] = []
  const cookieDelete: string[] = []
  const cookieStore = {
    get: (name: string) =>
      cookieWerte.has(name) ? { name, value: cookieWerte.get(name) as string } : undefined,
    getAll: () => [...cookieWerte].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string, options: unknown) => {
      cookieSet.push({ name, value, options })
      cookieWerte.set(name, value)
    },
    delete: (name: string) => {
      cookieDelete.push(name)
      cookieWerte.delete(name)
    },
  }

  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    mfa: {
      listFactors: vi.fn(),
      challengeAndVerify: vi.fn(),
      getAuthenticatorAssuranceLevel: vi.fn(),
    },
  }

  return {
    cookieWerte,
    cookieSet,
    cookieDelete,
    cookieStore,
    auth,
    alsVersuch: vi.fn(),
    /** [email, art] of every attempt that stayed counted (wrong credentials). */
    gezaehlt: [] as [string, string][],
    wiederherstellungsEmail: vi.fn(),
    fehlversucheLoeschen: vi.fn(),
    nachAntwort: [] as (() => unknown)[],
    sendeBereitsRegistriert: vi.fn(),
    sendeSicherheitshinweis: vi.fn(),
  }
})

vi.mock('next/headers', () => ({ cookies: async () => h.cookieStore }))
vi.mock('next/navigation', () => ({
  // Like the real one: throws an error carrying the target in its digest.
  redirect: (ziel: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${ziel};307;` })
  },
}))
// `after` runs its callback once the response is out; the tests run it on demand.
vi.mock('next/server', () => ({ after: (rueckruf: () => unknown) => h.nachAntwort.push(rueckruf) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: h.auth }) }))
vi.mock('./konto.data', () => ({
  alsVersuch: h.alsVersuch,
  wiederherstellungsEmail: h.wiederherstellungsEmail,
  fehlversucheLoeschen: h.fehlversucheLoeschen,
}))
vi.mock('./mail.integration', () => ({
  sendeBereitsRegistriert: h.sendeBereitsRegistriert,
  sendeSicherheitshinweis: h.sendeSicherheitshinweis,
}))

import {
  abmelden,
  aktivitaetMelden,
  anmelden,
  bestaetigungErneutSenden,
  passwortNeuSetzen,
  passwortVergessen,
  registrieren,
  ueberallAbmelden,
  zweiFaktorPruefen,
  type AktionsErgebnis,
} from './auth.actions'

const JETZT = new Date('2026-11-14T10:00:00.000Z')
const VORHER: AktionsErgebnis = { ok: false }
const COOKIE = 'ww-aktiv'
const PASSWORT = 'ein-langes-passwort'
const NICHT_ERREICHBAR =
  'Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut.'
const CAPTCHA_FEHLER = 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.'

function formular(felder: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, wert] of Object.entries(felder)) formData.set(name, wert)
  return formData
}

/** Runs an action that must redirect and returns the target. */
async function umleitung(aktion: Promise<unknown>): Promise<string> {
  try {
    await aktion
  } catch (fehler) {
    const digest = (fehler as { digest?: string }).digest ?? ''
    if (digest.startsWith('NEXT_REDIRECT;')) return digest.split(';')[2]
    throw fehler
  }
  throw new Error('expected a redirect')
}

const faktor = (id: string, status = 'verified') => ({ id, factor_type: 'totp', status })
const aal = (currentLevel: string, nextLevel: string) => ({
  data: { currentLevel, nextLevel, currentAuthenticationMethods: [] },
  error: null,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wohnwerk.example/')

  h.cookieWerte.clear()
  h.cookieSet.length = 0
  h.cookieDelete.length = 0

  const user = { id: 'user-1', email: 'anna@example.com' }
  h.auth.signInWithPassword.mockReset().mockResolvedValue({ data: { user, session: {} }, error: null })
  h.auth.signUp
    .mockReset()
    .mockResolvedValue({ data: { user: { id: 'neu', identities: [{ id: 'i1' }] }, session: null }, error: null })
  h.auth.resend.mockReset().mockResolvedValue({ data: { user: null, session: null }, error: null })
  h.auth.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null })
  h.auth.updateUser.mockReset().mockResolvedValue({ data: { user }, error: null })
  h.auth.signOut.mockReset().mockResolvedValue({ error: null })
  h.auth.getUser.mockReset().mockResolvedValue({ data: { user }, error: null })
  h.auth.mfa.listFactors
    .mockReset()
    .mockResolvedValue({ data: { all: [faktor('f1')], totp: [faktor('f1')] }, error: null })
  h.auth.mfa.challengeAndVerify.mockReset().mockResolvedValue({ data: {}, error: null })
  h.auth.mfa.getAuthenticatorAssuranceLevel.mockReset().mockResolvedValue(aal('aal1', 'aal1'))

  // Like the real one: runs the check and keeps the attempt only for wrong credentials.
  h.gezaehlt.length = 0
  h.alsVersuch
    .mockReset()
    .mockImplementation(
      async (email: string, art: string, pruefen: () => Promise<{ falsch: boolean; wert: unknown }>) => {
        const ergebnis = await pruefen()
        if (ergebnis.falsch) h.gezaehlt.push([email, art])
        return { gesperrt: false, wert: ergebnis.wert }
      },
    )
  h.wiederherstellungsEmail.mockReset().mockResolvedValue('anna@example.com')
  h.nachAntwort.length = 0
  h.fehlversucheLoeschen.mockReset().mockResolvedValue(undefined)
  h.sendeBereitsRegistriert.mockReset().mockResolvedValue(true)
  h.sendeSicherheitshinweis.mockReset().mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

function sperren(minuten: number) {
  h.alsVersuch.mockResolvedValue({
    gesperrt: true,
    gesperrtBis: new Date(JETZT.getTime() + minuten * 60_000),
  })
}

describe('anmelden', () => {
  const felder = { email: ' Anna@Example.com ', passwort: PASSWORT, captchaToken: 'tok', weiter: '/darlehen?x=1' }

  it('signs in, sets the activity cookie, clears the attempts and redirects to weiter (AC-5, AC-8)', async () => {
    const ziel = await umleitung(anmelden(VORHER, formular(felder)))

    expect(ziel).toBe('/darlehen?x=1')
    expect(h.alsVersuch).toHaveBeenCalledWith('anna@example.com', 'passwort', expect.any(Function))
    expect(h.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'anna@example.com',
      password: PASSWORT,
      options: { captchaToken: 'tok' },
    })
    expect(h.cookieSet).toEqual([
      {
        name: COOKIE,
        value: String(JETZT.getTime()),
        options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
      },
    ])
    expect(h.fehlversucheLoeschen).toHaveBeenCalledTimes(1)
  })

  it('marks the cookie secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await umleitung(anmelden(VORHER, formular(felder)))
    expect(h.cookieSet[0].options).toMatchObject({ secure: true })
  })

  it.each(['//evil.example', 'https://evil.example', '/anmelden'])(
    'falls back to /wohnungen for weiter=%s',
    async (weiter) => {
      expect(await umleitung(anmelden(VORHER, formular({ ...felder, weiter })))).toBe('/wohnungen')
    },
  )

  it('redirects to /wohnungen without weiter', async () => {
    const { weiter: _weiter, ...ohne } = felder
    expect(await umleitung(anmelden(VORHER, formular(ohne)))).toBe('/wohnungen')
  })

  it('still signs in when clearing the attempts fails', async () => {
    h.fehlversucheLoeschen.mockRejectedValue(new Error('db down'))
    expect(await umleitung(anmelden(VORHER, formular(felder)))).toBe('/darlehen?x=1')
  })

  it('rejects a locked address without asking Supabase, even with correct credentials (AC-22)', async () => {
    sperren(7)
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'gesperrt',
      meldung: 'Zu viele Fehlversuche. Bitte versuche es in 7 Minuten erneut.',
    })
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(h.cookieSet).toEqual([])
  })

  it('fails closed when the lock state is unknown', async () => {
    h.alsVersuch.mockRejectedValue(new Error('versuchBeginnen failed'))
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: false, code: 'dienst_nicht_erreichbar', meldung: NICHT_ERREICHBAR })
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it.each(['invalid_credentials', 'user_not_found'])(
    'answers %s with the same message and counts one attempt (AC-6)',
    async (code) => {
      h.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { code, status: 400, message: 'Invalid login credentials' },
      })
      const ergebnis = await anmelden(VORHER, formular(felder))

      expect(ergebnis).toEqual({
        ok: false,
        code: 'anmeldung_falsch',
        meldung: 'E-Mail oder Passwort falsch.',
      })
      expect(h.gezaehlt).toEqual([['anna@example.com', 'passwort']])
      expect(h.cookieSet).toEqual([])
    },
  )

  it('does not count an unconfirmed address (EC-1)', async () => {
    h.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' },
    })
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'nicht_bestaetigt',
      meldung: 'Bitte bestätige zuerst deine E-Mail-Adresse',
    })
    expect(h.gezaehlt).toEqual([])
  })

  it('does not call Supabase without a captcha token (AC-23)', async () => {
    const ergebnis = await anmelden(VORHER, formular({ ...felder, captchaToken: '' }))

    expect(ergebnis).toEqual({ ok: false, code: 'captcha', meldung: CAPTCHA_FEHLER })
    expect(h.alsVersuch).not.toHaveBeenCalled()
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('does not count a failed captcha', async () => {
    h.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'captcha_failed', status: 400, message: 'captcha verification process failed' },
    })
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: false, code: 'captcha', meldung: CAPTCHA_FEHLER })
    expect(h.gezaehlt).toEqual([])
  })

  it('never passes a raw Supabase message on', async () => {
    h.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'something_new', status: 400, message: 'internal detail' },
    })
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'unerwartet',
      meldung: 'Das hat nicht geklappt. Bitte versuche es erneut.',
    })
    expect(h.gezaehlt).toEqual([])
  })

  it('reports an unreachable service when the sign-in throws', async () => {
    h.auth.signInWithPassword.mockRejectedValue(new TypeError('fetch failed'))
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: false, code: 'dienst_nicht_erreichbar', meldung: NICHT_ERREICHBAR })
    expect(h.auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('returns field errors for invalid input and calls nothing else', async () => {
    const ergebnis = await anmelden(VORHER, formular({ email: 'keine-adresse', passwort: '', captchaToken: 'tok' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: {
        email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
        passwort: 'Bitte gib dein Passwort ein.',
      },
    })
    expect(h.alsVersuch).not.toHaveBeenCalled()
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('asks for the code when a second factor is enrolled, without redirect or clearing (AC-13)', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal('aal1', 'aal2'))
    const ergebnis = await anmelden(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: true, schritt: 'code' })
    expect(h.fehlversucheLoeschen).not.toHaveBeenCalled()
    expect(h.cookieSet).toHaveLength(1)
  })

  it('treats a failed assurance-level lookup as "second factor required"', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: null,
      error: { status: 500, message: 'boom' },
    })
    expect(await anmelden(VORHER, formular(felder))).toEqual({ ok: true, schritt: 'code' })
    expect(h.fehlversucheLoeschen).not.toHaveBeenCalled()
  })
})

describe('zweiFaktorPruefen', () => {
  const felder = { code: '123456', weiter: '/mieter' }

  it('verifies the code, sets the cookie, clears the attempts and redirects', async () => {
    const ziel = await umleitung(zweiFaktorPruefen(VORHER, formular(felder)))

    expect(ziel).toBe('/mieter')
    expect(h.alsVersuch).toHaveBeenCalledWith('anna@example.com', 'totp', expect.any(Function))
    expect(h.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' })
    expect(h.cookieSet).toHaveLength(1)
    expect(h.cookieSet[0]).toMatchObject({ name: COOKIE, value: String(JETZT.getTime()) })
    expect(h.fehlversucheLoeschen).toHaveBeenCalledTimes(1)
  })

  it('filters the return target', async () => {
    const ziel = await umleitung(zweiFaktorPruefen(VORHER, formular({ code: '123456', weiter: '//evil.example' })))
    expect(ziel).toBe('/wohnungen')
  })

  it('accepts the code of the second of two authenticators, skipping unverified factors', async () => {
    h.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [faktor('f0', 'unverified'), faktor('f1'), faktor('f2')] },
      error: null,
    })
    h.auth.mfa.challengeAndVerify.mockImplementation(async ({ factorId }: { factorId: string }) =>
      factorId === 'f2'
        ? { data: {}, error: null }
        : { data: null, error: { code: 'mfa_verification_failed', status: 422, message: 'Invalid TOTP code' } },
    )

    expect(await umleitung(zweiFaktorPruefen(VORHER, formular(felder)))).toBe('/mieter')
    expect(h.auth.mfa.challengeAndVerify.mock.calls.map(([p]) => p.factorId)).toEqual(['f1', 'f2'])
    expect(h.gezaehlt).toEqual([])
  })

  it('counts exactly one totp attempt when no factor accepts the code', async () => {
    h.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [faktor('f1'), faktor('f2')] },
      error: null,
    })
    h.auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'mfa_verification_failed', status: 422, message: 'Invalid TOTP code' },
    })
    const ergebnis = await zweiFaktorPruefen(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'code_falsch',
      meldung: 'Der Code ist falsch oder abgelaufen.',
    })
    expect(h.auth.mfa.challengeAndVerify).toHaveBeenCalledTimes(2)
    expect(h.gezaehlt).toEqual([['anna@example.com', 'totp']])
    expect(h.cookieSet).toEqual([])
    expect(h.fehlversucheLoeschen).not.toHaveBeenCalled()
  })

  it('does not verify while the address is locked', async () => {
    sperren(1)
    const ergebnis = await zweiFaktorPruefen(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'gesperrt',
      meldung: 'Zu viele Fehlversuche. Bitte versuche es in 1 Minute erneut.',
    })
    expect(h.auth.mfa.listFactors).not.toHaveBeenCalled()
    expect(h.auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
  })

  it('does not count an outage as a wrong code', async () => {
    h.auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { status: 503, message: 'down' } })
    const ergebnis = await zweiFaktorPruefen(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: false, code: 'dienst_nicht_erreichbar', meldung: NICHT_ERREICHBAR })
    expect(h.gezaehlt).toEqual([])
  })

  it('needs a session', async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 400, message: 'Auth session missing!' } })
    const ergebnis = await zweiFaktorPruefen(VORHER, formular(felder))

    expect(ergebnis).toEqual({ ok: false, code: 'nicht_angemeldet', meldung: 'Bitte melde dich erneut an.' })
    expect(h.auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
  })

  it('rejects a malformed code without any call', async () => {
    const ergebnis = await zweiFaktorPruefen(VORHER, formular({ code: '12a456' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { code: 'Der Code besteht aus 6 Ziffern.' },
    })
    expect(h.auth.getUser).not.toHaveBeenCalled()
    expect(h.gezaehlt).toEqual([])
  })
})

describe('registrieren', () => {
  const felder = {
    email: 'Neu@Example.com',
    passwort: PASSWORT,
    passwortWiederholung: PASSWORT,
    captchaToken: 'tok',
  }
  const ERFOLG = {
    ok: true,
    meldung: 'Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link gesendet.',
  }

  it('registers a new address without the "already registered" mail (AC-1)', async () => {
    const ergebnis = await registrieren(VORHER, formular(felder))

    expect(ergebnis).toEqual(ERFOLG)
    expect(h.auth.signUp).toHaveBeenCalledWith({
      email: 'neu@example.com',
      password: PASSWORT,
      options: { captchaToken: 'tok', emailRedirectTo: 'https://wohnwerk.example/auth/bestaetigen' },
    })
    expect(h.sendeBereitsRegistriert).not.toHaveBeenCalled()
  })

  it('answers an existing address identically and notifies its owner (AC-24)', async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: { id: 'fake', identities: [] }, session: null }, error: null })
    const ergebnis = await registrieren(VORHER, formular(felder))

    expect(ergebnis).toEqual(ERFOLG)
    await Promise.all(h.nachAntwort.map((rueckruf) => rueckruf()))
    expect(h.sendeBereitsRegistriert).toHaveBeenCalledTimes(1)
    expect(h.sendeBereitsRegistriert).toHaveBeenCalledWith('neu@example.com')
  })

  // BUG-11: the mail goes out after the response, so the answer time does not reveal the account.
  it('answers before the "already registered" mail is sent', async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: { id: 'fake', identities: [] }, session: null }, error: null })
    h.sendeBereitsRegistriert.mockImplementation(() => new Promise(() => undefined))

    expect(await registrieren(VORHER, formular(felder))).toEqual(ERFOLG)
    expect(h.sendeBereitsRegistriert).not.toHaveBeenCalled()
    expect(h.nachAntwort).toHaveLength(1)
  })

  // BUG-2: the 60-second resend limit only hits addresses that already have an account.
  it('answers the resend limit like a new registration', async () => {
    h.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_email_send_rate_limit', status: 429, message: 'raw supabase text' },
    })

    expect(await registrieren(VORHER, formular(felder))).toEqual(ERFOLG)
    expect(h.nachAntwort).toHaveLength(0)
  })

  it('shows the invitation message when the hook rejects the address (AC-2)', async () => {
    h.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'nur_auf_einladung', status: 403 },
    })
    expect(await registrieren(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'nur_auf_einladung',
      meldung: 'WohnWerk ist derzeit nur auf Einladung nutzbar.',
    })
    expect(h.sendeBereitsRegistriert).not.toHaveBeenCalled()
  })

  it.each([
    ['weak_password', 'passwort_zu_kurz', 'Das Passwort muss mindestens 12 Zeichen haben.'],
    ['captcha_failed', 'captcha', CAPTCHA_FEHLER],
    ['over_request_rate_limit', 'dienst_nicht_erreichbar', NICHT_ERREICHBAR],
    ['user_already_exists', 'unerwartet', 'Das hat nicht geklappt. Bitte versuche es erneut.'],
    ['signup_disabled', 'unerwartet', 'Das hat nicht geklappt. Bitte versuche es erneut.'],
  ])('maps the Supabase error %s to %s', async (code, kategorie, meldung) => {
    h.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code, status: 422, message: 'raw supabase text' },
    })
    expect(await registrieren(VORHER, formular(felder))).toEqual({ ok: false, code: kategorie, meldung })
  })

  it('rejects an 11-character password before calling Supabase', async () => {
    const kurz = '12345678901'
    const ergebnis = await registrieren(
      VORHER,
      formular({ ...felder, passwort: kurz, passwortWiederholung: kurz }),
    )

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { passwort: 'Das Passwort muss mindestens 12 Zeichen haben.' },
    })
    expect(h.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects differing passwords', async () => {
    const ergebnis = await registrieren(VORHER, formular({ ...felder, passwortWiederholung: 'anders' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { passwortWiederholung: 'Die Passwörter stimmen nicht überein.' },
    })
    expect(h.auth.signUp).not.toHaveBeenCalled()
  })

  it('does not call Supabase without a captcha token', async () => {
    const { captchaToken: _token, ...ohne } = felder
    expect(await registrieren(VORHER, formular(ohne))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: CAPTCHA_FEHLER,
    })
    expect(h.auth.signUp).not.toHaveBeenCalled()
  })

  it('reports an unreachable service when the sign-up throws', async () => {
    h.auth.signUp.mockRejectedValue(new TypeError('fetch failed'))
    expect(await registrieren(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'dienst_nicht_erreichbar',
      meldung: NICHT_ERREICHBAR,
    })
  })
})

describe('bestaetigungErneutSenden', () => {
  const felder = { email: 'anna@example.com', captchaToken: 'tok' }
  const NEUTRAL = {
    ok: true,
    meldung:
      'Falls die Adresse registriert und noch nicht bestätigt ist, haben wir die E-Mail erneut gesendet.',
  }

  it('resends the confirmation mail', async () => {
    expect(await bestaetigungErneutSenden(VORHER, formular(felder))).toEqual(NEUTRAL)
    expect(h.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'anna@example.com',
      options: { captchaToken: 'tok', emailRedirectTo: 'https://wohnwerk.example/auth/bestaetigen' },
    })
  })

  it('answers neutrally for an unknown address', async () => {
    h.auth.resend.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_not_found', status: 404, message: 'User not found' },
    })
    expect(await bestaetigungErneutSenden(VORHER, formular(felder))).toEqual(NEUTRAL)
  })

  it('reports captcha and outage errors', async () => {
    h.auth.resend.mockResolvedValue({ data: null, error: { code: 'captcha_failed', status: 400, message: 'x' } })
    expect(await bestaetigungErneutSenden(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: CAPTCHA_FEHLER,
    })

    h.auth.resend.mockResolvedValue({ data: null, error: { status: 503, message: 'x' } })
    expect(await bestaetigungErneutSenden(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'dienst_nicht_erreichbar',
      meldung: NICHT_ERREICHBAR,
    })
  })

  it('validates the address and requires the captcha before calling Supabase', async () => {
    expect(await bestaetigungErneutSenden(VORHER, formular({ email: 'x', captchaToken: 'tok' }))).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { email: 'Bitte gib eine gültige E-Mail-Adresse ein.' },
    })
    expect(await bestaetigungErneutSenden(VORHER, formular({ email: 'anna@example.com' }))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: CAPTCHA_FEHLER,
    })
    expect(h.auth.resend).not.toHaveBeenCalled()
  })
})

describe('passwortVergessen', () => {
  const felder = { email: 'Anna@example.com', captchaToken: 'tok' }
  const NEUTRAL = { ok: true, meldung: 'Falls ein Konto existiert, haben wir eine E-Mail gesendet.' }

  it('requests the recovery mail (AC-11)', async () => {
    expect(await passwortVergessen(VORHER, formular(felder))).toEqual(NEUTRAL)
    expect(h.auth.resetPasswordForEmail).toHaveBeenCalledWith('anna@example.com', {
      captchaToken: 'tok',
      redirectTo: 'https://wohnwerk.example/auth/bestaetigen',
    })
  })

  it('answers neutrally when Supabase reports an unknown address', async () => {
    h.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'user_not_found', status: 404, message: 'User not found' },
    })
    expect(await passwortVergessen(VORHER, formular(felder))).toEqual(NEUTRAL)
  })

  // BUG-2: the 60-second resend limit only hits addresses that have an account.
  it('answers the resend limit of an existing account neutrally', async () => {
    h.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit', status: 429, message: 'For security purposes…' },
    })
    expect(await passwortVergessen(VORHER, formular(felder))).toEqual(NEUTRAL)
  })

  it('reports captcha and outage errors', async () => {
    h.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'captcha_failed', status: 400, message: 'x' },
    })
    expect(await passwortVergessen(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: CAPTCHA_FEHLER,
    })

    h.auth.resetPasswordForEmail.mockRejectedValue(new TypeError('fetch failed'))
    expect(await passwortVergessen(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'dienst_nicht_erreichbar',
      meldung: NICHT_ERREICHBAR,
    })
  })

  it('validates the address and requires the captcha before calling Supabase', async () => {
    expect(await passwortVergessen(VORHER, formular({ email: '', captchaToken: 'tok' }))).toMatchObject({
      ok: false,
      code: 'eingabe',
    })
    expect(await passwortVergessen(VORHER, formular({ email: 'anna@example.com', captchaToken: '' }))).toEqual({
      ok: false,
      code: 'captcha',
      meldung: CAPTCHA_FEHLER,
    })
    expect(h.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})

describe('passwortNeuSetzen', () => {
  const felder = { passwort: PASSWORT, passwortWiederholung: PASSWORT }

  it('sets the password, sends the security notice and redirects (AC-27)', async () => {
    const ziel = await umleitung(passwortNeuSetzen(VORHER, formular(felder)))

    expect(ziel).toBe('/wohnungen')
    expect(h.auth.updateUser).toHaveBeenCalledWith({ password: PASSWORT })
    expect(h.sendeSicherheitshinweis).toHaveBeenCalledTimes(1)
    expect(h.sendeSicherheitshinweis).toHaveBeenCalledWith('anna@example.com', 'passwort_geaendert')
    expect(h.cookieSet).toHaveLength(1)
    expect(h.auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
  })

  it('still succeeds when the notice cannot be sent', async () => {
    h.sendeSicherheitshinweis.mockResolvedValue(false)
    expect(await umleitung(passwortNeuSetzen(VORHER, formular(felder)))).toBe('/wohnungen')
  })

  // BUG-1: any other session - e.g. a normal sign-in on an unattended device - is refused.
  it('needs the fresh session of the recovery link', async () => {
    h.wiederherstellungsEmail.mockResolvedValue(null)
    const ergebnis = await passwortNeuSetzen(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'nicht_angemeldet',
      meldung: 'Der Link ist abgelaufen. Bitte fordere einen neuen an.',
    })
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })

  it('requires the code of a 2FA user and does not touch the password without it', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal('aal1', 'aal2'))
    const ergebnis = await passwortNeuSetzen(VORHER, formular(felder))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'code_noetig',
      meldung: 'Bitte gib zusätzlich den Code aus deiner Authenticator-App ein.',
    })
    expect(h.auth.updateUser).not.toHaveBeenCalled()
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
  })

  it('sets the password of a 2FA user after a correct code', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal('aal1', 'aal2'))
    const ziel = await umleitung(passwortNeuSetzen(VORHER, formular({ ...felder, code: '654321' })))

    expect(ziel).toBe('/wohnungen')
    expect(h.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '654321' })
    expect(h.auth.updateUser).toHaveBeenCalledTimes(1)
  })

  it('counts a wrong code and keeps the old password', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal('aal1', 'aal2'))
    h.auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'mfa_verification_failed', status: 422, message: 'Invalid TOTP code' },
    })
    const ergebnis = await passwortNeuSetzen(VORHER, formular({ ...felder, code: '654321' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'code_falsch',
      meldung: 'Der Code ist falsch oder abgelaufen.',
    })
    expect(h.gezaehlt).toEqual([['anna@example.com', 'totp']])
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })

  it('does not verify the code while the address is locked', async () => {
    h.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal('aal1', 'aal2'))
    sperren(15)
    const ergebnis = await passwortNeuSetzen(VORHER, formular({ ...felder, code: '654321' }))

    expect(ergebnis).toEqual({
      ok: false,
      code: 'gesperrt',
      meldung: 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.',
    })
    expect(h.auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })

  it('maps update errors', async () => {
    h.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'same_password', status: 422, message: 'New password should be different' },
    })
    expect(await passwortNeuSetzen(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'eingabe',
      meldung: 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
      feldFehler: { passwort: 'Das neue Passwort muss sich vom bisherigen unterscheiden.' },
    })

    h.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'weak_password', status: 422, message: 'Password should be at least 12 characters' },
    })
    expect(await passwortNeuSetzen(VORHER, formular(felder))).toEqual({
      ok: false,
      code: 'passwort_zu_kurz',
      meldung: 'Das Passwort muss mindestens 12 Zeichen haben.',
    })
    expect(h.sendeSicherheitshinweis).not.toHaveBeenCalled()
    expect(h.cookieSet).toEqual([])
  })

  it('validates the new password before any call', async () => {
    const ergebnis = await passwortNeuSetzen(
      VORHER,
      formular({ passwort: 'zu-kurz', passwortWiederholung: 'zu-kurz' }),
    )

    expect(ergebnis).toEqual({
      ok: false,
      code: 'eingabe',
      feldFehler: { passwort: 'Das Passwort muss mindestens 12 Zeichen haben.' },
    })
    expect(h.wiederherstellungsEmail).not.toHaveBeenCalled()
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })
})

describe('abmelden / ueberallAbmelden', () => {
  beforeEach(() => h.cookieWerte.set(COOKIE, String(JETZT.getTime())))

  it('ends this session only (AC-9)', async () => {
    expect(await umleitung(abmelden())).toBe('/anmelden')
    expect(h.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(h.cookieDelete).toEqual([COOKIE])
  })

  it('ends every session (AC-10)', async () => {
    expect(await umleitung(ueberallAbmelden(new FormData()))).toBe('/anmelden')
    expect(h.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(h.cookieDelete).toEqual([COOKIE])
  })

  it('leaves even when the sign-out fails', async () => {
    h.auth.signOut.mockRejectedValue(new TypeError('fetch failed'))
    expect(await umleitung(abmelden(new FormData()))).toBe('/anmelden')
    expect(h.cookieDelete).toEqual([COOKIE])
  })
})

describe('aktivitaetMelden', () => {
  it('renews the cookie of an active session (AC-7)', async () => {
    h.cookieWerte.set(COOKIE, String(JETZT.getTime() - 10 * 60_000))

    expect(await aktivitaetMelden()).toEqual({ aktiv: true })
    expect(h.cookieSet).toEqual([
      {
        name: COOKIE,
        value: String(JETZT.getTime()),
        options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
      },
    ])
  })

  it('does not revive an expired session', async () => {
    h.cookieWerte.set(COOKIE, String(JETZT.getTime() - 31 * 60_000))

    expect(await aktivitaetMelden()).toEqual({ aktiv: false })
    expect(h.cookieSet).toEqual([])
    expect(h.auth.getUser).not.toHaveBeenCalled()
  })

  it('does not create a cookie where none exists', async () => {
    expect(await aktivitaetMelden()).toEqual({ aktiv: false })
    expect(h.cookieSet).toEqual([])
  })

  it('reports inactive without a user', async () => {
    h.cookieWerte.set(COOKIE, String(JETZT.getTime()))
    h.auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 400, message: 'Auth session missing!' } })

    expect(await aktivitaetMelden()).toEqual({ aktiv: false })
    expect(h.cookieSet).toEqual([])
  })
})
