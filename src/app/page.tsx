import { redirect } from 'next/navigation'

// The proxy sends signed-out visitors to /anmelden before this runs.
export default function Startseite() {
  redirect('/wohnungen')
}
