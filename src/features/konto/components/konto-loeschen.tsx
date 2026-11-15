'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { GroupBox, MessageBox } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { kontoLoeschen, type AktionsErgebnis } from '../konto.actions'
import { PASSWORT_MAX } from '../konto.schema'
import { CaptchaFeld, type CaptchaInstanz } from './captcha-feld'

const START: AktionsErgebnis = { ok: false }

type KontoLoeschenProps = {
  zweiFaktorAktiv: boolean
  /** Status line of the account window: "Bitte warten…" or ''. */
  onMeldung: (text: string) => void
}

/** Tab "Konto löschen" of the account window (AC-19, AC-20, EC-6). The server decides. */
export function KontoLoeschen({ zweiFaktorAktiv, onMeldung }: KontoLoeschenProps) {
  const [ergebnis, aktion, laeuft] = useActionState(kontoLoeschen, START)
  const [captchaBereit, setCaptchaBereit] = useState(false)
  const captchaRef = useRef<CaptchaInstanz>(null)

  // A CAPTCHA token is valid for one request only: every new result withdraws the release
  // (state adjusted during render) and resets the widget.
  const [gesehen, setGesehen] = useState(ergebnis)
  if (gesehen !== ergebnis) {
    setGesehen(ergebnis)
    setCaptchaBereit(false)
  }
  useEffect(() => {
    captchaRef.current?.reset()
  }, [ergebnis])

  // Success redirects to the login, so there is no confirmation text here.
  const statusText = laeuft ? 'Bitte warten…' : ''
  useEffect(() => {
    onMeldung(statusText)
  }, [statusText, onMeldung])

  const fehler = ergebnis.feldFehler

  return (
    <div className="grid gap-3">
      <MessageBox kind="warning">
        Das Löschen ist sofort wirksam und endgültig: Login, Profil und alle deine Daten in WohnWerk
        werden gelöscht und lassen sich nicht wiederherstellen. Für eine neue Registrierung brauchst
        du danach eine neue Freigabe.
      </MessageBox>

      <GroupBox title="Löschen bestätigen">
        <form action={aktion} className="grid gap-3">
          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="loeschen-passwort">Passwort</Label>
            <Input
              id="loeschen-passwort"
              name="passwort"
              type="password"
              autoComplete="current-password"
              required
              maxLength={PASSWORT_MAX}
              aria-invalid={fehler?.passwort ? true : undefined}
              aria-describedby={fehler?.passwort ? 'loeschen-passwort-fehler' : undefined}
            />
            {fehler?.passwort && (
              <p id="loeschen-passwort-fehler" className="text-destructive md:col-start-2">
                {fehler.passwort}
              </p>
            )}
          </div>

          {zweiFaktorAktiv && (
            <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
              <Label htmlFor="loeschen-code">Code aus der Authenticator-App</Label>
              <Input
                id="loeschen-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                maxLength={6}
                aria-invalid={fehler?.code ? true : undefined}
                aria-describedby={fehler?.code ? 'loeschen-code-fehler' : undefined}
              />
              {fehler?.code && (
                <p id="loeschen-code-fehler" className="text-destructive md:col-start-2">
                  {fehler.code}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="loeschen-bestaetigung">Tippe LÖSCHEN</Label>
            <Input
              id="loeschen-bestaetigung"
              name="bestaetigung"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              maxLength={7}
              aria-invalid={fehler?.bestaetigung ? true : undefined}
              aria-describedby={fehler?.bestaetigung ? 'loeschen-bestaetigung-fehler' : undefined}
            />
            {fehler?.bestaetigung && (
              <p id="loeschen-bestaetigung-fehler" className="text-destructive md:col-start-2">
                {fehler.bestaetigung}
              </p>
            )}
          </div>

          <CaptchaFeld ref={captchaRef} onBereit={setCaptchaBereit} />

          {ergebnis.meldung && <MessageBox kind="error">{ergebnis.meldung}</MessageBox>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="destructive" disabled={laeuft || !captchaBereit}>
              Konto endgültig löschen
            </Button>
          </div>
        </form>
      </GroupBox>
    </div>
  )
}
