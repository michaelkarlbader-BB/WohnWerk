'use client'

import { useState } from 'react'
import { Window } from '@/components/retro/window'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KontoAllgemein } from './konto-allgemein'
import { KontoLoeschen } from './konto-loeschen'
import { KontoSicherheit } from './konto-sicherheit'

type KontoFensterProps = {
  email: string
  anzeigename: string | null
  /** ISO timestamp of the profile's creation. */
  angelegtAm: string
  /** Verified authenticators: 0, 1 or 2. */
  zweiFaktorAnzahl: number
}

/**
 * Account page with its three tabs, embedded in the program window: the frame's title bar
 * names it (PROJ-2 AC-14). Confirmations of all tabs go to the status line of the page.
 */
export function KontoFenster({ email, anzeigename, angelegtAm, zweiFaktorAnzahl }: KontoFensterProps) {
  const [status, setStatus] = useState('')
  const zweiFaktorAktiv = zweiFaktorAnzahl > 0

  return (
    <Window
      title="Konto"
      variante="eingebettet"
      statusText={status}
      className="gap-3 p-3 md:max-w-3xl md:p-4"
    >
      {/* A new tab starts with an empty status line. */}
      <Tabs defaultValue="allgemein" onValueChange={() => setStatus('')}>
        <TabsList>
          <TabsTrigger value="allgemein">Allgemein</TabsTrigger>
          <TabsTrigger value="sicherheit">Sicherheit</TabsTrigger>
          <TabsTrigger value="loeschen">Konto löschen</TabsTrigger>
        </TabsList>
        <TabsContent value="allgemein">
          <KontoAllgemein
            email={email}
            anzeigename={anzeigename}
            angelegtAm={angelegtAm}
            zweiFaktorAktiv={zweiFaktorAktiv}
            onMeldung={setStatus}
          />
        </TabsContent>
        <TabsContent value="sicherheit">
          <KontoSicherheit zweiFaktorAnzahl={zweiFaktorAnzahl} onMeldung={setStatus} />
        </TabsContent>
        <TabsContent value="loeschen">
          <KontoLoeschen zweiFaktorAktiv={zweiFaktorAktiv} onMeldung={setStatus} />
        </TabsContent>
      </Tabs>
    </Window>
  )
}
