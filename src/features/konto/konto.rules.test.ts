import {
  AKTIVITAET_COOKIE,
  AKTIVITAET_MELDE_INTERVALL_MS,
  INAKTIVITAET_MAX_MS,
  MELDUNG,
  SPERRE_DAUER_MS,
  SPERRE_FENSTER_MS,
  SPERRE_MAX_FEHLVERSUCHE,
  authFehler,
  fehlerMeldung,
  istFrischeWiederherstellung,
  istInaktiv,
  sperrMeldung,
  sperrstatus,
  verraetKonto,
} from './konto.rules'

const JETZT = new Date('2026-11-14T12:00:00.000Z')
const MIN = 60_000

/** A failed attempt `minuten` minutes (plus `ms`) before JETZT. */
function vor(minuten: number, ms = 0): Date {
  return new Date(JETZT.getTime() - minuten * MIN - ms)
}

describe('Konstanten', () => {
  it('haben die Werte aus Spec und Design', () => {
    expect(SPERRE_MAX_FEHLVERSUCHE).toBe(5)
    expect(SPERRE_FENSTER_MS).toBe(900_000)
    expect(SPERRE_DAUER_MS).toBe(900_000)
    expect(INAKTIVITAET_MAX_MS).toBe(1_800_000)
    expect(AKTIVITAET_MELDE_INTERVALL_MS).toBe(300_000)
    expect(AKTIVITAET_COOKIE).toBe('ww-aktiv')
  })
})

describe('sperrstatus (AC-22, EC-9)', () => {
  it('sperrt ohne Fehlversuche nicht', () => {
    expect(sperrstatus([], JETZT)).toEqual({ gesperrt: false, gesperrtBis: null })
  })

  it('sperrt bei 4 Fehlversuchen nicht', () => {
    expect(sperrstatus([vor(1), vor(2), vor(3), vor(4)], JETZT)).toEqual({
      gesperrt: false,
      gesperrtBis: null,
    })
  })

  it('sperrt bei 5 Fehlversuchen in 15 Minuten bis 15 Minuten nach dem jüngsten', () => {
    const status = sperrstatus([vor(10), vor(8), vor(6), vor(4), vor(2)], JETZT)

    expect(status.gesperrt).toBe(true)
    expect(status.gesperrtBis?.toISOString()).toBe('2026-11-14T12:13:00.000Z')
  })

  it('findet den jüngsten Fehlversuch auch bei unsortierter Eingabe', () => {
    const status = sperrstatus([vor(6), vor(2), vor(10), vor(4), vor(8)], JETZT)

    expect(status.gesperrt).toBe(true)
    expect(status.gesperrtBis?.toISOString()).toBe('2026-11-14T12:13:00.000Z')
  })

  it('sperrt nicht, wenn einer von 5 Fehlversuchen 16 Minuten alt ist', () => {
    expect(sperrstatus([vor(16), vor(8), vor(6), vor(4), vor(2)], JETZT)).toEqual({
      gesperrt: false,
      gesperrtBis: null,
    })
  })

  it('zählt einen Fehlversuch, der genau 15 Minuten alt ist, nicht mit', () => {
    expect(sperrstatus([vor(15), vor(8), vor(6), vor(4), vor(2)], JETZT).gesperrt).toBe(false)
  })

  it('zählt einen Fehlversuch knapp innerhalb von 15 Minuten mit', () => {
    expect(sperrstatus([vor(14, 59_999), vor(8), vor(6), vor(4), vor(2)], JETZT).gesperrt).toBe(
      true,
    )
  })

  it('hebt die Sperre auf, wenn alle 5 Fehlversuche älter als 15 Minuten sind', () => {
    expect(sperrstatus([vor(20), vor(19), vor(18), vor(17), vor(16)], JETZT)).toEqual({
      gesperrt: false,
      gesperrtBis: null,
    })
  })

  it('bleibt bei mehr als 5 Fehlversuchen gesperrt', () => {
    const status = sperrstatus([vor(7), vor(6), vor(5), vor(4), vor(3), vor(2), vor(1)], JETZT)

    expect(status.gesperrt).toBe(true)
    expect(status.gesperrtBis?.toISOString()).toBe('2026-11-14T12:14:00.000Z')
  })

  it('ignoriert Fehlversuche in der Zukunft', () => {
    const zukunft = new Date(JETZT.getTime() + MIN)

    expect(sperrstatus([zukunft, vor(1), vor(2), vor(3), vor(4)], JETZT).gesperrt).toBe(false)
  })
})

