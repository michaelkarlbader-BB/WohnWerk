import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { abmelden } from '@/features/konto/auth.actions'
import { Sitzungswaechter } from '@/features/konto/components/sitzungswaechter'
import { profilLesen } from '@/features/konto/konto.data'
import { createClient } from '@/lib/supabase/server'

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

const LINK = 'inline-flex min-h-11 items-center underline md:min-h-0'

// Minimal signed-in frame of PROJ-1; PROJ-2 replaces it with the program window.
export default async function AngemeldetLayout({ children }: { children: ReactNode }) {
  // Defence in depth: the proxy already redirects signed-out visitors.
  const nutzer = await angemeldeteEmail()
  if (!nutzer) redirect('/anmelden')

  const name = (await anzeigename()) ?? nutzer.email

  return (
    <div className="flex min-h-dvh flex-col">
      <Sitzungswaechter />
      <main className="flex-1 md:p-4">{children}</main>
      <footer className="edge-sunken flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-background px-2 py-1 text-sm text-muted-foreground">
        <p className="min-w-0 break-words">Angemeldet: {name}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/konto" className={LINK}>
            Konto
          </Link>
          <Link href="/wohnungen" className={LINK}>
            Wohnungen
          </Link>
          <form action={abmelden}>
            <Button type="submit" variant="outline" size="sm">
              Abmelden
            </Button>
          </form>
        </div>
      </footer>
    </div>
  )
}
