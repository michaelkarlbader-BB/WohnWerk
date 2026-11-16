import type { Metadata } from 'next'
import { InhaltHinweis } from '@/components/rahmen/inhalt-meldungen'
import { tabTitel } from '@/components/rahmen/navigation.rules'
import { seiteSchuetzen } from '@/features/konto/seite-schuetzen'

export const metadata: Metadata = { title: tabTitel('wohnungen') }

// Start page of the frame (PROJ-2 AC-5). Placeholder until PROJ-3 builds the apartments.
export default async function WohnungenSeite() {
  await seiteSchuetzen('/wohnungen') // every page checks itself, the layout may be skipped (BUG-2)
  return (
    <InhaltHinweis>
      <p>Die Wohnungsverwaltung folgt mit dem nächsten Ausbau.</p>
    </InhaltHinweis>
  )
}
