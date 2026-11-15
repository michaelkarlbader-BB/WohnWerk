import { describe, expect, it } from 'vitest'
import {
  BEREICHE,
  ZIELE,
  aktivesZiel,
  istAktuelleAnsicht,
  menues,
  tabTitel,
  titelleistenText,
  zielZuKennung,
  type Menue,
  type MenueEintrag,
} from './navigation.rules'

function eintrag(liste: Menue[], menue: string, beschriftung: string): MenueEintrag {
  const gefunden = liste
    .find((m) => m.titel === menue)
    ?.eintraege.find((e) => e.beschriftung === beschriftung)
  if (!gefunden) throw new Error(`Kein Eintrag ${menue} → ${beschriftung}`)
  return gefunden
}

describe('Verzeichnis', () => {
  it('lists the four areas in order and the state after PROJ-2', () => {
    expect(BEREICHE.map((b) => b.beschriftung)).toEqual([
      'Wohnungen',
      'Mieter',
      'Mietverträge',
      'Darlehen',
    ])
    expect(ZIELE.filter((z) => z.gebaut).map((z) => z.pfad)).toEqual(['/wohnungen', '/konto'])
    expect(zielZuKennung('export-import')).toMatchObject({ pfad: '/export-import', gebaut: false })
  })
})

describe('aktivesZiel', () => {
  it('finds the area of an area path and of its details (AC-6, AC-9)', () => {
    expect(aktivesZiel('/wohnungen')?.kennung).toBe('wohnungen')
    expect(aktivesZiel('/wohnungen/')?.kennung).toBe('wohnungen')
    expect(aktivesZiel('/wohnungen/7c1e')?.kennung).toBe('wohnungen')
    expect(aktivesZiel('/wohnungen/7c1e?tab=afa#x')?.kennung).toBe('wohnungen')
    expect(aktivesZiel('/konto')?.kennung).toBe('konto')
  })

  it('knows no area for unknown addresses and look-alikes (AC-10)', () => {
    expect(aktivesZiel('/')).toBeNull()
    expect(aktivesZiel('/gibt-es-nicht')).toBeNull()
    expect(aktivesZiel('/wohnungen-alt')).toBeNull()
    expect(aktivesZiel('/x/wohnungen')).toBeNull()
  })

  it('treats the address of an area that is not built yet as unknown (EC-2)', () => {
    expect(aktivesZiel('/mieter')).toBeNull()
    expect(aktivesZiel('/export-import')).toBeNull()
  })
})

describe('titelleistenText', () => {
  it('names the area and optionally the detail (AC-6)', () => {
    expect(titelleistenText(zielZuKennung('wohnungen'))).toBe('WohnWerk – Wohnungen')
    expect(titelleistenText(zielZuKennung('wohnungen'), ' WE 03 – Musterstraße 5 ')).toBe(
      'WohnWerk – Wohnungen – WE 03 – Musterstraße 5'
    )
    expect(titelleistenText(zielZuKennung('konto'), '  ')).toBe('WohnWerk – Konto')
    expect(titelleistenText(null, 'egal')).toBe('WohnWerk')
  })
})

describe('tabTitel', () => {
  it('is only the label from the directory - there is no way to pass a detail name (AC-36)', () => {
    expect(tabTitel('wohnungen')).toBe('Wohnungen')
    expect(tabTitel('mietvertraege')).toBe('Mietverträge')
    expect(tabTitel('konto')).toBe('Konto')
    expect(tabTitel.length).toBe(1)
  })
})

describe('istAktuelleAnsicht', () => {
  it('is true only for the very same view (EC-1)', () => {
    expect(istAktuelleAnsicht('/wohnungen', '/wohnungen')).toBe(true)
    expect(istAktuelleAnsicht('/wohnungen/', '/wohnungen')).toBe(true)
    expect(istAktuelleAnsicht('/wohnungen?x=1', '/wohnungen')).toBe(true)
    expect(istAktuelleAnsicht('/wohnungen/7c1e', '/wohnungen')).toBe(false)
    expect(istAktuelleAnsicht('/konto', '/wohnungen')).toBe(false)
  })
})

