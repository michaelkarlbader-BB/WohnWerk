'use client'

import type { ReactNode } from 'react'
import { MessageBox } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { STARTPFAD } from './navigation.rules'
import { RahmenLink, useRahmenLaden } from './rahmen-kontext'

function ZuDenWohnungen() {
  return (
    <Button asChild variant="outline">
      <RahmenLink href={STARTPFAD}>Zu den Wohnungen</RahmenLink>
    </Button>
  )
}

/** Grey hint text in the content area, e.g. for an empty or not yet built area. */
export function InhaltHinweis({ children }: { children: ReactNode }) {
  return <div className="space-y-3 p-3 text-muted-foreground md:p-4">{children}</div>
}

/** Unknown address or a record that does not exist (any more): AC-10, EC-2. */
export function NichtGefunden() {
  return (
    <InhaltHinweis>
      <p>Diese Seite gibt es nicht.</p>
      <ZuDenWohnungen />
    </InhaltHinweis>
  )
}

/**
 * Unexpected error while showing an area (AC-32): message window without technical details.
 * `onErneut` rebuilds the area and loads its data again.
 */
export function Schiefgelaufen({ onErneut }: { onErneut: () => void }) {
  return (
    <div className="max-w-md p-3 md:p-4">
      <MessageBox kind="error" title="Fehler">
        <p>Hier ist etwas schiefgelaufen.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={onErneut}>
            Erneut versuchen
          </Button>
          <ZuDenWohnungen />
        </div>
      </MessageBox>
    </div>
  )
}

/** Placeholder while an area loads: the status bar shows "Bitte warten…" for as long as it is visible (AC-23). */
export function LadePlatzhalter() {
  useRahmenLaden(true)
  return <div aria-busy="true" className="min-h-24" />
}
