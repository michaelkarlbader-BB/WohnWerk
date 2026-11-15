import type { Metadata } from 'next'
import { PasswortVergessenForm } from '@/features/konto/components/passwort-vergessen-form'

export const metadata: Metadata = { title: 'Passwort vergessen' }

export default function PasswortVergessenPage() {
  return <PasswortVergessenForm />
}
