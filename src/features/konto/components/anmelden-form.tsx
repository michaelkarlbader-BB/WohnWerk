'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { MessageBox, Window } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  abmelden,
  anmelden,
  bestaetigungErneutSenden,
  zweiFaktorPruefen,
  type AktionsErgebnis,
} from '../auth.actions'
import { PASSWORT_MAX } from '../konto.schema'
import { CaptchaFeld, type CaptchaInstanz } from './captcha-feld'

const START: AktionsErgebnis = { ok: false }
const FELDZEILE = 'grid gap-1 md:grid-cols-[9rem_1fr] md:items-center'
const FELDFEHLER = 'text-destructive md:col-start-2'

type Schritt = 'zugang' | 'code'

export function AnmeldenForm({ weiter, startSchritt }: { weiter: string; startSchritt: Schritt }) {
  const [ergebnis, aktion, laeuft] = useActionState(anmelden, START)
  // "Abbrechen" in the code step signs out and redirects to this same page, which keeps the
  // component state. Remembering the aborted result stops it from reopening the code step.
  const [abgebrochen, setAbgebrochen] = useState<AktionsErgebnis | null>(null)

  const codeNoetig =
    startSchritt === 'code' ||
    (ergebnis.ok && ergebnis.schritt === 'code' && ergebnis !== abgebrochen)

  if (codeNoetig) {
    return <CodeSchritt weiter={weiter} onAbbruch={() => setAbgebrochen(ergebnis)} />
  }
  return <ZugangSchritt weiter={weiter} ergebnis={ergebnis} aktion={aktion} laeuft={laeuft} />
}

function ZugangSchritt({
  weiter,
  ergebnis,
  aktion,
  laeuft,
}: {
  weiter: string
  ergebnis: AktionsErgebnis
  aktion: (formData: FormData) => void
  laeuft: boolean
}) {
  const [erneutErgebnis, erneutAktion, erneutLaeuft] = useActionState(
    bestaetigungErneutSenden,
    START,
  )
  const [email, setEmail] = useState('')
  const [captchaBereit, setCaptchaBereit] = useState(false)
  // True while the resend result is newer than the last sign-in result.
  const [erneutAktuell, setErneutAktuell] = useState(false)
  const captchaRef = useRef<CaptchaInstanz>(null)

  // A CAPTCHA token is single-use: every result of either action needs a fresh one. The
  // state is adjusted while rendering (no setState inside an effect); the effect only
  // resets the widget itself.
  const [gesehen, setGesehen] = useState({ ergebnis, erneutErgebnis })
  if (gesehen.ergebnis !== ergebnis || gesehen.erneutErgebnis !== erneutErgebnis) {
    setGesehen({ ergebnis, erneutErgebnis })
    setCaptchaBereit(false)
    setErneutAktuell(gesehen.erneutErgebnis !== erneutErgebnis)
  }

  useEffect(() => {
    captchaRef.current?.reset()
  }, [ergebnis, erneutErgebnis])

  const wartet = laeuft || erneutLaeuft
  const nichtBestaetigt = ergebnis.code === 'nicht_bestaetigt'
  const aktuell = erneutAktuell ? erneutErgebnis : ergebnis
  const emailFehler = aktuell.feldFehler?.email
  const passwortFehler = aktuell.feldFehler?.passwort
  const fehlerMeldung =
    !aktuell.ok && aktuell.meldung && aktuell.code !== 'nicht_bestaetigt' ? aktuell.meldung : null
  const statusText = wartet ? 'Bitte warten…' : aktuell.ok && aktuell.meldung ? aktuell.meldung : ''

  return (
    <Window title="WohnWerk – Anmelden" statusText={statusText}>
      <form action={aktion} className="grid gap-3">
        <input type="hidden" name="weiter" value={weiter} />

        <div className={FELDZEILE}>
          <Label htmlFor="anmelden-email">E-Mail</Label>
          <Input
            id="anmelden-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailFehler ? true : undefined}
            aria-describedby={emailFehler ? 'anmelden-email-fehler' : undefined}
          />
          {emailFehler && (
            <p id="anmelden-email-fehler" className={FELDFEHLER}>
              {emailFehler}
            </p>
          )}
        </div>

        <div className={FELDZEILE}>
          <Label htmlFor="anmelden-passwort">Passwort</Label>
          <Input
            id="anmelden-passwort"
            name="passwort"
            type="password"
            autoComplete="current-password"
            required
            maxLength={PASSWORT_MAX}
            aria-invalid={passwortFehler ? true : undefined}
            aria-describedby={passwortFehler ? 'anmelden-passwort-fehler' : undefined}
          />
          {passwortFehler && (
            <p id="anmelden-passwort-fehler" className={FELDFEHLER}>
              {passwortFehler}
            </p>
          )}
        </div>

        <CaptchaFeld ref={captchaRef} onBereit={setCaptchaBereit} />

        {nichtBestaetigt && (
          <>
            <MessageBox kind="warning">{ergebnis.meldung}</MessageBox>
            {/* EC-1: the resend button lives inside this form and overrides the action via
                `formAction`. That way both actions share the ONE Turnstile widget: its hidden
                `captchaToken` field and the typed `email` field are part of this form and go
                to whichever action is submitted. `formNoValidate` because resending needs no
                password; the action validates the e-mail itself. */}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="submit"
                variant="secondary"
                formAction={erneutAktion}
                formNoValidate
                disabled={wartet || !captchaBereit}
              >
                Bestätigungs-E-Mail erneut senden
              </Button>
            </div>
          </>
        )}

        {fehlerMeldung && <MessageBox kind="error">{fehlerMeldung}</MessageBox>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={wartet || !captchaBereit}>
            Anmelden
          </Button>
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/registrieren" className="underline">
            Registrieren
          </Link>
          <Link href="/passwort-vergessen" className="underline">
            Passwort vergessen?
          </Link>
        </p>
      </form>
    </Window>
  )
}

function CodeSchritt({ weiter, onAbbruch }: { weiter: string; onAbbruch: () => void }) {
  const [ergebnis, aktion, laeuft] = useActionState(zweiFaktorPruefen, START)
  const [brichtAb, starteAbbruch] = useTransition()

  const wartet = laeuft || brichtAb
  const codeFehler = ergebnis.feldFehler?.code

  return (
    <Window title="WohnWerk – Bestätigungscode" statusText={wartet ? 'Bitte warten…' : ''}>
      <form action={aktion} className="grid gap-3">
        <input type="hidden" name="weiter" value={weiter} />

        <p>Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>

        <div className={FELDZEILE}>
          <Label htmlFor="anmelden-code">Code</Label>
          <Input
            id="anmelden-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            autoFocus
            aria-invalid={codeFehler ? true : undefined}
            aria-describedby={codeFehler ? 'anmelden-code-fehler' : undefined}
          />
          {codeFehler && (
            <p id="anmelden-code-fehler" className={FELDFEHLER}>
              {codeFehler}
            </p>
          )}
        </div>

        {!ergebnis.ok && ergebnis.meldung && (
          <MessageBox kind="error">{ergebnis.meldung}</MessageBox>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={wartet}>
            Bestätigen
          </Button>
          {/* Signs out; a plain button, so the code field is neither validated nor sent. */}
          <Button
            type="button"
            variant="secondary"
            disabled={wartet}
            onClick={() =>
              starteAbbruch(async () => {
                onAbbruch()
                await abmelden()
              })
            }
          >
            Abbrechen
          </Button>
        </div>
      </form>
    </Window>
  )
}
