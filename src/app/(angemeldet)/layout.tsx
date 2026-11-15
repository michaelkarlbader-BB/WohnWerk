import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Programmfenster } from '@/components/rahmen/programmfenster'
import { RahmenKontext } from '@/components/rahmen/rahmen-kontext'
import { FENSTER_COOKIE, istMaximiert } from '@/components/rahmen/rahmen.rules'
import { UngespeichertWaechter } from '@/components/rahmen/ungespeichert-waechter'
import { abmelden } from '@/features/konto/auth.actions'
import { Sitzungswaechter } from '@/features/konto/components/sitzungswaechter'
import { profilLesen } from '@/features/konto/konto.data'
import { createClient } from '@/lib/supabase/server'
import paket from '../../../package.json'

/** E-mail of the signed-in user, or null. Fails closed: any error counts as signed out. */
async function angemeldeteEmail(): Promise<{ email: string } | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null
    return { email: data.user.email ?? '' }
  } catch {
    return null
  }
}

/** The frame must never crash because of the name: fall back to the e-mail address. */
async function anzeigename(): Promise<string | null> {
  try {
    return (await profilLesen())?.anzeigename?.trim() || null
  } catch {
    return null
  }
}

/** "Maximised" as chosen on this device; only the exact cookie value counts. */
async function fensterMaximiert(): Promise<boolean> {
  try {
    return istMaximiert((await cookies()).get(FENSTER_COOKIE)?.value)
  } catch {
    return false
  }
}

// The frame around all signed-in pages (PROJ-2, docs/app-shell.md). It is drawn on the server
// and loads no data of any area - only who is signed in and how the window is shown.
export default async function AngemeldetLayout({ children }: { children: ReactNode }) {
  // Defence in depth: the proxy already redirects signed-out visitors.
  const [nutzer, name, maximiert] = await Promise.all([
    angemeldeteEmail(),
    anzeigename(),
    fensterMaximiert(),
  ])
  if (!nutzer) redirect('/anmelden')

  return (
    <RahmenKontext abmelden={abmelden}>
      <Sitzungswaechter />
      <Programmfenster maximiertStart={maximiert} nutzer={name ?? nutzer.email} version={paket.version}>
        {children}
      </Programmfenster>
      <UngespeichertWaechter />
    </RahmenKontext>
  )
}
