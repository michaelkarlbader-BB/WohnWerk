import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Tab title without any part of the address (PROJ-2 AC-36).
export const metadata: Metadata = { title: 'Seite nicht gefunden' }

// Catch-all of the signed-in pages: every address without a page of its own - also the areas
// that are not built yet (PROJ-2 EC-2) - shows "Diese Seite gibt es nicht." inside the frame.
// It lies in `(angemeldet)`, so the proxy sends signed-out visitors to the sign-in first.
export default function UnbekannteAdresse() {
  notFound()
}
