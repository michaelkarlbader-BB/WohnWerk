import type { Metadata } from 'next'
import Link from 'next/link'

import { MessageBox, Window } from '@/components/retro/window'

export const metadata: Metadata = { title: 'WohnWerk – Datenschutz' }

// Placeholder until the operator supplies the text (docs/pflichtschritte.md, Stufe 2).
export default function DatenschutzPage() {
  return (
    <main className="min-h-dvh md:p-4">
      <Window title="WohnWerk – Datenschutzerklärung" as="div" className="md:mx-auto md:max-w-3xl">
        <div className="grid gap-3">
          <MessageBox kind="warning">
            Die Datenschutzerklärung wird vor der Veröffentlichung von WohnWerk an dieser Stelle
            ergänzt.
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
