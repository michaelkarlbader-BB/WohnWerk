'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { MessageBox, Window } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrieren, type AktionsErgebnis } from '../auth.actions'
import { PASSWORT_MAX, PASSWORT_MIN } from '../konto.schema'
import { CaptchaFeld, type CaptchaInstanz } from './captcha-feld'

const START: AktionsErgebnis = { ok: false }

/** Window "Registrieren" (AC-1, AC-2, AC-3, AC-23, AC-24, EC-6). */
export function RegistrierenForm() {
  const [ergebnis, aktion, laeuft] = useActionState(registrieren, START)
  const [email, setEmail] = useState('')
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

  const fehler = ergebnis.feldFehler
  const statusText = laeuft ? 'Bitte warten…' : ergebnis.ok ? (ergebnis.meldung ?? '') : ''

  return (
    <Window title="WohnWerk – Registrieren" statusText={statusText}>
      {ergebnis.ok ? (
        // Identical for a new and an already registered address (AC-24).
        <div className="grid gap-3">
          <MessageBox kind="info">{ergebnis.meldung}</MessageBox>
          <p>
            <Link href="/anmelden" className="underline">
              Zur Anmeldung
            </Link>
          </p>
        </div>
      ) : (
        <form action={aktion} className="grid gap-3">
          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={fehler?.email ? true : undefined}
              aria-describedby={fehler?.email ? 'email-fehler' : undefined}
            />
            {fehler?.email && (
              <p id="email-fehler" className="text-destructive md:col-start-2">
                {fehler.email}
              </p>
            )}
          </div>

          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="passwort">Passwort</Label>
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

          <CaptchaFeld ref={captchaRef} onBereit={setCaptchaBereit} />

          {ergebnis.meldung && <MessageBox kind="error">{ergebnis.meldung}</MessageBox>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/anmelden" className="underline">
              Zurück zur Anmeldung
            </Link>
            <Button type="submit" disabled={laeuft || !captchaBereit}>
              Registrieren
            </Button>
          </div>
        </form>
      )}
    </Window>
  )
}
