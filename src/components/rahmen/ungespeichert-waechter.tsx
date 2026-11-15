'use client'

import { useEffect, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRahmenZustand } from './rahmen-kontext'
import { aktuelleMarke, markeAnlegen } from './verlauf'

/**
 * Guards unsaved changes: the dialog "Nicht gespeicherte Änderungen verwerfen?" (AC-27), the
 * browser's own question on closing or reloading the tab (AC-28) and the back button (AC-27).
 * Everything is per tab (EC-8).
 */
export function UngespeichertWaechter() {
  const { ungespeichert, rueckfrageOffen, rueckfrageStellen, rueckfrageBeantworten, istUngespeichert } =
    useRahmenZustand()
  /** True while our own history entry lies on top of the page's entry. */
  const eintragAktiv = useRef(false)

  // AC-28 / AC-29: the browser only asks while a page reports unsaved changes.
  useEffect(() => {
    if (!ungespeichert) return
    const vorVerlassen = (ereignis: BeforeUnloadEvent) => {
      // Checked at event time: "ohne Rückfrage verlassen" must work at once (EC-3).
      if (!istUngespeichert()) return
      ereignis.preventDefault()
      ereignis.returnValue = true // older browsers need a value to show their question
    }
    window.addEventListener('beforeunload', vorVerlassen)
    return () => window.removeEventListener('beforeunload', vorVerlassen)
  }, [ungespeichert, istUngespeichert])

  // Back button: the App Router cannot block a navigation. An additional history entry with the
  // same address takes the "Zurück"; then the frame asks.
  useEffect(() => {
    if (!ungespeichert || eintragAktiv.current) return
    markeAnlegen('ungespeichert')
    eintragAktiv.current = true
  }, [ungespeichert])

  useEffect(() => {
    const zurueck = () => {
      // Still on our entry (e.g. the drawer's entry above it was closed): nothing was used up.
      if (!eintragAktiv.current || aktuelleMarke() === 'ungespeichert') return
      eintragAktiv.current = false
      // Saved in the meantime: the entry is simply gone, a "Zurück" without visible effect.
      if (!istUngespeichert()) return
      rueckfrageStellen(
        () => window.history.back(),
        () => {
          markeAnlegen('ungespeichert')
          eintragAktiv.current = true
        }
      )
    }
    window.addEventListener('popstate', zurueck)
    return () => window.removeEventListener('popstate', zurueck)
  }, [istUngespeichert, rueckfrageStellen])

  return (
    <AlertDialog
      open={rueckfrageOffen}
      onOpenChange={(offen) => {
        if (!offen) rueckfrageBeantworten(false) // Esc counts as "Abbrechen"
      }}
    >
      <AlertDialogContent className="edge-raised w-[calc(100%-2rem)] max-w-md gap-0 border-0 bg-background p-1 sm:rounded-none">
        <AlertDialogTitle className="titlebar truncate px-2 py-1 text-base md:text-sm">
          Nicht gespeicherte Änderungen verwerfen?
        </AlertDialogTitle>
        <AlertDialogDescription className="p-3 text-base text-foreground md:text-sm">
          Deine Eingaben auf dieser Seite gehen sonst verloren.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-2 p-3 pt-0 sm:space-x-0">
          <AlertDialogCancel className="mt-0" onClick={() => rueckfrageBeantworten(false)}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => rueckfrageBeantworten(true)}
          >
            Verwerfen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
