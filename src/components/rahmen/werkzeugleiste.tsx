'use client'

import { Fragment } from 'react'
import { FilePlus, Pencil, RefreshCw, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AKTION_BESCHRIFTUNG, type AktionKennung } from './navigation.rules'
import { useRahmenZustand } from './rahmen-kontext'

const REIHENFOLGE: readonly AktionKennung[] = ['neu', 'bearbeiten', 'loeschen', 'aktualisieren']
const SYMBOL: Record<AktionKennung, LucideIcon> = {
  neu: FilePlus,
  bearbeiten: Pencil,
  loeschen: Trash2,
  aktualisieren: RefreshCw,
}

/**
 * Toolbar: exactly the actions the current page reports (AC-17) - greyed out when not available,
 * locked while running (EC-9). An area without actions shows an empty bar. Symbol buttons with
 * 44 px on the phone, symbol plus label from md upwards (sizes come from globals.css).
 */
export function Werkzeugleiste({ className }: { className?: string }) {
  const { aktionen, laufendeAktionen, aktionAusfuehren } = useRahmenZustand()
  const gemeldet = REIHENFOLGE.filter((kennung) => aktionen[kennung] !== undefined)

  return (
    <TooltipProvider delayDuration={600}>
      <div
        role="toolbar"
        aria-label="Werkzeugleiste"
        className={cn('flex min-h-11 flex-wrap items-center gap-1 px-1 py-1 md:min-h-[31px]', className)}
      >
        {gemeldet.map((kennung, index) => {
          const Symbol = SYMBOL[kennung]
          const name = AKTION_BESCHRIFTUNG[kennung]
          const laeuft = laufendeAktionen.includes(kennung)
          // "Aktualisieren" stands apart from the editing actions, as in the app shell sketch.
          const abgesetzt = kennung === 'aktualisieren' && index > 0
          return (
            <Fragment key={kennung}>
              {abgesetzt && <span aria-hidden="true" className="mx-1 h-5 w-px self-center bg-edge-shadow" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={name}
                    aria-busy={laeuft || undefined}
                    disabled={aktionen[kennung] !== true || laeuft}
                    onClick={() => aktionAusfuehren(kennung)}
                  >
                    <Symbol aria-hidden="true" />
                    <span className="hidden md:inline">{name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-none border-edge-dark bg-warning-background px-1.5 py-0.5 text-xs text-foreground">
                  {name}
                </TooltipContent>
              </Tooltip>
            </Fragment>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
