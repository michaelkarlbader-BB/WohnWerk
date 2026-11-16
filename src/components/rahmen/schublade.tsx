'use client'

import { useEffect, useId, useRef } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { BEREICHE, aktivesZiel, type Menue, type MenueEintrag } from './navigation.rules'
import { useRahmen, useRahmenZustand } from './rahmen-kontext'
import { useMenues } from './use-menues'
import { aktuelleMarke, markeAnlegen } from './verlauf'

// At least 44 px high, full width (AC-24, AC-26). Disabled entries stay visible (AC-7).
const EINTRAG =
  'flex min-h-11 w-full items-center px-4 text-left disabled:cursor-default disabled:text-muted-foreground'
const UEBERSCHRIFT = 'px-4 pb-1 pt-3 text-sm font-bold text-muted-foreground'
/** How long a chosen entry waits for the browser to remove the drawer's history entry. */
const WARTEN_AUF_ZURUECK_MS = 300

type SchubladeProps = {
  offen: boolean
  onOffenChange: (offen: boolean) => void
  /** Opens the dialog "Über WohnWerk". */
  onUeber: () => void
}

/**
 * Drawer of the phone (AC-25): the areas and all menu entries of AC-11, with the same rules as
 * the menu bar (`useMenues`). Closes on a choice, a tap beside it, Esc, "Zurück" and when the
 * window becomes desktop width (EC-4).
 */
export function Schublade({ offen, onOffenChange, onUeber }: SchubladeProps) {
  const { menues, ausfuehren, darstellung, darstellungWaehlen } = useMenues(onUeber)
  const { pfad } = useRahmenZustand()
  const { navigieren } = useRahmen()
  const mobil = useIsMobile()
  const id = useId()
  const aktiv = aktivesZiel(pfad)
  /** True while a chosen entry waits for the history entry to be removed (EC-9). */
  const wartet = useRef(false)
  /** True when a step back was already requested for the entry that is still on top. */
  const ohneZurueck = useRef(false)

  // EC-4: from md upwards the menu bar and the area list take over.
  useEffect(() => {
    if (offen && !mobil) onOffenChange(false)
  }, [offen, mobil, onOffenChange])

  // "Zurück" closes the drawer instead of leaving the page: an own history entry takes it.
  useEffect(() => {
    if (!offen) {
      // Closed in another way (tap beside it, Esc, width): take our entry out again.
      if (aktuelleMarke() === 'schublade' && !ohneZurueck.current) window.history.back()
      ohneZurueck.current = false
      return
    }
    // Not in a cleanup and only once: effects may run twice, and the browser decides where
    // history.back() leads at the moment it is called.
    if (aktuelleMarke() !== 'schublade') markeAnlegen('schublade')
    const zurueck = () => {
      if (aktuelleMarke() !== 'schublade') onOffenChange(false)
    }
    window.addEventListener('popstate', zurueck)
    return () => window.removeEventListener('popstate', zurueck)
  }, [offen, onOffenChange])

  /** Closes the drawer, then runs the chosen entry. */
  function waehlen(aktion: () => void) {
    if (wartet.current) return
    if (aktuelleMarke() !== 'schublade') {
      onOffenChange(false)
      aktion()
      return
    }
    // Our history entry must be gone before the entry navigates, otherwise both would race.
    // Its "popstate" also closes the drawer (see above).
    wartet.current = true
    let erledigt = false
    const weiter = () => {
      if (erledigt) return
      erledigt = true
      wartet.current = false
      window.removeEventListener('popstate', weiter)
      window.clearTimeout(frist)
      // The browser has not reported the step back yet: do not ask for a second one.
      ohneZurueck.current = aktuelleMarke() === 'schublade'
      onOffenChange(false)
      aktion()
    }
    const frist = window.setTimeout(weiter, WARTEN_AUF_ZURUECK_MS)
    window.addEventListener('popstate', weiter)
    window.history.back()
  }

  function eintragZeichnen(eintrag: MenueEintrag) {
    if (eintrag.art === 'darstellung') {
      return (
        <div role="radiogroup" aria-label={eintrag.beschriftung}>
          <p className="px-4 pt-2 text-sm text-muted-foreground" aria-hidden="true">
            {eintrag.beschriftung}
          </p>
          {eintrag.optionen.map((option) => (
            <button
              key={option.wert}
              type="button"
              role="radio"
              aria-checked={darstellung === option.wert}
              className={cn(EINTRAG, 'gap-2 pl-6')}
              onClick={() => waehlen(() => darstellungWaehlen(option.wert))}
            >
              <span aria-hidden="true" className="w-3">
                {darstellung === option.wert ? '•' : ''}
              </span>
              {option.beschriftung}
            </button>
          ))}
        </div>
      )
    }

    const markiert = eintrag.art === 'ziel' && eintrag.markiert
    return (
      <button
        type="button"
        disabled={!eintrag.verfuegbar}
        aria-current={markiert ? 'page' : undefined}
        className={cn(EINTRAG, markiert && 'font-bold')}
        onClick={() => waehlen(() => ausfuehren(eintrag))}
      >
        {eintrag.beschriftung}
      </button>
    )
  }

  function gruppeZeichnen(menue: Menue) {
    const titelId = `${id}-${menue.kennung}`
    return (
      <section key={menue.kennung} aria-labelledby={titelId}>
        <h3 id={titelId} className={UEBERSCHRIFT}>
          {menue.titel === '?' ? 'Hilfe' : menue.titel}
        </h3>
        <ul>
          {menue.eintraege.map((eintrag) => (
            <li key={eintrag.beschriftung}>{eintragZeichnen(eintrag)}</li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <Sheet open={offen} onOpenChange={onOffenChange}>
      <SheetContent
        side="left"
        // The built-in close button (English label) is hidden: a tap beside the drawer,
        // Esc and "Zurück" close it.
        className="edge-raised flex w-[min(20rem,85vw)] flex-col gap-0 border-0 bg-background p-1 text-foreground sm:max-w-none [&>button:last-child]:hidden"
      >
        <SheetTitle className="titlebar shrink-0 px-2 py-1 text-base">Menü</SheetTitle>
        <SheetDescription className="sr-only">Bereiche und Menüeinträge</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          <nav aria-label="Bereiche">
            <ul>
              {BEREICHE.map((bereich) => {
                const markiert = aktiv?.kennung === bereich.kennung
                return (
                  <li key={bereich.kennung}>
                    <button
                      type="button"
                      disabled={!bereich.gebaut}
                      aria-current={markiert ? 'page' : undefined}
                      className={cn(EINTRAG, markiert && 'auswahl-primaer')}
                      onClick={() => waehlen(() => navigieren(bereich.pfad))}
                    >
                      {bereich.beschriftung}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          {menues.map(gruppeZeichnen)}
        </div>
      </SheetContent>
    </Sheet>
  )
}