describe('sperrMeldung', () => {
  it('rundet 14 Minuten 01 Sekunde auf 15 Minuten auf', () => {
    const bis = new Date(JETZT.getTime() + 14 * MIN + 1_000)

    expect(sperrMeldung(bis, JETZT)).toBe(
      'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.',
    )
  })

  it('nennt bei 30 Sekunden Rest „1 Minute“ in der Einzahl', () => {
    const bis = new Date(JETZT.getTime() + 30_000)

    expect(sperrMeldung(bis, JETZT)).toBe(
      'Zu viele Fehlversuche. Bitte versuche es in 1 Minute erneut.',
    )
  })

  it('rundet genau 2 Minuten nicht auf', () => {
    const bis = new Date(JETZT.getTime() + 2 * MIN)

    expect(sperrMeldung(bis, JETZT)).toBe(
      'Zu viele Fehlversuche. Bitte versuche es in 2 Minuten erneut.',
    )
  })

  it('nennt mindestens 1 Minute, auch wenn die Sperre schon abgelaufen ist', () => {
    const bis = new Date(JETZT.getTime() - 5_000)

    expect(sperrMeldung(bis, JETZT)).toBe(
      'Zu viele Fehlversuche. Bitte versuche es in 1 Minute erneut.',
    )
  })
})

describe('istInaktiv (AC-7)', () => {
  const JETZT_MS = JETZT.getTime()

  it.each([
    ['fehlender Wert', undefined],
    ['leerer Wert', ''],
    ['Text', 'abc'],
    ['negative Zahl', '-5'],
    ['Kommazahl', '12.5'],
    ['Null', '0'],
    ['Zahl mit Leerzeichen', ` ${JETZT_MS}`],
    ['Exponentialschreibweise', '1e12'],
    ['Zahl mit Anhang', `${JETZT_MS}abc`],
  ])('gilt als inaktiv bei: %s', (_name, wert) => {
    expect(istInaktiv(wert, JETZT_MS)).toBe(true)
  })

  it('gilt als inaktiv, wenn der Wert mehr als 60 Sekunden in der Zukunft liegt', () => {
    expect(istInaktiv(String(JETZT_MS + 60_001), JETZT_MS)).toBe(true)
  })

  it('duldet eine kleine Uhrenabweichung in die Zukunft', () => {
    expect(istInaktiv(String(JETZT_MS + 60_000), JETZT_MS)).toBe(false)
  })

  it('ist bei frischer Aktivität aktiv', () => {
    expect(istInaktiv(String(JETZT_MS - 1_000), JETZT_MS)).toBe(false)
  })

  it('ist nach genau 30 Minuten noch aktiv', () => {
    expect(istInaktiv(String(JETZT_MS - 30 * MIN), JETZT_MS)).toBe(false)
  })

  it('ist nach 30 Minuten und 1 Millisekunde inaktiv', () => {
    expect(istInaktiv(String(JETZT_MS - 30 * MIN - 1), JETZT_MS)).toBe(true)
  })
})

