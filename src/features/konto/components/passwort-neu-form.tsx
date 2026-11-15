'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { MessageBox, Window } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passwortNeuSetzen, type AktionsErgebnis } from '../auth.actions'
import { PASSWORT_MAX, PASSWORT_MIN } from '../konto.schema'

const START: AktionsErgebnis = { ok: false }

/** Window "Neues Passwort setzen" (AC-3, EC-6). On success the action redirects. */
export function PasswortNeuForm() {
  const [ergebnis, aktion, laeuft] = useActionState(passwortNeuSetzen, START)
  // Once the action asked for the 2FA code, the field stays for every further attempt.
  const [codeNoetig, setCodeNoetig] = useState(false)
  if (ergebnis.code === 'code_noetig' && !codeNoetig) setCodeNoetig(true)

  const fehler = ergebnis.feldFehler
  const codeAngefordert = ergebnis.code === 'code_noetig'

  return (
    <Window title="Neues Passwort setzen" statusText={laeuft ? 'Bitte warten…' : ''}>
      <form action={aktion} className="grid gap-3">
        <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
          <Label htmlFor="passwort">Neues Passwort</Label>
          <Input
            id="passwort"
            name="passwort"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORT_MIN}
            maxLength={PASSWORT_MAX}
            aria-invalid={fehler?.passwort ? true : undefined}
            aria-describedby={
              fehler?.passwort ? 'passwort-hinweis passwort-fehler' : 'passwort-hinweis'
            }
          />
          <p id="passwort-hinweis" className="text-muted-foreground md:col-start-2">
            Mindestens {PASSWORT_MIN} Zeichen.
          </p>
          {fehler?.passwort && (
            <p id="passwort-fehler" className="text-destructive md:col-start-2">
              {fehler.passwort}
            </p>
          )}
        </div>

        <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
          <Label htmlFor="passwortWiederholung">Passwort wiederholen</Label>
          <Input
            id="passwortWiederholung"
            name="passwortWiederholung"
            type="password"
            autoComplete="new-password"
            required
            maxLength={PASSWORT_MAX}
            aria-invalid={fehler?.passwortWiederholung ? true : undefined}
            aria-describedby={
              fehler?.passwortWiederholung ? 'passwortWiederholung-fehler' : undefined
            }
          />
          {fehler?.passwortWiederholung && (
            <p id="passwortWiederholung-fehler" className="text-destructive md:col-start-2">
              {fehler.passwortWiederholung}
            </p>
          )}
        </div>

        {codeNoetig && (
          <>
            {codeAngefordert && <MessageBox kind="info">{ergebnis.meldung}</MessageBox>}
            <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                aria-invalid={fehler?.code ? true : undefined}
                aria-describedby={fehler?.code ? 'code-fehler' : undefined}
              />
              {fehler?.code && (
                <p id="code-fehler" className="text-destructive md:col-start-2">
                  {fehler.code}
                </p>
              )}
            </div>
          </>
        )}

        {!codeAngefordert && ergebnis.meldung && (
          <MessageBox kind="error">
            <p>{ergebnis.meldung}</p>
            {ergebnis.code === 'nicht_angemeldet' && (
              <p>
                <Link href="/passwort-vergessen" className="underline">
                  Neuen Link anfordern
                </Link>
              </p>
            )}
          </MessageBox>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={laeuft}>
            Passwort speichern
          </Button>
        </div>
      </form>
    </Window>
  )
}
