'use client'

// Client state of the frame and the frame interface for the area features (PROJ-3 to PROJ-10).
// Features use only what is exported under "Frame interface"; the bars of the frame use
// `useRahmenZustand`. See docs/app-shell.md → Rahmen-Bausteine.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { istAktuelleAnsicht, type AktionKennung } from './navigation.rules'
import { BESTAETIGUNG_DAUER_MS, bestaetigungText, statustext } from './rahmen.rules'

// ---- Frame interface (for features) ---------------------------------------------------

export type RahmenAktion = {
  /** What the toolbar button and the menu entry do. A returned promise locks both until it settles. */
  ausfuehren: () => void | Promise<void>
  /** False: shown greyed out (e.g. "Löschen" without a selected entry). */
  verfuegbar: boolean
}

export type BereichEinrichtung = {
  /** Only reported actions are offered; an area without actions has an empty toolbar. */
  aktionen?: Partial<Record<AktionKennung, RahmenAktion>>
  /** Finished text for the status bar, e.g. "4 Wohnungen". */
  anzahl?: string
  /** Detail name for the title bar inside the window, e.g. "WE 03 – Musterstraße 5". Never the tab title. */
  detailtitel?: string
  /** True while the page holds changes that are not saved. */
  ungespeichert?: boolean
}

export type RahmenSchnittstelle = {
  /** Confirmation in the status bar (max. 120 characters); replaces the previous one, gone after 10 s. */
  bestaetigen: (text: string) => void
  /** Starts a loading indication and returns the function that ends it - call it on errors, too. */
  ladenBeginnen: () => () => void
  /** Navigation inside the app that asks first while changes are not saved. */
  navigieren: (pfad: string) => void
  /** Only for the automatic sign-out: nothing asks any more before leaving. */
  ohneRueckfrageVerlassen: () => void
}

// ---- State for the bars of the frame --------------------------------------------------

export type RahmenZustand = {
  /** Path the frame shows: the destination being navigated to, otherwise the current path. */
  pfad: string
  /** Reported actions: true = available, false = greyed out, missing = not offered. */
  aktionen: Partial<Record<AktionKennung, boolean>>
  /** Actions that are running right now; their button and menu entry are locked. */
  laufendeAktionen: readonly AktionKennung[]
  anzahl: string | null
  detailtitel: string | null
  ungespeichert: boolean
  statustext: string
  laedt: boolean
  online: boolean
  /** True while the dialog "Nicht gespeicherte Änderungen verwerfen?" is to be shown. */
  rueckfrageOffen: boolean
  aktionAusfuehren: (kennung: AktionKennung) => void
  abmelden: () => void
  /** Opens the dialog unconditionally; `abbrechen` runs when the user stays. */
  rueckfrageStellen: (weiter: () => void, abbrechen?: () => void) => void
  rueckfrageBeantworten: (verwerfen: boolean) => void
  /** Current answer to "are there unsaved changes?" - for event handlers outside React. */
  istUngespeichert: () => boolean
}

type BereichZustand = Pick<RahmenZustand, 'aktionen' | 'anzahl' | 'detailtitel'> & {
  ungespeichert: boolean
}

type Funktionen = BereichEinrichtung['aktionen']

type Intern = {
  bereichAnmelden: (id: string, zustand: BereichZustand) => void
  funktionenSetzen: (id: string, funktionen: Funktionen) => void
  bereichAbmelden: (id: string) => void
  vorAbmeldenSetzen: (funktion: (() => void) | null) => void
}

const LEERER_BEREICH: BereichZustand = {
  aktionen: {},
  anzahl: null,
  detailtitel: null,
  ungespeichert: false,
}

const nichts = () => {}

// Outside the frame (unit tests of a feature, signed-out pages) the interface does nothing.
const SchnittstelleKontext = createContext<RahmenSchnittstelle>({
  bestaetigen: nichts,
  ladenBeginnen: () => nichts,
  navigieren: nichts,
  ohneRueckfrageVerlassen: nichts,
})
const InternKontext = createContext<Intern | null>(null)
const ZustandKontext = createContext<RahmenZustand | null>(null)

