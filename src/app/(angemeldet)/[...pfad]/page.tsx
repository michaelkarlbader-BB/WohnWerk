import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { seiteSchuetzen } from '@/features/konto/seite-schuetzen'

// Tab title without any part of the address (PROJ-2 AC-36).
export const metadata: Metadata = { title: 'Seite nicht gefunden' }

// Catch-all of the signed-in pages: every address without a page of its own - also the areas
// that are not built yet (PROJ-2 EC-2) - shows "Diese Seite gibt es nicht." inside the frame.
// It checks access itself: neither the proxy (file endings) nor the layout (partial render)
// is guaranteed to run before it (BUG-2).
export default async function UnbekannteAdresse() {
  await seiteSchuetzen()
  notFound()
}
