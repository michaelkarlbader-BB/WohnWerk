import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageBox, Window } from '@/components/retro/window'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'WohnWerk – Link ungültig' }

type Props = {
  searchParams: Promise<{ art?: string | string[] }>
}

/** Expired or already used mail link (EC-2). */
export default async function LinkUngueltigPage({ searchParams }: Props) {
  // Untrusted query value: only the known kinds change the text, anything else is generic.
  const { art } = await searchParams

  return (
    <Window title="Link ungültig">
      <div className="grid gap-3">
        <MessageBox kind="warning">Dieser Link ist abgelaufen oder wurde schon benutzt.</MessageBox>

        {art === 'email' && (
          <p>Melde dich an – dort kannst du die Bestätigungs-E-Mail erneut senden lassen.</p>
        )}
        {art === 'email_change' && (
          <p>Melde dich an und ändere die E-Mail-Adresse in den Kontoeinstellungen erneut.</p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {art === 'recovery' ? (
            <Button asChild>
              <Link href="/passwort-vergessen">Neuen Link anfordern</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/anmelden">Zur Anmeldung</Link>
            </Button>
          )}
        </div>
      </div>
    </Window>
  )
}
