import type { Metadata } from 'next'
import Link from 'next/link'

import { MessageBox, Window } from '@/components/retro/window'

export const metadata: Metadata = { title: 'WohnWerk – Impressum' }

// Placeholder until the operator supplies the text (docs/pflichtschritte.md, Stufe 3).
export default function ImpressumPage() {
  return (
    <main className="min-h-dvh md:p-4">
      <Window title="WohnWerk – Impressum" as="div" className="md:mx-auto md:max-w-3xl">
        <div className="grid gap-3">
          <MessageBox kind="warning">
            Das Impressum wird vor der Veröffentlichung von WohnWerk an dieser Stelle ergänzt.
          </MessageBox>
          <p>
            <Link href="/anmelden" className="underline">
              Zur Anmeldung
            </Link>
          </p>
        </div>
      </Window>
    </main>
  )
}
