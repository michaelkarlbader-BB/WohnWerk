'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState, type ReactNode } from 'react'
import { Maximize2, Menu, Minimize2 } from 'lucide-react'
import { Window } from '@/components/retro/window'
import { cn } from '@/lib/utils'
import { Bereichsliste } from './bereichsliste'
import { Menueleiste } from './menueleiste'
import { aktivesZiel, titelleistenText } from './navigation.rules'
import { useRahmenZustand } from './rahmen-kontext'
import { fensterCookie } from './rahmen.rules'
import { Statusleiste } from './statusleiste'
import { Werkzeugleiste } from './werkzeugleiste'

// Loaded when first opened, so they do not delay the frame on the phone (AC-34).
const Schublade = dynamic(() => import('./schublade').then((modul) => modul.Schublade), { ssr: false })
const UeberDialog = dynamic(() => import('./ueber-dialog').then((modul) => modul.UeberDialog), {
  ssr: false,
})

// Classic caption buttons: small raised squares; 44 px on the phone (AC-24).
const TITEL_KNOPF =
  'edge-raised shrink-0 items-center justify-center bg-background text-foreground [&_svg]:size-4'

type ProgrammfensterProps = {
  /** Page of the current area - drawn exactly once, for desktop and phone alike (EC-4). */
  children: ReactNode
  /** What the cookie said when the server drew the page. */
  maximiertStart: boolean
  /** Display name or e-mail address of the signed-in user. */
  nutzer: string
  /** Version for "Über WohnWerk". */
  version: string
}

/**
 * The program window around all signed-in pages (AC-1): title bar, menu bar, toolbar, area list,
 * content and status bar. Desktop: on the desktop surface with a margin, or maximised.
 * Phone: always fills the screen. Both only through the CSS breakpoint `md`.
 */
export function Programmfenster({ children, maximiertStart, nutzer, version }: ProgrammfensterProps) {
  const { pfad, detailtitel } = useRahmenZustand()
  const [maximiert, setMaximiert] = useState(maximiertStart)
  const [schublade, setSchublade] = useState({ offen: false, geladen: false })
  const [ueber, setUeber] = useState({ offen: false, geladen: false })

  const schubladeSetzen = useCallback(
    (offen: boolean) => setSchublade((alt) => ({ offen, geladen: alt.geladen || offen })),
    []
  )
  const ueberSetzen = useCallback(
    (offen: boolean) => setUeber((alt) => ({ offen, geladen: alt.geladen || offen })),
    []
  )
  const ueberOeffnen = useCallback(() => ueberSetzen(true), [ueberSetzen])

  function maximierenUmschalten() {
    const neu = !maximiert
    setMaximiert(neu)
    try {
      // Remembered on this device; the server reads it on the next visit (AC-3).
      document.cookie = fensterCookie(neu)
    } catch {
      // EC-7: storing is not allowed - the choice counts for this visit.
    }
  }

  return (
    <div className={cn('rahmen-hoehe overflow-hidden', !maximiert && 'md:p-4')}>
      <Window
        title={titelleistenText(aktivesZiel(pfad), detailtitel)}
        className="h-full"
        inhaltClassName="flex min-h-0 flex-col gap-0.5 pt-0.5"
        titelLinks={
          <button
            type="button"
            aria-label="Menü öffnen"
            aria-haspopup="dialog"
            aria-expanded={schublade.offen}
            className={cn(TITEL_KNOPF, 'inline-flex size-11 md:hidden')}
            onClick={() => schubladeSetzen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
        }
        titelRechts={
          <button
            type="button"
            aria-label={maximiert ? 'Wiederherstellen' : 'Maximieren'}
            aria-pressed={maximiert}
            className={cn(TITEL_KNOPF, 'hidden size-5 md:inline-flex [&_svg]:size-3')}
            onClick={maximierenUmschalten}
          >
            {maximiert ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </button>
        }
      >
        <Menueleiste onUeber={ueberOeffnen} className="hidden shrink-0 md:flex" />
        <Werkzeugleiste className="shrink-0" />
        <div className="flex min-h-0 flex-1 gap-0.5">
          <Bereichsliste className="hidden w-40 shrink-0 overflow-y-auto md:block" />
          {/* The only part that scrolls (AC-2). */}
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
        </div>
        <Statusleiste nutzer={nutzer} className="shrink-0" />
      </Window>
      {schublade.geladen && (
        <Schublade offen={schublade.offen} onOffenChange={schubladeSetzen} onUeber={ueberOeffnen} />
      )}
      {ueber.geladen && <UeberDialog offen={ueber.offen} onOffenChange={ueberSetzen} version={version} />}
    </div>
  )
}
