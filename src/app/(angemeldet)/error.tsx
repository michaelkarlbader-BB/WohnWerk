'use client'

import { useEffect } from 'react'
import { Schiefgelaufen } from '@/components/rahmen/inhalt-meldungen'

// Error boundary of the signed-in pages (PROJ-2 AC-32). It lies inside the layout, so only the
// content is replaced - bars and area list stay usable. No technical details are shown.
export default function Fehler({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Logged once; error tracking follows at /deploy.
    console.error(error)
  }, [error])

  // `retry` fetches the data of the area again and rebuilds it.
  return <Schiefgelaufen onErneut={retry} />
}
