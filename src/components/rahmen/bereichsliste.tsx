'use client'

import { cn } from '@/lib/utils'
import { BEREICHE, aktivesZiel } from './navigation.rules'
import { RahmenLink, useRahmenZustand } from './rahmen-kontext'

const EINTRAG = 'flex min-h-11 items-center truncate px-2 md:min-h-0 md:py-0.5'

/**
 * Area list on the left (desktop): four real links, so bookmarks and middle click work.
 * The active area is marked; areas whose feature is not built yet are visible but greyed out
 * (AC-6, AC-7). Clicks go through the frame: the current view is ignored (EC-1), repeated
 * clicks navigate once (EC-9), unsaved changes ask first (AC-27).
 */
export function Bereichsliste({ className }: { className?: string }) {
  const { pfad } = useRahmenZustand()
  const aktiv = aktivesZiel(pfad)

  return (
    <nav aria-label="Bereiche" className={cn('edge-sunken bg-field p-0.5 text-foreground', className)}>
      <ul>
        {BEREICHE.map((bereich) => (
          <li key={bereich.kennung}>
            {bereich.gebaut ? (
              <RahmenLink
                href={bereich.pfad}
                aria-current={aktiv?.kennung === bereich.kennung ? 'page' : undefined}
                className={cn(
                  EINTRAG,
                  aktiv?.kennung === bereich.kennung ? 'auswahl-primaer' : 'hover:bg-primary-subtle'
                )}
              >
                {bereich.beschriftung}
              </RahmenLink>
            ) : (
              <span aria-disabled="true" className={cn(EINTRAG, 'cursor-default text-muted-foreground')}>
                {bereich.beschriftung}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
