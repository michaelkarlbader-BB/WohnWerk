import type { Metadata } from 'next'
import { RegistrierenForm } from '@/features/konto/components/registrieren-form'

export const metadata: Metadata = { title: 'Registrieren' }

export default function RegistrierenPage() {
  return <RegistrierenForm />
}
