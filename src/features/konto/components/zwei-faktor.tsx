'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { MessageBox } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  zweiFaktorAusschalten,
  zweiFaktorBestaetigen,
  zweiFaktorStarten,
  type AktionsErgebnis,
} from '../konto.actions'

type Einrichtung = NonNullable<AktionsErgebnis['einrichtung']>
type Melden = (text: string) => void

const START: AktionsErgebnis = { ok: false }
const WARTEN = 'Bitte warten…'

function statusText(anzahl: number): string {
  if (anzahl <= 0) return 'Zwei-Faktor-Anmeldung ist ausgeschaltet.'
  if (anzahl === 1) return 'Zwei-Faktor-Anmeldung ist eingeschaltet (1 Authenticator-App).'
  return `Zwei-Faktor-Anmeldung ist eingeschaltet (${anzahl} Authenticator-Apps).`
}

/** Field row for a 6-digit authenticator code (form field `code`). */
function CodeFeld({ id, label, fehler }: { id: string; label: string; fehler?: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        maxLength={6}
        pattern="[0-9]{6}"
        className="md:w-32"
        aria-invalid={fehler ? true : undefined}
        aria-describedby={fehler ? `${id}-fehler` : undefined}
      />
      {fehler && (
        <p id={`${id}-fehler`} className="text-destructive md:col-start-2">
          {fehler}
        </p>
      )}
    </div>
  )
}

/**
 * Starts the enrolment (AC-12); the second authenticator needs a code of the first one (AC-14).
 * The action state with the secret lives here and is dropped when the step replaces this form.
 */
function StartForm({
  anzahl,
  onMeldung,
  onEinrichtung,
}: {
  anzahl: number
  onMeldung: Melden
  onEinrichtung: (einrichtung: Einrichtung) => void
}) {
  const [ergebnis, aktion, laeuft] = useActionState(zweiFaktorStarten, START)

  useEffect(() => {
    if (laeuft) onMeldung(WARTEN)
    else if (ergebnis !== START) {
      onMeldung('')
      if (ergebnis.einrichtung) onEinrichtung(ergebnis.einrichtung)
    }
  }, [laeuft, ergebnis, onMeldung, onEinrichtung])

  return (
    <form action={aktion} className="grid gap-3">
      {anzahl > 0 && (
        <CodeFeld
          id="zf-code-hinzufuegen"
          label="Aktueller Code"
          fehler={ergebnis.feldFehler?.code}
        />
      )}
      {!ergebnis.ok && ergebnis.meldung && (
        <MessageBox kind="error">{ergebnis.meldung}</MessageBox>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" variant={anzahl > 0 ? 'secondary' : 'default'} disabled={laeuft}>
          {anzahl > 0 ? 'Zweite Authenticator-App hinzufügen…' : 'Einrichten…'}
        </Button>
      </div>
    </form>
  )
}

/** Enrolment step: QR code, secret and the first code. Without a valid code 2FA stays inactive. */
function EinrichtungSchritt({
  einrichtung,
  onMeldung,
  onSchliessen,
}: {
  einrichtung: Einrichtung
  onMeldung: Melden
  onSchliessen: () => void
}) {
  const [ergebnis, aktion, laeuft] = useActionState(zweiFaktorBestaetigen, START)

  useEffect(() => {
    if (laeuft) onMeldung(WARTEN)
    else if (ergebnis !== START) {
      onMeldung(ergebnis.ok ? (ergebnis.meldung ?? '') : '')
      if (ergebnis.ok) onSchliessen()
    }
  }, [laeuft, ergebnis, onMeldung, onSchliessen])

  return (
    <div className="grid gap-3">
      <p>
        Scanne den QR-Code mit deiner Authenticator-App und gib den angezeigten 6-stelligen Code
        ein.
      </p>
      {/* Fixed light background (light-mode field colour), so the code scans in dark mode too. */}
      <div className="w-fit bg-[#FBFBF8] p-2">
        {/* A ready data URI from Supabase: nothing for next/image to optimise. */}
        <img
          src={einrichtung.qrCode}
          alt="QR-Code für die Authenticator-App"
          width={176}
          height={176}
        />
      </div>
      <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
        <span id="zf-schluessel-label">Schlüssel zur manuellen Eingabe</span>
        <code aria-labelledby="zf-schluessel-label" className="font-mono break-all select-all">
          {einrichtung.secret}
        </code>
      </div>

      <form action={aktion} className="grid gap-3">
        <input type="hidden" name="factorId" value={einrichtung.factorId} />
        <CodeFeld id="zf-code-aktivieren" label="Code" fehler={ergebnis.feldFehler?.code} />
        {!ergebnis.ok && ergebnis.meldung && (
          <MessageBox kind="error">{ergebnis.meldung}</MessageBox>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {/* The unconfirmed factor is cleaned up by the next start. */}
          <Button type="button" variant="secondary" disabled={laeuft} onClick={onSchliessen}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={laeuft}>
            Aktivieren
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Two-factor sign-in inside the tab "Sicherheit" (AC-12, AC-14, AC-27).
 * `onMeldung` should be a stable function (e.g. a state setter): confirmations go to the
 * status line of the account window.
 */
export function ZweiFaktor({ anzahl, onMeldung }: { anzahl: number; onMeldung: Melden }) {
  // The secret is only held while the step is open; it is never logged or persisted.
  const [einrichtung, setEinrichtung] = useState<Einrichtung | null>(null)
  const schliessen = useCallback(() => setEinrichtung(null), [])

  // Kept here, not in a child: switching off revalidates `anzahl` in the same commit, and a
  // form that unmounts with it could no longer report its confirmation.
  const [aus, ausAktion, ausLaeuft] = useActionState(zweiFaktorAusschalten, START)
  useEffect(() => {
    if (ausLaeuft) onMeldung(WARTEN)
    else if (aus !== START) onMeldung(aus.ok ? (aus.meldung ?? '') : '')
  }, [ausLaeuft, aus, onMeldung])

  return (
    <div className="grid gap-3">
      <p>{statusText(anzahl)}</p>

      {einrichtung ? (
        <EinrichtungSchritt
          key={einrichtung.factorId}
          einrichtung={einrichtung}
          onMeldung={onMeldung}
          onSchliessen={schliessen}
        />
      ) : (
        <>
          {anzahl < 2 ? (
            <StartForm
              key={anzahl}
              anzahl={anzahl}
              onMeldung={onMeldung}
              onEinrichtung={setEinrichtung}
            />
          ) : (
            <p className="text-muted-foreground">
              Es sind bereits zwei Authenticator-Apps eingerichtet.
            </p>
          )}

          {anzahl > 0 && (
            <form action={ausAktion} className="grid gap-3">
              <CodeFeld
                id="zf-code-ausschalten"
                label="Aktueller Code"
                fehler={aus.feldFehler?.code}
              />
              <p className="text-muted-foreground">Danach erhältst du eine E-Mail zur Sicherheit.</p>
              {!aus.ok && aus.meldung && <MessageBox kind="error">{aus.meldung}</MessageBox>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="submit" variant="destructive" disabled={ausLaeuft}>
                  Zwei-Faktor-Anmeldung ausschalten
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
