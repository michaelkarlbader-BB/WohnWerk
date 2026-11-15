'use client'

import { useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { menues, type Darstellung, type Menue, type MenueEintrag } from './navigation.rules'
import { useRahmen, useRahmenZustand } from './rahmen-kontext'

const WERTE: readonly string[] = ['light', 'dark', 'system']

/**
 * The menus of AC-11 with their current state and what choosing an entry does - shared by the
 * menu bar (desktop) and the drawer (phone), so both always offer and do the same (AC-13, AC-25).
 */
export function useMenues(onUeber: () => void): {
  menues: Menue[]
  /** Runs an entry; does nothing for entries that are not available. */
  ausfuehren: (eintrag: MenueEintrag) => void
  /** Chosen appearance; "system" until the stored choice is known. */
  darstellung: Darstellung
  darstellungWaehlen: (wert: string) => void
} {
  const { aktionen, laufendeAktionen, pfad, aktionAusfuehren, abmelden } = useRahmenZustand()
  const { navigieren } = useRahmen()
  const { theme, setTheme } = useTheme()

  const liste = useMemo(() => {
    // A running action is locked in the menu like its toolbar button (EC-9).
    const frei = { ...aktionen }
    for (const kennung of laufendeAktionen) if (kennung in frei) frei[kennung] = false
    return menues(frei, pfad)
  }, [aktionen, laufendeAktionen, pfad])

  const ausfuehren = useCallback(
    (eintrag: MenueEintrag) => {
      if (!eintrag.verfuegbar) return
      switch (eintrag.art) {
        case 'aktion':
          return aktionAusfuehren(eintrag.aktion)
        case 'ziel':
          return navigieren(eintrag.pfad)
        case 'abmelden':
          return abmelden()
        case 'ueber':
          return onUeber()
        case 'darstellung':
          return // chosen through its options
      }
    },
    [aktionAusfuehren, navigieren, abmelden, onUeber]
  )

  const darstellungWaehlen = useCallback(
    (wert: string) => {
      if (WERTE.includes(wert)) setTheme(wert)
    },
    [setTheme]
  )

  return {
    menues: liste,
    ausfuehren,
    darstellung: theme && WERTE.includes(theme) ? (theme as Darstellung) : 'system',
    darstellungWaehlen,
  }
}
