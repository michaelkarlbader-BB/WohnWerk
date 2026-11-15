// Directory of all areas and menu destinations of the frame, plus the pure rules derived
// from it. Each feature switches its own entry to `gebaut: true` in the commit that adds
// its route (features/PROJ-2-app-rahmen-navigation/design.md → Verzeichnis „gebaut“).

export type BereichKennung = 'wohnungen' | 'mieter' | 'mietvertraege' | 'darlehen'
export type ZielKennung = BereichKennung | 'export-import' | 'konto'
export type AktionKennung = 'neu' | 'bearbeiten' | 'loeschen' | 'aktualisieren'
export type Darstellung = 'light' | 'dark' | 'system'

export type Ziel = {
  kennung: ZielKennung
  beschriftung: string
  pfad: string
  /** Feature that owns the route. */
  feature: string
  /** False: visible but greyed out; its address shows "Diese Seite gibt es nicht." */
  gebaut: boolean
  /** True for the four areas of the area list; false for menu-only destinations. */
  bereich: boolean
}

export const ZIELE: readonly Ziel[] = [
  // Built since PROJ-2 as the start page; shows a placeholder until PROJ-3.
  { kennung: 'wohnungen', beschriftung: 'Wohnungen', pfad: '/wohnungen', feature: 'PROJ-3', gebaut: true, bereich: true },
  { kennung: 'mieter', beschriftung: 'Mieter', pfad: '/mieter', feature: 'PROJ-5', gebaut: false, bereich: true },
  { kennung: 'mietvertraege', beschriftung: 'Mietverträge', pfad: '/mietvertraege', feature: 'PROJ-6', gebaut: false, bereich: true },
  { kennung: 'darlehen', beschriftung: 'Darlehen', pfad: '/darlehen', feature: 'PROJ-8', gebaut: false, bereich: true },
  { kennung: 'export-import', beschriftung: 'Export & Import', pfad: '/export-import', feature: 'PROJ-10', gebaut: false, bereich: false },
  { kennung: 'konto', beschriftung: 'Konto', pfad: '/konto', feature: 'PROJ-1', gebaut: true, bereich: false },
]

export const BEREICHE: readonly Ziel[] = ZIELE.filter((ziel) => ziel.bereich)

/** Start page of a signed-in user (AC-5). */
export const STARTPFAD = '/wohnungen'

export const PROGRAMMNAME = 'WohnWerk'

export const AKTION_BESCHRIFTUNG: Record<AktionKennung, string> = {
  neu: 'Neu',
  bearbeiten: 'Bearbeiten',
  loeschen: 'Löschen',
  aktualisieren: 'Aktualisieren',
}

export const DARSTELLUNGEN: readonly { wert: Darstellung; beschriftung: string }[] = [
  { wert: 'light', beschriftung: 'Hell' },
  { wert: 'dark', beschriftung: 'Dunkel' },
  { wert: 'system', beschriftung: 'Wie System' },
]

export function zielZuKennung(kennung: ZielKennung): Ziel {
  // Every ZielKennung has exactly one entry; the test proves it.
  return ZIELE.find((ziel) => ziel.kennung === kennung) as Ziel
}

/** Path without query, hash and trailing slashes; "/" stays "/". */
function nurPfad(adresse: string): string {
  const pfad = adresse.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return pfad === '' ? '/' : pfad
}

/**
 * The built destination a path belongs to - the destination itself or one of its details
 * (`/<bereich>/<id>`). Null for unknown addresses and for destinations that are not built
 * yet (EC-2: their address shows "Diese Seite gibt es nicht.").
 */
export function aktivesZiel(adresse: string): Ziel | null {
  const pfad = nurPfad(adresse)
  return (
    ZIELE.find((ziel) => ziel.gebaut && (pfad === ziel.pfad || pfad.startsWith(`${ziel.pfad}/`))) ??
    null
  )
}

/** Title bar inside the window: "WohnWerk – <Bereich>[ – <Detail>]". May show a detail name. */
export function titelleistenText(ziel: Ziel | null, detailtitel?: string | null): string {
  if (!ziel) return PROGRAMMNAME
  const detail = detailtitel?.trim()
  return [PROGRAMMNAME, ziel.beschriftung, ...(detail ? [detail] : [])].join(' – ')
}

/**
 * Browser tab title of a destination, to be used as `metadata.title` (the root layout adds
 * "WohnWerk – "). AC-36: always only the label from the directory - never a value of a record,
 * because tab titles end up in the browser history and its synchronisation.
 */
export function tabTitel(kennung: ZielKennung): string {
  return zielZuKennung(kennung).beschriftung
}

/** EC-1: choosing the view that is already shown does nothing. Query and hash are ignored. */
export function istAktuelleAnsicht(aktuelleAdresse: string, zielAdresse: string): boolean {
  return nurPfad(aktuelleAdresse) === nurPfad(zielAdresse)
}

export type MenueEintrag = { beschriftung: string; verfuegbar: boolean } & (
  | { art: 'aktion'; aktion: AktionKennung }
  | { art: 'ziel'; pfad: string; markiert: boolean }
  | { art: 'abmelden' }
  | { art: 'ueber' }
  | { art: 'darstellung'; optionen: typeof DARSTELLUNGEN }
)

export type Menue = { kennung: string; titel: string; eintraege: MenueEintrag[] }

/**
 * The five menus of AC-11 with the state of every entry.
 * `aktionen`: what the current page offers - missing = not offered, false = not available now.
 */
export function menues(
  aktionen: Partial<Record<AktionKennung, boolean>>,
  aktuelleAdresse: string
): Menue[] {
  const aktiv = aktivesZiel(aktuelleAdresse)

  const aktion = (kennung: AktionKennung, punkte = '…'): MenueEintrag => ({
    art: 'aktion',
    aktion: kennung,
    beschriftung: AKTION_BESCHRIFTUNG[kennung] + punkte,
    verfuegbar: aktionen[kennung] === true,
  })
  const ziel = (kennung: ZielKennung, punkte = ''): MenueEintrag => {
    const eintrag = zielZuKennung(kennung)
    return {
      art: 'ziel',
      pfad: eintrag.pfad,
      beschriftung: eintrag.beschriftung + punkte,
      verfuegbar: eintrag.gebaut,
      markiert: aktiv?.kennung === kennung,
    }
  }
  const seite = (beschriftung: string, pfad: string): MenueEintrag => ({
    art: 'ziel',
    pfad,
    beschriftung,
    verfuegbar: true,
    markiert: false,
  })

  return [
    {
      kennung: 'datei',
      titel: 'Datei',
      eintraege: [aktion('neu'), { art: 'abmelden', beschriftung: 'Abmelden', verfuegbar: true }],
    },
    { kennung: 'bearbeiten', titel: 'Bearbeiten', eintraege: [aktion('bearbeiten'), aktion('loeschen')] },
    {
      kennung: 'ansicht',
      titel: 'Ansicht',
      eintraege: [
        ...BEREICHE.map((bereich) => ziel(bereich.kennung)),
        aktion('aktualisieren', ''),
        { art: 'darstellung', beschriftung: 'Darstellung', verfuegbar: true, optionen: DARSTELLUNGEN },
      ],
    },
    { kennung: 'extras', titel: 'Extras', eintraege: [ziel('export-import', '…'), ziel('konto', '…')] },
    {
      kennung: 'hilfe',
      titel: '?',
      eintraege: [
        { art: 'ueber', beschriftung: 'Über WohnWerk', verfuegbar: true },
        seite('Datenschutz', '/datenschutz'),
        seite('Impressum', '/impressum'),
      ],
    },
  ]
}