function verbindungAbonnieren(melden: () => void) {
  window.addEventListener('online', melden)
  window.addEventListener('offline', melden)
  return () => {
    window.removeEventListener('online', melden)
    window.removeEventListener('offline', melden)
  }
}

type RahmenKontextProps = {
  children: ReactNode
  /** Sign-out of PROJ-1 (Server Action), handed in by the layout. */
  abmelden: () => Promise<void>
}

export function RahmenKontext({ children, abmelden }: RahmenKontextProps) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()

  const [bereich, setBereich] = useState<BereichZustand>(LEERER_BEREICH)
  const [freigegeben, setFreigegeben] = useState(false)
  const [laufend, setLaufend] = useState<readonly AktionKennung[]>([])
  const [bestaetigung, setBestaetigung] = useState<string | null>(null)
  const [ladeZahl, setLadeZahl] = useState(0)
  const [ziel, setZiel] = useState<{ pfad: string; von: string } | null>(null)
  const [rueckfrageOffen, setRueckfrageOffen] = useState(false)

  const online = useSyncExternalStore(
    verbindungAbonnieren,
    () => navigator.onLine,
    () => true
  )

  // Mirrors for event handlers that must decide synchronously.
  const eigentuemer = useRef<string | null>(null)
  const funktionen = useRef<Funktionen>(undefined)
  const bereichRef = useRef<BereichZustand>(LEERER_BEREICH)
  const freigegebenRef = useRef(false)
  const laufendRef = useRef(new Set<AktionKennung>())
  const zielRef = useRef<{ pfad: string; von: string } | null>(null)
  const rueckfrage = useRef<{ weiter: () => void; abbrechen?: () => void } | null>(null)
  const bestaetigungTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ladeGeneration = useRef(0)
  const vorAbmelden = useRef<(() => void) | null>(null)
  const abmeldenLaeuft = useRef(false)

  const istUngespeichert = useCallback(
    () => bereichRef.current.ungespeichert && !freigegebenRef.current,
    []
  )

  const freigeben = useCallback((wert: boolean) => {
    freigegebenRef.current = wert
    setFreigegeben(wert)
  }, [])

  // ---- Area registration ----
  const intern = useMemo<Intern>(() => {
    const bereichSetzen = (zustand: BereichZustand) => {
      bereichRef.current = zustand
      setBereich(zustand)
      freigeben(false)
    }
    return {
      bereichAnmelden(id, zustand) {
        eigentuemer.current = id
        bereichSetzen(zustand)
      },
      funktionenSetzen(id, neu) {
        if (eigentuemer.current === id) funktionen.current = neu
      },
      // Leaving the page resets everything, so no stale buttons remain.
      bereichAbmelden(id) {
        if (eigentuemer.current !== id) return
        eigentuemer.current = null
        funktionen.current = undefined
        bereichSetzen(LEERER_BEREICH)
      },
      vorAbmeldenSetzen(funktion) {
        vorAbmelden.current = funktion
      },
    }
  }, [freigeben])

  // ---- Unsaved changes ----
  const rueckfrageStellen = useCallback((weiter: () => void, abbrechen?: () => void) => {
    rueckfrage.current = { weiter, abbrechen }
    setRueckfrageOffen(true)
  }, [])

  const rueckfrageBeantworten = useCallback(
    (verwerfen: boolean) => {
      const offen = rueckfrage.current
      rueckfrage.current = null
      setRueckfrageOffen(false)
      if (!offen) return
      if (verwerfen) {
        freigeben(true)
        offen.weiter()
      } else {
        offen.abbrechen?.()
      }
    },
    [freigeben]
  )

  const geschuetzt = useCallback(
    (weiter: () => void) => {
      if (istUngespeichert()) rueckfrageStellen(weiter)
      else weiter()
    },
    [istUngespeichert, rueckfrageStellen]
  )

  const ohneRueckfrageVerlassen = useCallback(() => {
    rueckfrage.current = null
    setRueckfrageOffen(false)
    freigeben(true)
  }, [freigeben])

  // ---- Navigation ----
  const navigieren = useCallback(
    (pfad: string) => {
      if (istAktuelleAnsicht(pathname, pfad)) return // EC-1
      const unterwegs = zielRef.current
      if (unterwegs && unterwegs.von === pathname && unterwegs.pfad === pfad) return // EC-9
      geschuetzt(() => {
        // AC-35: title bar, selection and "Bitte warten…" show the destination at once.
        const neu = { pfad, von: pathname }
        zielRef.current = neu
        setZiel(neu)
        router.push(pfad)
      })
    },
    [pathname, router, geschuetzt]
  )
  // The destination only counts until the path has changed.
  const angesteuert = ziel && ziel.von === pathname ? ziel.pfad : null

  // ---- Confirmation ----
  const bestaetigen = useCallback((text: string) => {
    if (bestaetigungTimer.current) clearTimeout(bestaetigungTimer.current)
    bestaetigungTimer.current = null
    const anzeige = bestaetigungText(text)
    setBestaetigung(anzeige)
    if (anzeige) {
      bestaetigungTimer.current = setTimeout(() => setBestaetigung(null), BESTAETIGUNG_DAUER_MS)
    }
  }, [])

  useEffect(
    () => () => {
      if (bestaetigungTimer.current) clearTimeout(bestaetigungTimer.current)
    },
    []
  )

  // ---- Loading ----
  const ladenBeginnen = useCallback(() => {
    const generation = ladeGeneration.current
    let beendet = false
    setLadeZahl((zahl) => zahl + 1)
    return () => {
      // Ended twice, or already ended by a lost connection: nothing to count down.
      if (beendet || generation !== ladeGeneration.current) return
      beendet = true
      setLadeZahl((zahl) => Math.max(0, zahl - 1))
    }
  }, [])

  // EC-10: a lost connection ends every running loading indication.
  useEffect(() => {
    const offline = () => {
      ladeGeneration.current += 1
      setLadeZahl(0)
    }
    window.addEventListener('offline', offline)
    return () => window.removeEventListener('offline', offline)
  }, [])

  // ---- Actions ----
  const aktionAusfuehren = useCallback((kennung: AktionKennung) => {
    if (bereichRef.current.aktionen[kennung] !== true) return
    if (laufendRef.current.has(kennung)) return // EC-9
    const ausfuehren = funktionen.current?.[kennung]?.ausfuehren
    if (!ausfuehren) return

    const ergebnis = ausfuehren()
    if (!(ergebnis instanceof Promise)) return

    laufendRef.current.add(kennung)
    setLaufend([...laufendRef.current])
    ergebnis
      // What an action does with its error is the feature's business; the frame only unlocks.
      .catch((fehler: unknown) => console.error(fehler))
      .finally(() => {
        laufendRef.current.delete(kennung)
        setLaufend([...laufendRef.current])
      })
  }, [])

  const abmeldenStarten = useCallback(() => {
    geschuetzt(() => {
      if (abmeldenLaeuft.current) return // EC-9
      abmeldenLaeuft.current = true
      vorAbmelden.current?.()
      startTransition(async () => {
        try {
          await abmelden()
        } finally {
          abmeldenLaeuft.current = false
        }
      })
    })
  }, [geschuetzt, abmelden])

  const schnittstelle = useMemo<RahmenSchnittstelle>(
    () => ({ bestaetigen, ladenBeginnen, navigieren, ohneRueckfrageVerlassen }),
    [bestaetigen, ladenBeginnen, navigieren, ohneRueckfrageVerlassen]
  )

  const laedt = ladeZahl > 0 || angesteuert !== null
  const zustand = useMemo<RahmenZustand>(
    () => ({
      pfad: angesteuert ?? pathname,
      aktionen: bereich.aktionen,
      laufendeAktionen: laufend,
      anzahl: bereich.anzahl,
      // The detail name belongs to the page that is being left.
      detailtitel: angesteuert ? null : bereich.detailtitel,
      ungespeichert: bereich.ungespeichert && !freigegeben,
      statustext: statustext({ online, laedt, bestaetigung }),
      laedt: online && laedt,
      online,
      rueckfrageOffen,
      aktionAusfuehren,
      abmelden: abmeldenStarten,
      rueckfrageStellen,
      rueckfrageBeantworten,
      istUngespeichert,
    }),
    [
      angesteuert,
      pathname,
      bereich,
      laufend,
      freigegeben,
      online,
      laedt,
      bestaetigung,
      rueckfrageOffen,
      aktionAusfuehren,
      abmeldenStarten,
      rueckfrageStellen,
      rueckfrageBeantworten,
      istUngespeichert,
    ]
  )

  return (
    <SchnittstelleKontext.Provider value={schnittstelle}>
      <InternKontext.Provider value={intern}>
        <ZustandKontext.Provider value={zustand}>{children}</ZustandKontext.Provider>
      </InternKontext.Provider>
    </SchnittstelleKontext.Provider>
  )
}

