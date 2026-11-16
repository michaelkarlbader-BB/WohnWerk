'use client'

// Test page for the browser tests of the frame (tests/rahmen-*.spec.ts) - not part of the
// product. In a production build it answers "Diese Seite gibt es nicht." like any unknown
// address. It reports everything a real area can report through the frame interface.

import { notFound } from 'next/navigation'
import { useState } from 'react'
import { RahmenLink, useRahmen, useRahmenBereich } from '@/components/rahmen/rahmen-kontext'

const WARTEZEIT_MS = 1500

function warten(ms: number) {
  return new Promise<void>((fertig) => setTimeout(fertig, ms))
}

export function RahmenTestSeite() {
  if (process.env.NODE_ENV === 'production') notFound()

  const { bestaetigen, ladenBeginnen } = useRahmen()
  const [eingabe, setEingabe] = useState('')
  const [ausgewaehlt, setAusgewaehlt] = useState(false)
  const [mitAktionen, setMitAktionen] = useState(true)
  const [protokoll, setProtokoll] = useState<string[]>([])
  const [fehler, setFehler] = useState(false)

  const merken = (text: string) => setProtokoll((alt) => [...alt, text])

  useRahmenBereich({
    aktionen: mitAktionen
      ? {
          neu: { ausfuehren: () => merken('neu'), verfuegbar: true },
          bearbeiten: { ausfuehren: () => merken('bearbeiten'), verfuegbar: ausgewaehlt },
          loeschen: { ausfuehren: () => merken('loeschen'), verfuegbar: ausgewaehlt },
          aktualisieren: {
            ausfuehren: async () => {
              await warten(WARTEZEIT_MS)
              merken('aktualisieren')
            },
            verfuegbar: true,
          },
        }
      : undefined,
    anzahl: '3 Testeinträge',
    ungespeichert: eingabe !== '',
  })

  if (fehler) throw new Error('Absichtlicher Fehler der Testseite')

  return (
    <div className="space-y-3 p-3 md:p-4">
      <p>Testseite des Rahmens</p>

      <label className="block">
        Eingabe
        <input
          name="eingabe"
          className="block w-full max-w-xs"
          value={eingabe}
          onChange={(ereignis) => setEingabe(ereignis.target.value)}
        />
      </label>

      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={ausgewaehlt}
          onChange={(ereignis) => setAusgewaehlt(ereignis.target.checked)}
        />
        Eintrag ausgewählt
      </label>

      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={mitAktionen}
          onChange={(ereignis) => setMitAktionen(ereignis.target.checked)}
        />
        Aktionen anbieten
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setEingabe('')
            bestaetigen('Testdaten gespeichert.')
          }}
        >
          Speichern
        </button>
        <button type="button" onClick={() => bestaetigen('Zweite Bestätigung.')}>
          Bestätigung melden
        </button>
        <button
          type="button"
          onClick={() => {
            const ende = ladenBeginnen()
            setTimeout(ende, WARTEZEIT_MS)
          }}
        >
          Laden melden
        </button>
        <button type="button" onClick={() => ladenBeginnen()}>
          Endlos laden
        </button>
        <button type="button" onClick={() => setFehler(true)}>
          Fehler auslösen
        </button>
      </div>

      <p>
        <RahmenLink href="/konto" className="inline-flex min-h-11 items-center underline">
          Geschützter Link zum Konto
        </RahmenLink>
      </p>

      <p>
        Protokoll: <output data-testid="protokoll">{protokoll.join(', ')}</output>
      </p>

      {/* Long content: only the content area may scroll (AC-2). */}
      <div data-testid="langer-inhalt" className="h-[200vh]">
        Langer Inhalt
      </div>
      <p data-testid="inhalt-ende">Ende des Inhalts</p>
    </div>
  )
}
