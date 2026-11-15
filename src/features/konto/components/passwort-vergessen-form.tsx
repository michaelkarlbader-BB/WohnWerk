'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { MessageBox, Window } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { passwortVergessen, type AktionsErgebnis } from '../auth.actions'
import { CaptchaFeld, type CaptchaInstanz } from './captcha-feld'

const START: AktionsErgebnis = { ok: false }

/** Window "Passwort vergessen" (AC-11, AC-23, EC-6). */
export function PasswortVergessenForm() {
  const [ergebnis, aktion, laeuft] = useActionState(passwortVergessen, START)
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
    <Window title="Passwort vergessen" statusText={statusText}>
      {ergebnis.ok ? (
        // Always the same answer, whether or not an account exists (AC-11).
        <div className="grid gap-3">
          <MessageBox kind="info">{ergebnis.meldung}</MessageBox>
          <p>
            <Link href="/anmelden" className="underline">
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      ) : (
        <form action={aktion} className="grid gap-3">
          <p>
            Gib deine E-Mail-Adresse ein. Du erhältst einen Link, über den du ein neues Passwort
            festlegst.
          </p>

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

          <CaptchaFeld ref={captchaRef} onBereit={setCaptchaBereit} />

          {ergebnis.meldung && <MessageBox kind="error">{ergebnis.meldung}</MessageBox>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/anmelden" className="underline">
              Zurück zur Anmeldung
            </Link>
            <Button type="submit" disabled={laeuft || !captchaBereit}>
              Link anfordern
            </Button>
          </div>
        </form>
      )}
    </Window>
  )
}
