import { AnmeldenForm } from '@/features/konto/components/anmelden-form'
import { sichereRuecksprungadresse } from '@/features/konto/konto.schema'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Anmelden' }

/**
 * A visitor whose session only owes the second factor starts at the code step (the proxy
 * sends such sessions here). Any error falls back to the credentials step.
 */
async function startSchrittLesen(): Promise<'zugang' | 'code'> {
  try {
    const supabase = await createClient()
    const { data: nutzer, error: nutzerFehler } = await supabase.auth.getUser()
    if (nutzerFehler || !nutzer?.user) return 'zugang'

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return 'zugang'
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2' ? 'code' : 'zugang'
  } catch {
    return 'zugang'
  }
}

export default async function AnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ weiter?: string | string[] }>
}) {
  const { weiter } = await searchParams

  return (
    <AnmeldenForm weiter={sichereRuecksprungadresse(weiter)} startSchritt={await startSchrittLesen()} />
  )
}
