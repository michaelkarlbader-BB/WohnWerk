import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { GroupBox, Window } from '@/components/retro/window'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Datenschutz' }

// Draft text, pending legal review by the operator (docs/pflichtschritte.md, Stufe 2).
// Source of truth for the facts: docs/privacy.md – change both together.
const STAND = '15. November 2026'
const VERANTWORTLICHER = 'Michael Bader'
const ANSCHRIFT = '[Anschrift eintragen]'
const KONTAKT_EMAIL = '[E-Mail-Adresse eintragen]'

const geraetespeicher = [
  {
    name: 'Sitzungs-Cookies (sb-…)',
    art: 'Cookie',
    zweck: 'Hält Sie nach der Anmeldung angemeldet',
    dauer: 'bis zum Schließen des Browsers',
  },
  {
    name: 'Aktivitäts-Cookie',
    art: 'Cookie',
    zweck: 'Meldet Sie nach 30 Minuten ohne Aktivität ab',
    dauer: 'bis zum Schließen des Browsers',
  },
  {
    name: 'Cloudflare Turnstile',
    art: 'Skript, Browsersignale',
    zweck: 'Schutz vor automatisierten Anmelde- und Registrierungsversuchen',
    dauer: 'laut Cloudflare',
  },
  {
    name: 'wohnwerk-darstellung',
    art: 'Lokaler Speicher',
    zweck: 'Merkt sich die von Ihnen gewählte Darstellung (Hell/Dunkel/Wie System)',
    dauer: 'bis Sie die Browserdaten löschen',
  },
  {
    name: 'wohnwerk-fenster',
    art: 'Cookie',
    zweck: 'Merkt sich, dass Sie das Fenster maximiert haben',
    dauer: '1 Jahr; „Wiederherstellen“ löscht es',
  },
]

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <GroupBox title={titel}>
      <div className="grid gap-2">{children}</div>
    </GroupBox>
  )
}

