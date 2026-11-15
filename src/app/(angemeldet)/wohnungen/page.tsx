import type { Metadata } from 'next'
import { Window } from '@/components/retro/window'

export const metadata: Metadata = { title: 'WohnWerk – Wohnungen' }

// Placeholder until PROJ-2 (frame) and PROJ-3 (apartments) replace it.
export default function WohnungenSeite() {
  return (
    <Window title="WohnWerk – Wohnungen" className="md:mx-auto md:max-w-3xl">
      <div className="text-muted-foreground">
        <p>Noch keine Wohnungen erfasst.</p>
        <p className="mt-1">Die Wohnungsverwaltung folgt in einem späteren Schritt.</p>
      </div>
    </Window>
  )
}
