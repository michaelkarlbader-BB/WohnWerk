'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useRahmenZustand } from './rahmen-kontext'

const FELD = 'edge-sunken min-h-6 px-2 py-1'

type StatusleisteProps = {
  /** Display name or e-mail address of the signed-in user. */
  nutzer: string
  className?: string
}

/**
 * Status bar (AC-21–23, AC-33): status text with the segment progress bar, the count reported
 * by the area and the signed-in user. On the phone only the status text, in one line (AC-24).
 * Long texts are cut with "…" instead of wrapping (EC-5).
 */
export function Statusleiste({ nutzer, className }: StatusleisteProps) {
  const { statustext, laedt, anzahl } = useRahmenZustand()
  const angemeldet = `Angemeldet: ${nutzer}`

  return (
    <footer className={cn('flex gap-0.5 text-sm text-muted-foreground', className)}>
      <div className={cn(FELD, 'flex min-w-0 flex-1 items-center gap-2')}>
        {/* Confirmations are announced; the text is never removed from the page. */}
        <p role="status" aria-live="polite" className="min-w-0 truncate" title={statustext}>
          {statustext}
        </p>
        {laedt && (
          // The shadcn progress bar, restyled to running segments (indeterminate).
          <Progress
            value={null}
            aria-label="Ladevorgang"
            className="segment-fortschritt h-3 w-24 shrink-0 rounded-none bg-transparent [&>div]:hidden"
          />
        )}
      </div>
      <p
        data-testid="status-anzahl"
        className={cn(FELD, 'hidden w-40 shrink-0 truncate md:block')}
        title={anzahl ?? undefined}
      >
        {anzahl}
      </p>
      <p className={cn(FELD, 'hidden max-w-[40%] shrink-0 truncate md:block')} title={angemeldet}>
        {angemeldet}
      </p>
    </footer>
  )
}