// ---- Frame interface: hooks and link --------------------------------------------------

/** Confirmation, loading, protected navigation. Stable functions; outside the frame they do nothing. */
export function useRahmen(): RahmenSchnittstelle {
  return useContext(SchnittstelleKontext)
}

/**
 * Sets up the area of the current page: its actions, count, detail title and "unsaved".
 * Call once per page; everything is reset automatically when the page is left.
 */
export function useRahmenBereich({ aktionen, anzahl, detailtitel, ungespeichert }: BereichEinrichtung) {
  const intern = useContext(InternKontext)
  const id = useId()
  const neu = aktionen?.neu?.verfuegbar
  const bearbeiten = aktionen?.bearbeiten?.verfuegbar
  const loeschen = aktionen?.loeschen?.verfuegbar
  const aktualisieren = aktionen?.aktualisieren?.verfuegbar

  useEffect(() => {
    const gemeldet: BereichZustand['aktionen'] = {}
    if (neu !== undefined) gemeldet.neu = neu
    if (bearbeiten !== undefined) gemeldet.bearbeiten = bearbeiten
    if (loeschen !== undefined) gemeldet.loeschen = loeschen
    if (aktualisieren !== undefined) gemeldet.aktualisieren = aktualisieren
    intern?.bereichAnmelden(id, {
      aktionen: gemeldet,
      anzahl: anzahl?.trim() || null,
      detailtitel: detailtitel?.trim() || null,
      ungespeichert: ungespeichert === true,
    })
  }, [intern, id, neu, bearbeiten, loeschen, aktualisieren, anzahl, detailtitel, ungespeichert])

  // The functions may be new on every render; the frame always calls the latest ones.
  useEffect(() => {
    intern?.funktionenSetzen(id, aktionen)
  })

  useEffect(() => () => intern?.bereichAbmelden(id), [intern, id])
}

