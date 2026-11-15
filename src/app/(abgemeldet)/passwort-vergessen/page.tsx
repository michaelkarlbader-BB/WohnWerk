import type { Metadata } from 'next'
import { PasswortVergessenForm } from '@/features/konto/components/passwort-vergessen-form'

export const metadata: Metadata = { title: 'WohnWerk – Passwort vergessen' }

export default function PasswortVergessenPage() {
  return <PasswortVergessenForm />
}
