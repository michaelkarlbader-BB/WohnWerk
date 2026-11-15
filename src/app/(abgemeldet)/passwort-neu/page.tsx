import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PasswortNeuForm } from '@/features/konto/components/passwort-neu-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'WohnWerk – Neues Passwort' }

export default async function PasswortNeuPage() {
  // Only the session a recovery link created may set a new password; the path itself
  // can be opened by anyone.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) redirect('/link-ungueltig?art=recovery')

  return <PasswortNeuForm />
}