/** Shows "Bitte warten…" and the progress bar for as long as `aktiv` is true. */
export function useRahmenLaden(aktiv: boolean) {
  const { ladenBeginnen } = useRahmen()
  useEffect(() => {
    if (!aktiv) return
    return ladenBeginnen()
  }, [aktiv, ladenBeginnen])
}

/** Only for the session guard: runs right before the frame signs the user out (other tabs). */
export function useRahmenVorAbmelden(funktion: () => void) {
  const intern = useContext(InternKontext)
  useEffect(() => {
    intern?.vorAbmeldenSetzen(funktion)
    return () => intern?.vorAbmeldenSetzen(null)
  }, [intern, funktion])
}

type RahmenLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

/** Protected link for links inside the content: a real link that asks first while unsaved. */
export function RahmenLink({ href, onClick, ...rest }: RahmenLinkProps) {
  const { navigieren } = useRahmen()
  return (
    <Link
      href={href}
      {...rest}
      onClick={(ereignis) => {
        onClick?.(ereignis)
        // New tab / window and middle click stay with the browser.
        const neuerTab =
          ereignis.metaKey || ereignis.ctrlKey || ereignis.shiftKey || ereignis.altKey
        if (ereignis.defaultPrevented || neuerTab || ereignis.button !== 0) return
        ereignis.preventDefault()
        navigieren(href)
      }}
    />
  )
}

// ---- For the bars of the frame --------------------------------------------------------

export function useRahmenZustand(): RahmenZustand {
  const zustand = useContext(ZustandKontext)
  if (!zustand) throw new Error('useRahmenZustand braucht den RahmenKontext.')
  return zustand
}