describe('authFehler', () => {
  it('macht unbekannte E-Mail und falsches Passwort ununterscheidbar (AC-6)', () => {
    const falschesPasswort = authFehler({ code: 'invalid_credentials', status: 400 })
    const unbekannteMail = authFehler({ code: 'user_not_found', status: 404 })

    expect(falschesPasswort).toBe('anmeldung_falsch')
    expect(unbekannteMail).toBe('anmeldung_falsch')
    expect(fehlerMeldung(falschesPasswort)).toBe('E-Mail oder Passwort falsch.')
    expect(fehlerMeldung(unbekannteMail)).toBe('E-Mail oder Passwort falsch.')
  })

  it.each([
    ['user_banned', 'anmeldung_falsch'],
    ['email_not_confirmed', 'nicht_bestaetigt'],
    ['captcha_failed', 'captcha'],
    ['weak_password', 'passwort_zu_kurz'],
    ['email_exists', 'adresse_nicht_verwendbar'],
    ['user_already_exists', 'adresse_nicht_verwendbar'],
    ['email_address_invalid', 'adresse_nicht_verwendbar'],
    ['email_address_not_authorized', 'adresse_nicht_verwendbar'],
    ['mfa_verification_failed', 'code_falsch'],
    ['mfa_challenge_expired', 'code_falsch'],
    ['mfa_verification_rejected', 'code_falsch'],
    ['mfa_factor_not_found', 'code_falsch'],
    ['session_not_found', 'nicht_angemeldet'],
    ['session_expired', 'nicht_angemeldet'],
    ['no_authorization', 'nicht_angemeldet'],
    ['bad_jwt', 'nicht_angemeldet'],
    ['refresh_token_not_found', 'nicht_angemeldet'],
    ['refresh_token_already_used', 'nicht_angemeldet'],
    ['insufficient_aal', 'nicht_angemeldet'],
    ['hook_timeout', 'dienst_nicht_erreichbar'],
    ['hook_timeout_after_retry', 'dienst_nicht_erreichbar'],
    ['request_timeout', 'dienst_nicht_erreichbar'],
    ['unexpected_failure', 'dienst_nicht_erreichbar'],
    ['over_request_rate_limit', 'dienst_nicht_erreichbar'],
    ['over_email_send_rate_limit', 'dienst_nicht_erreichbar'],
  ])('ordnet den Code %s der Kategorie %s zu', (code, erwartet) => {
    expect(authFehler({ code, status: 400, message: 'irrelevant' })).toBe(erwartet)
  })

  describe('Einladungs-Hook (AC-2)', () => {
    it('erkennt die Ablehnung am Marker in der Meldung', () => {
      expect(authFehler({ status: 403, message: 'nur_auf_einladung' })).toBe('nur_auf_einladung')
    })

    it('erkennt den Marker auch innerhalb einer längeren Meldung', () => {
      expect(
        authFehler({ status: 403, message: 'Hook rejected signup: nur_auf_einladung (403)' }),
      ).toBe('nur_auf_einladung')
    })

    it.each(['hook_payload_invalid_content_type', 'unexpected_failure', 'invalid_credentials'])(
      'prüft den Marker vor dem Code %s',
      (code) => {
        expect(authFehler({ code, status: 403, message: 'nur_auf_einladung' })).toBe(
          'nur_auf_einladung',
        )
      },
    )
  })

  describe('Dienst nicht erreichbar ohne Code', () => {
    it('erkennt einen Netzwerkfehler mit Status 0', () => {
      expect(authFehler({ status: 0, message: 'Failed to fetch' })).toBe('dienst_nicht_erreichbar')
    })

    it('erkennt einen Netzwerkfehler ohne Status an der Meldung', () => {
      expect(authFehler({ message: 'TypeError: fetch failed' })).toBe('dienst_nicht_erreichbar')
      expect(authFehler({ status: null, code: null, message: 'NetworkError when attempting to fetch resource.' })).toBe(
        'dienst_nicht_erreichbar',
      )
    })

    it.each([500, 502, 503, 504])('erkennt den Serverfehler %i', (status) => {
      expect(authFehler({ status, message: 'Bad Gateway' })).toBe('dienst_nicht_erreichbar')
    })
  })

  describe('alles andere ist unerwartet', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['leeres Objekt', {}],
      ['unbekannter Code', { code: 'same_password', status: 422 }],
      ['unbekannter Code mit Status 500', { code: 'brand_new_code', status: 500 }],
      ['Objekt-Eigenschaft als Code', { code: 'constructor', status: 400 }],
      ['Status 400 ohne Code', { status: 400, message: 'Bad Request' }],
      ['Meldung ohne Netzwerkbezug und ohne Status', { message: 'Something odd' }],
    ])('bei: %s', (_name, fehler) => {
      expect(authFehler(fehler)).toBe('unerwartet')
    })
  })
})

