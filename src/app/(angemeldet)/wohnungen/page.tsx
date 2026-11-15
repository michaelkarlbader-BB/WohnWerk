import type { Metadata } from 'next'
import { InhaltHinweis } from '@/components/rahmen/inhalt-meldungen'
import { tabTitel } from '@/components/rahmen/navigation.rules'

export const metadata: Metadata = { title: tabTitel('wohnungen') }

// Start page of the frame (PROJ-2 AC-5). Placeholder until PROJ-3 builds the apartments.
export default function WohnungenSeite() {
  return (
    <InhaltHinweis>
      <p>Die Wohnungsverwaltung folgt mit dem nächsten Ausbau.</p>
    </InhaltHinweis>
  )
}