describe('menues', () => {
  it('has exactly the menus and entries of AC-11', () => {
    const liste = menues({}, '/wohnungen')
    expect(liste.map((m) => [m.titel, m.eintraege.map((e) => e.beschriftung)])).toEqual([
      ['Datei', ['Neu…', 'Abmelden']],
      ['Bearbeiten', ['Bearbeiten…', 'Löschen…']],
      ['Ansicht', ['Wohnungen', 'Mieter', 'Mietverträge', 'Darlehen', 'Aktualisieren', 'Darstellung']],
      ['Extras', ['Export & Import…', 'Konto…']],
      ['?', ['Über WohnWerk', 'Datenschutz', 'Impressum']],
    ])
    const darstellung = eintrag(liste, 'Ansicht', 'Darstellung')
    expect(darstellung.art === 'darstellung' && darstellung.optionen.map((o) => o.beschriftung)).toEqual([
      'Hell',
      'Dunkel',
      'Wie System',
    ])
  })

  it('greys out destinations that are not built and keeps the others available (AC-7)', () => {
    const liste = menues({}, '/wohnungen')
    expect(eintrag(liste, 'Ansicht', 'Wohnungen').verfuegbar).toBe(true)
    expect(eintrag(liste, 'Ansicht', 'Mieter').verfuegbar).toBe(false)
    expect(eintrag(liste, 'Ansicht', 'Mietverträge').verfuegbar).toBe(false)
    expect(eintrag(liste, 'Ansicht', 'Darlehen').verfuegbar).toBe(false)
    expect(eintrag(liste, 'Extras', 'Export & Import…').verfuegbar).toBe(false)
    expect(eintrag(liste, 'Extras', 'Konto…').verfuegbar).toBe(true)
    expect(eintrag(liste, 'Datei', 'Abmelden').verfuegbar).toBe(true)
    expect(eintrag(liste, '?', 'Datenschutz')).toMatchObject({ pfad: '/datenschutz', verfuegbar: true })
    expect(eintrag(liste, '?', 'Impressum')).toMatchObject({ pfad: '/impressum', verfuegbar: true })
  })

  it('offers an action only when the page reports it as available (AC-13)', () => {
    const ohne = menues({}, '/wohnungen')
    expect(eintrag(ohne, 'Datei', 'Neu…').verfuegbar).toBe(false)
    expect(eintrag(ohne, 'Ansicht', 'Aktualisieren').verfuegbar).toBe(false)

    const mit = menues({ neu: true, loeschen: false, aktualisieren: true }, '/wohnungen')
    expect(eintrag(mit, 'Datei', 'Neu…')).toMatchObject({ aktion: 'neu', verfuegbar: true })
    expect(eintrag(mit, 'Bearbeiten', 'Bearbeiten…').verfuegbar).toBe(false)
    expect(eintrag(mit, 'Bearbeiten', 'Löschen…').verfuegbar).toBe(false)
    expect(eintrag(mit, 'Ansicht', 'Aktualisieren').verfuegbar).toBe(true)
  })

  it('marks the active area, also on a detail page', () => {
    const liste = menues({}, '/wohnungen/7c1e')
    expect(eintrag(liste, 'Ansicht', 'Wohnungen')).toMatchObject({ markiert: true })
    expect(eintrag(liste, 'Ansicht', 'Mieter')).toMatchObject({ markiert: false })
    expect(eintrag(menues({}, '/konto'), 'Extras', 'Konto…')).toMatchObject({ markiert: true })
    expect(eintrag(menues({}, '/konto'), 'Ansicht', 'Wohnungen')).toMatchObject({ markiert: false })
  })
})
