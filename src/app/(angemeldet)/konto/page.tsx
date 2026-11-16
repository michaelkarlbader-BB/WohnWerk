import type { Metadata } from 'next'

import { MessageBox, Window } from '@/components/retro/window'
import { tabTitel } from '@/components/rahmen/navigation.rules'
import { KontoFenster } from '@/features/konto/components/konto-fenster'
import { profilLesen } from '@/features/konto/konto.data'
import { seiteSchuetzen } from '@/features/konto/seite-schuetzen'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: tabTitel('konto') }

/** Everything stored about the account (AC-18); null when it cannot be loaded. */
async function kontoLaden(user: { email?: string }) {
  if (!user.email) return null
  try {
    const supabase = await createClient()
    const [profil, faktoren] = await Promise.all([profilLesen(), supabase.auth.mfa.listFactors()])
    if (!profil || faktoren.error) return null
    return {
      email: user.email,
      anzeigename: profil.anzeigename,
      angelegtAm: profil.angelegtAm,
      zweiFaktorAnzahl: faktoren.data.totp.length, // `totp` holds verified factors only
    }
  } catch {
    return null
  }
}

export default async function KontoPage() {
  // Every page checks access itself; a partial render skips the layout (BUG-2).
  const konto = await kontoLaden(await seiteSchuetzen('/konto'))

  if (!konto) {
    return (
      <Window title="Konto" variante="eingebettet" className="p-3 md:max-w-3xl md:p-4">
        <MessageBox kind="error">
          Die Kontodaten konnten gerade nicht geladen werden. Bitte versuche es in einigen Minuten
          erneut.
        </MessageBox>
      </Window>
    )
  }

  return <KontoFenster {...konto} />
}
