'use client'

import { useEffect } from 'react'
import { MessageBox } from '@/components/retro/window'
import './globals.css'

// Last line of defence when the frame itself (a layout) fails. It replaces the root layout,
// so it brings its own <html>, <body> and styles; the appearance follows the device setting.
export default function GlobalerFehler({ error }: { error: unknown }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="de">
      <body>
        <title>WohnWerk</title>
        <main className="mx-auto max-w-md p-3 md:p-4">
          <MessageBox kind="error" title="WohnWerk">
            <p>Hier ist etwas schiefgelaufen.</p>
            <p className="mt-3">
              <button type="button" onClick={() => window.location.reload()}>
                Neu laden
              </button>
            </p>
          </MessageBox>
        </main>
      </body>
    </html>
  )
}
