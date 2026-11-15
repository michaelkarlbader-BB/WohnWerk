import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PasswortNeuForm } from '@/features/konto/components/passwort-neu-form'
import { wiederherstellungsEmail } from '@/features/konto/konto.data'

export const metadata: Metadata = { title: 'Neues Passwort' }

export default async function PasswortNeuPage() {
  // Only the session a recovery link created moments ago may set a new password (BUG-1);
  // the path itself can be opened by anyone, a normal signed-in session included.
  const email = await wiederherstellungsEmail().catch(() => null)
  if (!email) redirect('/link-ungueltig?art=recovery')

  return <PasswortNeuForm />
}