describe('fehlerMeldung', () => {
  it.each([
    ['anmeldung_falsch', 'E-Mail oder Passwort falsch.'],
    ['nicht_bestaetigt', 'Bitte bestätige zuerst deine E-Mail-Adresse'],
    ['nur_auf_einladung', 'WohnWerk ist derzeit nur auf Einladung nutzbar.'],
    ['adresse_nicht_verwendbar', 'Diese Adresse kann nicht verwendet werden.'],
    ['code_falsch', 'Der Code ist falsch oder abgelaufen.'],
    ['captcha', 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.'],
    ['passwort_zu_kurz', 'Das Passwort muss mindestens 12 Zeichen haben.'],
    ['nicht_angemeldet', 'Bitte melde dich erneut an.'],
    [
      'dienst_nicht_erreichbar',
      'Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut.',
    ],
    ['unerwartet', 'Das hat nicht geklappt. Bitte versuche es erneut.'],
  ] as const)('liefert für %s den Spec-Text', (fehler, text) => {
    expect(fehlerMeldung(fehler)).toBe(text)
  })
})

describe('MELDUNG (Texte ohne Fehlerkategorie)', () => {
  it('nennt nach der Registrierung denselben Text für neue und bestehende Adressen (AC-1/AC-24)', () => {
    expect(MELDUNG.registriert).toBe(
      'Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link gesendet.',
    )
  })

  it('verrät bei „Passwort vergessen“ nicht, ob ein Konto existiert (AC-11)', () => {
    expect(MELDUNG.passwortVergessen).toBe(
      'Falls ein Konto existiert, haben wir eine E-Mail gesendet.',
    )
  })
})

describe('istFrischeWiederherstellung (BUG-1)', () => {
  const jetztMs = JETZT.getTime()
  const sek = (minutenVorher: number) => Math.floor((jetztMs - minutenVorher * MIN) / 1000)

  it.each(['recovery', 'otp'])('accepts a %s session up to 15 minutes old', (method) => {
    expect(istFrischeWiederherstellung([{ method, timestamp: sek(0) }], jetztMs)).toBe(true)
    expect(istFrischeWiederherstellung([{ method, timestamp: sek(15) }], jetztMs)).toBe(true)
  })

  it('accepts recovery next to a later second factor', () => {
    const amr = [
      { method: 'totp', timestamp: sek(1) },
      { method: 'recovery', timestamp: sek(2) },
    ]
    expect(istFrischeWiederherstellung(amr, jetztMs)).toBe(true)
  })

  it.each([
    ['a password session', [{ method: 'password', timestamp: sek(0) }]],
    ['password + 2FA', [{ method: 'password', timestamp: sek(0) }, { method: 'totp', timestamp: sek(0) }]],
    ['a recovery older than 15 minutes', [{ method: 'recovery', timestamp: sek(16) }]],
    ['a timestamp far in the future', [{ method: 'recovery', timestamp: sek(-5) }]],
    ['a timestamp as text', [{ method: 'recovery', timestamp: String(sek(0)) }]],
    ['the RFC string form', ['recovery']],
    ['an empty list', []],
    ['no amr at all', undefined],
    ['an object instead of a list', { method: 'recovery', timestamp: sek(0) }],
  ])('rejects %s', (_name, amr) => {
    expect(istFrischeWiederherstellung(amr, jetztMs)).toBe(false)
  })
})

// QA re-verification 2026-11-15: exact boundaries of the recovery window.
describe('istFrischeWiederherstellung – Grenzen (QA)', () => {
  const jetztSek = 1_800_000_000
  const jetztMs = jetztSek * 1000

  it('accepts exactly 15 minutes and rejects one second more', () => {
    expect(istFrischeWiederherstellung([{ method: 'recovery', timestamp: jetztSek - 900 }], jetztMs)).toBe(true)
    expect(istFrischeWiederherstellung([{ method: 'recovery', timestamp: jetztSek - 901 }], jetztMs)).toBe(false)
  })

  it('tolerates 60 seconds of clock skew into the future, not 61', () => {
    expect(istFrischeWiederherstellung([{ method: 'recovery', timestamp: jetztSek + 60 }], jetztMs)).toBe(true)
    expect(istFrischeWiederherstellung([{ method: 'recovery', timestamp: jetztSek + 61 }], jetztMs)).toBe(false)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects a %s timestamp', (_name, timestamp) => {
    expect(istFrischeWiederherstellung([{ method: 'recovery', timestamp }], jetztMs)).toBe(false)
  })

  it.each(['magiclink', 'email/signup', 'invite', 'email_change', 'oauth', 'RECOVERY'])(
    'rejects the link method %s',
    (method) => {
      expect(istFrischeWiederherstellung([{ method, timestamp: jetztSek }], jetztMs)).toBe(false)
    },
  )

  it('rejects null entries without throwing', () => {
    expect(istFrischeWiederherstellung([null, 'recovery', 42], jetztMs)).toBe(false)
  })
})

describe('verraetKonto (BUG-2)', () => {
  it('flags the resend limit that only existing accounts hit', () => {
    expect(verraetKonto({ code: 'over_email_send_rate_limit' })).toBe(true)
  })

  it.each([
    ['the per-IP limit', { code: 'over_request_rate_limit' }],
    ['a failed captcha', { code: 'captcha_failed' }],
    ['no code', { status: 500 }],
    ['no error', null],
  ])('does not flag %s', (_name, fehler) => {
    expect(verraetKonto(fehler)).toBe(false)
  })
})
