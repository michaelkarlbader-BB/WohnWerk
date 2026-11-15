import {
  PASSWORT_MAX,
  PASSWORT_MIN,
  anmeldenSchema,
  anzeigenameSchema,
  emailSchema,
  kontoLoeschenSchema,
  loeschBestaetigungSchema,
  passwortAendernSchema,
  passwortNeuSchema,
  passwortSchema,
  registrierenSchema,
  sichereRuecksprungadresse,
  totpCodeSchema,
  vorhandenesPasswortSchema,
} from './konto.schema'

type Ergebnis = {
  success: boolean
  error?: { issues: { message: string; path: PropertyKey[] }[] }
}

function meldungen(ergebnis: Ergebnis): string[] {
  return ergebnis.error?.issues.map((issue) => issue.message) ?? []
}

function fehlerpfade(ergebnis: Ergebnis): string[] {
  return ergebnis.error?.issues.map((issue) => issue.path.join('.')) ?? []
}

const GUTES_PASSWORT = 'a'.repeat(12)

describe('emailSchema', () => {
  it('schneidet Leerzeichen ab und schreibt klein', () => {
    expect(emailSchema.parse('  Max.Muster@Example.DE ')).toBe('max.muster@example.de')
  })

  it.each(['', 'kein-at-zeichen', 'a@', '@b.de', 'a b@c.de'])('lehnt %j ab', (wert) => {
    const ergebnis = emailSchema.safeParse(wert)
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toContain('Bitte gib eine gültige E-Mail-Adresse ein.')
  })

  it('akzeptiert 254 Zeichen und lehnt 255 ab', () => {
    const domain = '@example.de'
    expect(emailSchema.safeParse('a'.repeat(254 - domain.length) + domain).success).toBe(true)
    const zuLang = emailSchema.safeParse('a'.repeat(255 - domain.length) + domain)
    expect(zuLang.success).toBe(false)
    expect(meldungen(zuLang)).toContain('Bitte gib eine gültige E-Mail-Adresse ein.')
  })

  it('lehnt Nicht-Text ab', () => {
    expect(emailSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('passwortSchema', () => {
  it('hat die Grenzen 12 und 72', () => {
    expect(PASSWORT_MIN).toBe(12)
    expect(PASSWORT_MAX).toBe(72)
  })

  it('lehnt 11 Zeichen ab und nennt die Mindestlänge', () => {
    const ergebnis = passwortSchema.safeParse('a'.repeat(11))
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toEqual(['Das Passwort muss mindestens 12 Zeichen haben.'])
  })

  it('akzeptiert 12 und 72 Zeichen', () => {
    expect(passwortSchema.safeParse('a'.repeat(12)).success).toBe(true)
    expect(passwortSchema.safeParse('a'.repeat(72)).success).toBe(true)
  })

  it('lehnt 73 Zeichen ab', () => {
    const ergebnis = passwortSchema.safeParse('a'.repeat(73))
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toEqual([
      'Das Passwort ist zu lang: höchstens 72 Zeichen, Umlaute und Sonderzeichen zählen dabei mehrfach.',
    ])
  })

  // BUG-12: Supabase zählt Bytes. 40 Umlaute sind 40 Zeichen, aber 80 Bytes.
  it('zählt Bytes statt Zeichen', () => {
    expect(passwortSchema.safeParse('ä'.repeat(40)).success).toBe(false)
    expect(passwortSchema.safeParse('ä'.repeat(36)).success).toBe(true)
    expect(passwortSchema.safeParse('🔑'.repeat(19)).success).toBe(false)
    expect(passwortSchema.safeParse('🔑'.repeat(18)).success).toBe(true)
  })

  it('schneidet keine Leerzeichen ab', () => {
    const mitLeerzeichen = ' ' + 'a'.repeat(10) + ' '
    expect(passwortSchema.parse(mitLeerzeichen)).toBe(mitLeerzeichen)
  })
})

describe('vorhandenesPasswortSchema', () => {
  it('akzeptiert auch kurze Passwörter', () => {
    expect(vorhandenesPasswortSchema.parse('kurz')).toBe('kurz')
  })

  it('lehnt leer, zu lang und Nicht-Text ab', () => {
    for (const wert of ['', 'a'.repeat(73), 'ä'.repeat(37), undefined]) {
      const ergebnis = vorhandenesPasswortSchema.safeParse(wert)
      expect(ergebnis.success).toBe(false)
      expect(meldungen(ergebnis)).toEqual(['Bitte gib dein Passwort ein.'])
    }
    expect(vorhandenesPasswortSchema.safeParse('a'.repeat(72)).success).toBe(true)
  })
})

describe('anzeigenameSchema', () => {
  it('macht aus leerem Text null', () => {
    expect(anzeigenameSchema.parse('')).toBeNull()
    expect(anzeigenameSchema.parse('   ')).toBeNull()
  })

  it('schneidet Leerzeichen ab', () => {
    expect(anzeigenameSchema.parse('  Max  ')).toBe('Max')
  })

  it('akzeptiert 60 Zeichen und lehnt 61 ab', () => {
    expect(anzeigenameSchema.parse('a'.repeat(60))).toBe('a'.repeat(60))
    const ergebnis = anzeigenameSchema.safeParse('a'.repeat(61))
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toEqual(['Der Anzeigename darf höchstens 60 Zeichen haben.'])
  })
})

describe('totpCodeSchema', () => {
  it('akzeptiert genau 6 Ziffern, auch mit Leerzeichen außen', () => {
    expect(totpCodeSchema.parse('123456')).toBe('123456')
    expect(totpCodeSchema.parse(' 012345\n')).toBe('012345')
  })

  it.each(['', '12345', '1234567', '12a456', '123 456', '１２３４５６'])('lehnt %j ab', (wert) => {
    const ergebnis = totpCodeSchema.safeParse(wert)
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toEqual(['Der Code besteht aus 6 Ziffern.'])
  })
})

describe('loeschBestaetigungSchema', () => {
  it('akzeptiert genau LÖSCHEN', () => {
    expect(loeschBestaetigungSchema.parse('LÖSCHEN')).toBe('LÖSCHEN')
  })

  it.each(['löschen', 'LÖSCHEN ', ' LÖSCHEN', 'LOESCHEN', '', undefined])('lehnt %j ab', (wert) => {
    const ergebnis = loeschBestaetigungSchema.safeParse(wert)
    expect(ergebnis.success).toBe(false)
    expect(meldungen(ergebnis)).toEqual(['Bitte gib LÖSCHEN ein.'])
  })
})

describe('sichereRuecksprungadresse', () => {
  it.each(['/wohnungen/3?x=1', '/', '/darlehen#plan', '/konto'])('behält %j', (wert) => {
    expect(sichereRuecksprungadresse(wert)).toBe(wert)
  })

  it.each([
    ['//evil.com'],
    ['/\\evil.com'],
    ['https://evil.com'],
    ['/a//b'],
    ['/weiter?u=https://evil.com'],
    ['wohnungen'],
    [''],
    ['/a\nb'],
    ['/a\tb'],
    ['/a' + String.fromCharCode(0x2028) + 'b'],
    ['/' + 'a'.repeat(2000)],
    ['/anmelden'],
    ['/anmelden?weiter=/wohnungen'],
    ['/registrieren'],
    ['/passwort-vergessen'],
    ['/passwort-neu'],
    ['/link-ungueltig'],
    ['/auth/callback'],
    [undefined],
    [null],
    [123],
    [['/wohnungen']],
  ])('ersetzt %j durch den Fallback', (wert) => {
    expect(sichereRuecksprungadresse(wert)).toBe('/wohnungen')
  })

  it('akzeptiert genau 2000 Zeichen', () => {
    const pfad = '/' + 'a'.repeat(1999)
    expect(sichereRuecksprungadresse(pfad)).toBe(pfad)
  })

  it('nutzt einen übergebenen Fallback', () => {
    expect(sichereRuecksprungadresse('//evil.com', '/darlehen')).toBe('/darlehen')
  })
})

describe('anmeldenSchema', () => {
  it('normalisiert die E-Mail und verlangt keine Mindestlänge', () => {
    expect(anmeldenSchema.parse({ email: ' Max@Example.de', passwort: 'kurz' })).toEqual({
      email: 'max@example.de',
      passwort: 'kurz',
    })
  })

  it('meldet Fehler je Feld', () => {
    const ergebnis = anmeldenSchema.safeParse({ email: 'x', passwort: '' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis).sort()).toEqual(['email', 'passwort'])
  })
})

describe('registrierenSchema', () => {
  const gueltig = {
    email: 'max@example.de',
    passwort: GUTES_PASSWORT,
    passwortWiederholung: GUTES_PASSWORT,
  }

  it('akzeptiert gültige Eingaben', () => {
    expect(registrierenSchema.parse(gueltig)).toEqual(gueltig)
  })

  it('meldet abweichende Wiederholung am Feld passwortWiederholung', () => {
    const ergebnis = registrierenSchema.safeParse({ ...gueltig, passwortWiederholung: 'b'.repeat(12) })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toEqual(['passwortWiederholung'])
    expect(meldungen(ergebnis)).toEqual(['Die Passwörter stimmen nicht überein.'])
  })

  it('lehnt ein zu kurzes Passwort ab', () => {
    const kurz = 'a'.repeat(11)
    const ergebnis = registrierenSchema.safeParse({ ...gueltig, passwort: kurz, passwortWiederholung: kurz })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toContain('passwort')
    expect(meldungen(ergebnis).join(' ')).toContain('12')
  })

  it('lehnt eine ungültige E-Mail ab', () => {
    const ergebnis = registrierenSchema.safeParse({ ...gueltig, email: 'keine-mail' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toContain('email')
  })
})

describe('passwortNeuSchema', () => {
  it('akzeptiert gleiche Passwörter', () => {
    expect(
      passwortNeuSchema.safeParse({ passwort: GUTES_PASSWORT, passwortWiederholung: GUTES_PASSWORT }).success,
    ).toBe(true)
  })

  it('meldet abweichende Wiederholung am Feld passwortWiederholung', () => {
    const ergebnis = passwortNeuSchema.safeParse({
      passwort: GUTES_PASSWORT,
      passwortWiederholung: GUTES_PASSWORT + 'x',
    })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toEqual(['passwortWiederholung'])
  })

  it('lehnt ein zu kurzes Passwort ab', () => {
    const ergebnis = passwortNeuSchema.safeParse({ passwort: 'kurz', passwortWiederholung: 'kurz' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toContain('passwort')
  })
})

describe('passwortAendernSchema', () => {
  const gueltig = {
    aktuellesPasswort: 'alt',
    passwort: GUTES_PASSWORT,
    passwortWiederholung: GUTES_PASSWORT,
  }

  it('akzeptiert gültige Eingaben, auch mit kurzem aktuellem Passwort', () => {
    expect(passwortAendernSchema.safeParse(gueltig).success).toBe(true)
  })

  it('verlangt das aktuelle Passwort', () => {
    const ergebnis = passwortAendernSchema.safeParse({ ...gueltig, aktuellesPasswort: '' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toContain('aktuellesPasswort')
  })

  it('lehnt ein zu kurzes neues Passwort ab', () => {
    const ergebnis = passwortAendernSchema.safeParse({ ...gueltig, passwort: 'kurz', passwortWiederholung: 'kurz' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toContain('passwort')
  })

  it('meldet abweichende Wiederholung am Feld passwortWiederholung', () => {
    const ergebnis = passwortAendernSchema.safeParse({ ...gueltig, passwortWiederholung: 'anders' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toEqual(['passwortWiederholung'])
  })
})

describe('kontoLoeschenSchema', () => {
  it('akzeptiert Eingaben ohne und mit Code', () => {
    expect(kontoLoeschenSchema.safeParse({ passwort: 'geheim', bestaetigung: 'LÖSCHEN' }).success).toBe(true)
    expect(
      kontoLoeschenSchema.parse({ passwort: 'geheim', code: ' 123456 ', bestaetigung: 'LÖSCHEN' }).code,
    ).toBe('123456')
  })

  it('lehnt falschen Bestätigungstext ab', () => {
    const ergebnis = kontoLoeschenSchema.safeParse({ passwort: 'geheim', bestaetigung: 'löschen' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis)).toEqual(['bestaetigung'])
  })

  it('lehnt einen ungültigen Code und ein fehlendes Passwort ab', () => {
    const ergebnis = kontoLoeschenSchema.safeParse({ passwort: '', code: '12345', bestaetigung: 'LÖSCHEN' })
    expect(ergebnis.success).toBe(false)
    expect(fehlerpfade(ergebnis).sort()).toEqual(['code', 'passwort'])
  })
})
