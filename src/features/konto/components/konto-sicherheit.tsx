'use client'

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { GroupBox, MessageBox } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { abmelden, ueberallAbmelden } from '../auth.actions'
import { passwortAendern, type AktionsErgebnis } from '../konto.actions'
import { PASSWORT_MAX, PASSWORT_MIN } from '../konto.schema'
import { CaptchaFeld, type CaptchaInstanz } from './captcha-feld'
import { meldeAbmeldung } from './sitzungswaechter'
import { ZweiFaktor } from './zwei-faktor'

const START: AktionsErgebnis = { ok: false }

/** Submit button of a plain sign-out form; disabled while its form is submitting (EC-6). */
function AbmeldeButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {children}
    </Button>
  )
}

/** AC-16: the check of the current password is a sign-in at Supabase and needs the CAPTCHA. */
function PasswortAendernForm({ onMeldung }: { onMeldung: (text: string) => void }) {
  const [ergebnis, aktion, laeuft] = useActionState(passwortAendern, START)
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

  useEffect(() => {
    if (laeuft) onMeldung('Bitte warten…')
    else if (ergebnis !== START) onMeldung(ergebnis.ok ? (ergebnis.meldung ?? '') : '')
  }, [laeuft, ergebnis, onMeldung])

  const fehler = ergebnis.feldFehler

  return (
    <form action={aktion} className="grid gap-3">
      <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
        <Label htmlFor="sicherheit-aktuellesPasswort">Aktuelles Passwort</Label>
        <Input
          id="sicherheit-aktuellesPasswort"
          name="aktuellesPasswort"
          type="password"
          autoComplete="current-password"
          required
          maxLength={PASSWORT_MAX}
          aria-invalid={fehler?.aktuellesPasswort ? true : undefined}
          aria-describedby={
            fehler?.aktuellesPasswort ? 'sicherheit-aktuellesPasswort-fehler' : undefined
          }
        />
        {fehler?.aktuellesPasswort && (
          <p id="sicherheit-aktuellesPasswort-fehler" className="text-destructive md:col-start-2">
            {fehler.aktuellesPasswort}
          </p>
        )}
      </div>

      <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
        <Label htmlFor="sicherheit-passwort">Neues Passwort</Label>
        <Input
          id="sicherheit-passwort"
          name="passwort"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORT_MIN}
          maxLength={PASSWORT_MAX}
          aria-invalid={fehler?.passwort ? true : undefined}
          aria-describedby={
            fehler?.passwort
              ? 'sicherheit-passwort-hinweis sicherheit-passwort-fehler'
              : 'sicherheit-passwort-hinweis'
          }
        />
        <p id="sicherheit-passwort-hinweis" className="text-muted-foreground md:col-start-2">
          Mindestens {PASSWORT_MIN} Zeichen.
        </p>
        {fehler?.passwort && (
          <p id="sicherheit-passwort-fehler" className="text-destructive md:col-start-2">
            {fehler.passwort}
          </p>
        )}
      </div>

      <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
        <Label htmlFor="sicherheit-passwortWiederholung">Neues Passwort wiederholen</Label>
        <Input
          id="sicherheit-passwortWiederholung"
          name="passwortWiederholung"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORT_MAX}
          aria-invalid={fehler?.passwortWiederholung ? true : undefined}
          aria-describedby={
            fehler?.passwortWiederholung ? 'sicherheit-passwortWiederholung-fehler' : undefined
          }
        />
        {fehler?.passwortWiederholung && (
          <p
            id="sicherheit-passwortWiederholung-fehler"
            className="text-destructive md:col-start-2"
          >
            {fehler.passwortWiederholung}
          </p>
        )}
      </div>

      <CaptchaFeld ref={captchaRef} onBereit={setCaptchaBereit} />

      {!ergebnis.ok && ergebnis.meldung && (
        <MessageBox kind="error">{ergebnis.meldung}</MessageBox>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" disabled={laeuft || !captchaBereit}>
          Passwort ändern
        </Button>
      </div>

      <p className="text-muted-foreground">
        Nach der Änderung erhältst du eine E-Mail zur Sicherheit.
      </p>
    </form>
  )
}

/**
 * Tab "Sicherheit" of the account window (AC-9, AC-10, AC-12, AC-14, AC-16, AC-27).
 * `onMeldung` should be a stable function (e.g. a state setter); the account window shows the
 * text in its status line.
 */
export function KontoSicherheit({
  zweiFaktorAnzahl,
  onMeldung,
}: {
  /** Verified authenticators: 0, 1 or 2. */
  zweiFaktorAnzahl: number
  onMeldung: (text: string) => void
}) {
  return (
    <div className="grid gap-3">
      <GroupBox title="Passwort ändern">
        <PasswortAendernForm onMeldung={onMeldung} />
      </GroupBox>

      <GroupBox title="Zwei-Faktor-Anmeldung">
        <ZweiFaktor anzahl={zweiFaktorAnzahl} onMeldung={onMeldung} />
      </GroupBox>

      <GroupBox title="Sitzung">
        <div className="grid gap-3">
          {/* EC-4: the other tabs of this browser show the login window. */}
          <form action={abmelden} onSubmit={() => meldeAbmeldung()}>
            <AbmeldeButton>Abmelden</AbmeldeButton>
          </form>
          <form
            action={ueberallAbmelden}
            onSubmit={() => meldeAbmeldung()}
            className="flex flex-wrap items-center gap-2"
          >
            <AbmeldeButton>Auf allen Geräten abmelden</AbmeldeButton>
            <p className="text-muted-foreground">
              Beendet alle Sitzungen, auch auf anderen Geräten.
            </p>
          </form>
        </div>
      </GroupBox>
    </div>
  )
}
