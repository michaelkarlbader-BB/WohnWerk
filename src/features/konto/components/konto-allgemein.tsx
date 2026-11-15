'use client'

import { useActionState, useEffect, useState } from 'react'
import { GroupBox, MessageBox } from '@/components/retro/window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { anzeigenameSpeichern, emailAendern, type AktionsErgebnis } from '../konto.actions'

const START: AktionsErgebnis = { ok: false }

// Fixed time zone, so server and client render the same text.
const DATUM = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' })

function datumText(iso: string): string {
  const datum = new Date(iso)
  return Number.isNaN(datum.getTime()) ? '–' : DATUM.format(datum)
}

type KontoAllgemeinProps = {
  email: string
  anzeigename: string | null
  /** ISO timestamp. */
  angelegtAm: string
  zweiFaktorAktiv: boolean
  /** Status line of the account window: "Bitte warten…", a confirmation or ''. */
  onMeldung: (text: string) => void
}

/** Tab "Allgemein" of the account window (AC-15, AC-17, AC-18, EC-8). */
export function KontoAllgemein({
  email,
  anzeigename,
  angelegtAm,
  zweiFaktorAktiv,
  onMeldung,
}: KontoAllgemeinProps) {
  const [nameErgebnis, nameAktion, nameLaeuft] = useActionState(anzeigenameSpeichern, START)
  const [emailErgebnis, emailAktion, emailLaeuft] = useActionState(emailAendern, START)
  const [name, setName] = useState(anzeigename ?? '')
  const [neueEmail, setNeueEmail] = useState('')

  // The newest result of either form decides the confirmation (state adjusted during render).
  const [bestaetigung, setBestaetigung] = useState('')
  const [nameGesehen, setNameGesehen] = useState(nameErgebnis)
  if (nameGesehen !== nameErgebnis) {
    setNameGesehen(nameErgebnis)
    setBestaetigung(nameErgebnis.ok ? (nameErgebnis.meldung ?? '') : '')
  }
  const [emailGesehen, setEmailGesehen] = useState(emailErgebnis)
  if (emailGesehen !== emailErgebnis) {
    setEmailGesehen(emailErgebnis)
    setBestaetigung(emailErgebnis.ok ? (emailErgebnis.meldung ?? '') : '')
    if (emailErgebnis.ok) setNeueEmail('')
  }

  const statusText = nameLaeuft || emailLaeuft ? 'Bitte warten…' : bestaetigung
  useEffect(() => {
    onMeldung(statusText)
  }, [statusText, onMeldung])

  const nameFehler = nameErgebnis.feldFehler?.anzeigename
  const emailFehler = emailErgebnis.feldFehler?.email

  return (
    <div className="grid gap-3">
      <GroupBox title="Kontodaten">
        <dl className="grid gap-1 md:grid-cols-[9rem_1fr]">
          <dt className="text-muted-foreground">E-Mail-Adresse</dt>
          <dd className="break-all">{email}</dd>
          <dt className="text-muted-foreground">Anzeigename</dt>
          <dd className="break-words">{anzeigename || '– nicht gesetzt –'}</dd>
          <dt className="text-muted-foreground">Konto angelegt am</dt>
          <dd>{datumText(angelegtAm)}</dd>
          <dt className="text-muted-foreground">Zwei-Faktor-Anmeldung</dt>
          <dd>{zweiFaktorAktiv ? 'eingeschaltet' : 'ausgeschaltet'}</dd>
        </dl>
      </GroupBox>

      <GroupBox title="Anzeigename ändern">
        <form action={nameAktion} className="grid gap-3">
          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="allgemein-anzeigename">Anzeigename</Label>
            <Input
              id="allgemein-anzeigename"
              name="anzeigename"
              type="text"
              autoComplete="nickname"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameFehler ? true : undefined}
              aria-describedby={
                nameFehler
                  ? 'allgemein-anzeigename-hinweis allgemein-anzeigename-fehler'
                  : 'allgemein-anzeigename-hinweis'
              }
            />
            <p id="allgemein-anzeigename-hinweis" className="text-muted-foreground md:col-start-2">
              Leer lassen, um die E-Mail-Adresse anzuzeigen.
            </p>
            {nameFehler && (
              <p id="allgemein-anzeigename-fehler" className="text-destructive md:col-start-2">
                {nameFehler}
              </p>
            )}
          </div>

          {!nameErgebnis.ok && nameErgebnis.meldung && (
            <MessageBox kind="error">{nameErgebnis.meldung}</MessageBox>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={nameLaeuft}>
              Speichern
            </Button>
          </div>
        </form>
      </GroupBox>

      <GroupBox title="E-Mail-Adresse ändern">
        <form action={emailAktion} className="grid gap-3">
          <div className="grid gap-1 md:grid-cols-[9rem_1fr] md:items-center">
            <Label htmlFor="allgemein-email">Neue E-Mail-Adresse</Label>
            <Input
              id="allgemein-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              value={neueEmail}
              onChange={(e) => setNeueEmail(e.target.value)}
              aria-invalid={emailFehler ? true : undefined}
              aria-describedby={
                emailFehler ? 'allgemein-email-hinweis allgemein-email-fehler' : 'allgemein-email-hinweis'
              }
            />
            <p id="allgemein-email-hinweis" className="text-muted-foreground md:col-start-2">
              Die neue Adresse gilt erst nach Bestätigung des Links, den wir dorthin senden.
            </p>
            {emailFehler && (
              <p id="allgemein-email-fehler" className="text-destructive md:col-start-2">
                {emailFehler}
              </p>
            )}
          </div>

          {!emailErgebnis.ok && emailErgebnis.meldung && (
            <MessageBox kind="error">{emailErgebnis.meldung}</MessageBox>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={emailLaeuft}>
              Ändern
            </Button>
          </div>
        </form>
      </GroupBox>
    </div>
  )
}