export default function DatenschutzPage() {
  return (
    <main className="min-h-dvh md:p-4">
      <Window title="WohnWerk – Datenschutzerklärung" as="div" className="md:mx-auto md:max-w-3xl">
        <div className="grid gap-3">
          <p>
            Diese Erklärung beschreibt, welche personenbezogenen Daten WohnWerk verarbeitet, wozu,
            auf welcher Rechtsgrundlage und wie lange. WohnWerk verwendet <strong>keine</strong>{' '}
            Analyse-, Werbe- oder Tracking-Dienste und gibt keine Daten zu Werbezwecken weiter.
          </p>

          <Abschnitt titel="1. Verantwortlicher">
            <p>
              {VERANTWORTLICHER}
              <br />
              {ANSCHRIFT}
              <br />
              E-Mail: {KONTAKT_EMAIL}
            </p>
            <p>Ein Datenschutzbeauftragter ist nicht benannt, weil keine Pflicht dazu besteht.</p>
          </Abschnitt>

          <Abschnitt titel="2. Aufruf der Website und Hosting">
            <p>
              WohnWerk wird bei <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA
              91723, USA, betrieben. Die Anwendung läuft auf Servern in Frankfurt am Main; statische
              Inhalte liefert Vercel über ein weltweites Servernetz aus. Bei jedem Aufruf verarbeitet Vercel technisch notwendige Daten: IP-Adresse,
              Zeitpunkt, aufgerufene Adresse, Browser- und Geräteangaben sowie Fehlermeldungen.
            </p>
            <p>
              Zweck ist die Auslieferung der Website, ihre Sicherheit und die Fehlerbehebung.
              Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und funktionierenden
              Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden von Vercel nach dessen
              Fristen automatisch gelöscht. Dabei können Daten in die USA übermittelt werden (siehe
              Abschnitt 8).
            </p>
          </Abschnitt>

          <Abschnitt titel="3. Benutzerkonto">
            <p>
              Für die Nutzung brauchen Sie ein Konto. Wir speichern Ihre E-Mail-Adresse, Ihr
              Passwort (nur verschlüsselt als Hash), einen freiwilligen Anzeigenamen, ggf. die
              Einrichtung der Zwei-Faktor-Anmeldung, Ihre Sitzungen sowie Datum und Uhrzeit von
              Registrierung und Anmeldung. Die Daten, die Sie in WohnWerk erfassen (z. B. Wohnungen,
              Mieter, Darlehen), sind nur für Sie sichtbar.
            </p>
            <p>
              Zweck ist die Bereitstellung von WohnWerk; Rechtsgrundlage ist der Nutzungsvertrag
              (Art. 6 Abs. 1 lit. b DSGVO). Ohne E-Mail-Adresse und Passwort ist kein Konto möglich.
            </p>
            <p>
              Datenbank und Anmeldung betreibt <strong>Supabase</strong> (Supabase Pte. Ltd.,
              Singapur) als unser Auftragsverarbeiter; die Daten liegen in einem Rechenzentrum in
              Frankfurt am Main.
            </p>
            <p>
              <strong>Speicherdauer:</strong> bis Sie Ihr Konto löschen – das geht jederzeit in den
              Kontoeinstellungen und wirkt sofort und endgültig, einschließlich aller von Ihnen
              erfassten Daten. Nicht bestätigte Registrierungen werden nach 7 Tagen automatisch
              gelöscht.
            </p>
          </Abschnitt>

          <Abschnitt titel="4. Registrierung nur auf Einladung">
            <p>
              Registrieren können sich nur E-Mail-Adressen, die wir vorher freigegeben haben. Dazu
              speichern wir die freigegebene Adresse. Rechtsgrundlage ist unser berechtigtes
              Interesse, den Zugang zu beschränken (Art. 6 Abs. 1 lit. f DSGVO). Löschen Sie Ihr
              Konto, wird auch die Freigabe Ihrer Adresse entfernt.
            </p>
          </Abschnitt>

          <Abschnitt titel="5. Schutz vor Missbrauch der Anmeldung">
            <p>
              Fehlgeschlagene Anmeldeversuche zählen wir je E-Mail-Adresse (ohne IP-Adresse), um
              nach fünf Fehlversuchen für 15 Minuten zu sperren. Diese Einträge werden nach 24
              Stunden gelöscht. Zusätzlich protokolliert Supabase Anmeldevorgänge einschließlich
              IP-Adresse und begrenzt die Zahl der Anfragen je IP-Adresse.
            </p>
            <p>
              Auf den Seiten Anmelden, Registrieren und Passwort vergessen nutzen wir{' '}
              <strong>Cloudflare Turnstile</strong> (Cloudflare, Inc., 101 Townsend St., San
              Francisco, CA 94107, USA), um automatisierte Angriffe abzuwehren. Turnstile verarbeitet
              dafür Ihre IP-Adresse sowie Browser- und Gerätesignale. Cloudflare nutzt diese Daten
              außerdem in eigener Verantwortung, um Turnstile zu verbessern.
            </p>
            <p>
              Rechtsgrundlage ist unser berechtigtes Interesse an der Sicherheit der Konten (Art. 6
              Abs. 1 lit. f DSGVO, Art. 32 DSGVO); der Zugriff auf Ihr Endgerät ist dafür unbedingt
              erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
            </p>
          </Abschnitt>

          <Abschnitt titel="6. E-Mails zu Ihrem Konto">
            <p>
              Wir senden Ihnen E-Mails, die zum Konto gehören: Bestätigung der Registrierung,
              Passwort zurücksetzen, Änderung der E-Mail-Adresse und Sicherheitshinweise (z. B. nach
              einer Passwortänderung). Werbe-E-Mails versenden wir nicht.
            </p>
            <p>
              Den Versand übernimmt <strong>Brevo</strong> (Sendinblue SAS, 106 boulevard
              Haussmann, 75008 Paris, Frankreich) als unser Auftragsverarbeiter. Verarbeitet werden
              Ihre E-Mail-Adresse, der Inhalt der E-Mail und Versandprotokolle, die Brevo nach seinen
              Fristen löscht. Rechtsgrundlage ist der Nutzungsvertrag (Art. 6 Abs. 1 lit. b DSGVO),
              für Sicherheitshinweise zusätzlich Art. 32 DSGVO.
            </p>
          </Abschnitt>

          <Abschnitt titel="7. Cookies und Speicher im Browser">
            <p>
              WohnWerk speichert nur, was für den Betrieb unbedingt nötig ist oder was Sie selbst
              eingestellt haben (§ 25 Abs. 2 Nr. 2 TDDDG). Ein Cookie-Banner gibt es deshalb nicht.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Art</TableHead>
                  <TableHead>Zweck</TableHead>
                  <TableHead>Dauer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geraetespeicher.map((eintrag) => (
                  <TableRow key={eintrag.name}>
                    <TableCell className="whitespace-normal">{eintrag.name}</TableCell>
                    <TableCell className="whitespace-normal">{eintrag.art}</TableCell>
                    <TableCell className="whitespace-normal">{eintrag.zweck}</TableCell>
                    <TableCell className="whitespace-normal">{eintrag.dauer}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p>Sie können diese Einträge jederzeit über die Einstellungen Ihres Browsers löschen.</p>
          </Abschnitt>

          <Abschnitt titel="8. Empfänger und Übermittlung in Drittländer">
            <p>
              Ihre Daten erhalten nur die oben genannten Dienstleister Supabase, Vercel, Cloudflare
              und Brevo, und nur soweit für den jeweiligen Zweck nötig. Vercel und Cloudflare haben
              ihren Sitz in den USA, Supabase in Singapur. Übermittlungen in die USA stützen sich auf
              den Angemessenheitsbeschluss der EU-Kommission zum EU-US Data Privacy Framework, soweit
              der Anbieter danach zertifiziert ist, im Übrigen auf EU-Standardvertragsklauseln
              (Art. 46 DSGVO). Für Supabase gelten EU-Standardvertragsklauseln.
            </p>
          </Abschnitt>

          <Abschnitt titel="9. Ihre Rechte">
            <p>Sie haben gegenüber uns das Recht auf</p>
            <ul className="list-disc pl-6">
              <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO),</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
              <li>Löschung (Art. 17 DSGVO) – direkt über „Konto löschen“,</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
              <li>
                <strong>Widerspruch</strong> gegen Verarbeitungen, die auf unserem berechtigten
                Interesse beruhen, aus Gründen, die sich aus Ihrer besonderen Situation ergeben
                (Art. 21 DSGVO).
              </li>
            </ul>
            <p>
              Anzeigename, E-Mail-Adresse und Passwort können Sie selbst in den Kontoeinstellungen
              ändern. Für alle anderen Anliegen genügt eine E-Mail an {KONTAKT_EMAIL}; wir antworten
              innerhalb eines Monats.
            </p>
            <p>
              Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77
              DSGVO), insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts.
            </p>
          </Abschnitt>

          <Abschnitt titel="10. Keine automatisierten Entscheidungen">
            <p>
              Wir treffen keine automatisierten Entscheidungen im Einzelfall und erstellen keine
              Profile (Art. 22 DSGVO).
            </p>
          </Abschnitt>

          <p className="text-sm">Stand: {STAND}</p>

          <p>
            <Link href="/impressum" className="underline">
              Impressum
            </Link>
            {' · '}
            <Link href="/anmelden" className="underline">
              Zur Anmeldung
            </Link>
          </p>
        </div>
      </Window>
    </main>
  )
}
