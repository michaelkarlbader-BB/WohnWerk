# Produktanforderungen (PRD) – WohnWerk

## Vision
WohnWerk ist eine schlanke Web-Anwendung (im Browser und auf dem Handy nutzbar), mit der private Vermieter ihre vermieteten Eigentumswohnungen verwalten: Wohnungen, Mieter, Mietverträge und Darlehen an einem Ort, mit zuverlässig berechneten steuerrelevanten Werten (AfA-Plan, Zinsen, Restschuld). Bestehende Lösungen sind entweder zu umfangreich und teuer oder umständlich und kommen nicht auf den Punkt. WohnWerk entsteht zuerst als Werkzeug für den eigenen Bestand und soll später anderen Vermietern angeboten werden.

## Zielgruppe
**Private Kleinvermieter** mit etwa 1–20 vermieteten Eigentumswohnungen in WEGs, die sie als Kapitalanlage halten und nebenher verwalten.

- **Bedürfnisse:** schneller Überblick über Mieten, Verträge und Kredite; Steuerunterlagen (Anlage V) ohne stundenlanges Zusammensuchen; korrekte Berechnungen auch bei degressiver AfA, Sonder-AfA und Darlehen über mehrere Wohnungen.
- **Schmerzpunkte heute:** Profi-Software ist zu groß und zu teuer, einfache Tools kommen nicht auf den Punkt, Excel ist fehleranfällig.
- **Nicht die Zielgruppe:** professionelle Hausverwaltungen, WEG-Verwalter, Besitzer ganzer Mehrfamilienhäuser.

## Kernfunktionen (Roadmap)

_Die Feature-Übersicht (Name, Beschreibung, Status, Reihenfolge) steht ausschließlich in **`features/INDEX.md`**._

Das MVP verwaltet die Basis-Entitäten vollständig: **Wohnungen** mit Objekt-, WEG-, Kauf- und Steuerdaten, Eigentumsverhältnis und Hausgeld-Historie, inklusive **berechnetem Abschreibungsplan** (linear, degressiv nach § 7 Abs. 5a EStG, Sonder-AfA nach § 7b EStG); **Mieter und Mietverträge** mit Mietbestandteilen, Staffel-/Indexmiete, Kaution und dokumentierten **Mietanpassungen**; **Darlehen** mit **berechnetem Tilgungsplan**, aktueller Restschuld (Ankerpunkte laut Bank) und Verteilung auf mehrere Wohnungen nach Fläche, Kaufpreis oder festen Prozentwerten. Jeder Nutzer hat ein eigenes Konto und sieht nur seine Daten. Damit die Daten im kostenlosen Betrieb sicher bleiben, gehören **Datenexport und Import** (JSON zur Wiederherstellung, CSV zum Lesen, Import nur in ein leeres Konto, „Alle meine Daten löschen“) und ein **Wachhalter** gegen das Pausieren der Datenbank zum MVP.

Bewusst **später**: Kontoauszug-Abruf mit (möglichst automatischer) Buchungszuordnung, Cashflow- und Kosten-Dashboards (gesamt und je Wohnung), Betriebskostenabrechnung, Import aus eigenen Excel-Listen, Abo/Bezahlung für externe Nutzer.

## Erfolgskriterien
1. Alle eigenen Wohnungen, Mieter, Verträge und Darlehen sind erfasst; WohnWerk ersetzt die bisherigen Listen und Excel-Dateien.
2. Die berechnete Restschuld jedes Darlehens weicht zum Stichtag **um weniger als 1 €** vom Bankauszug ab.
3. Der berechnete Abschreibungsplan stimmt mit der letzten Steuererklärung bzw. den Werten des Steuerberaters überein.
4. Die Zahlen für die Anlage V (Mieteinnahmen, Schuldzinsen, AfA je Wohnung und Jahr) liegen in wenigen Minuten vor.
5. Später: erste externe Vermieter nutzen WohnWerk aktiv (Zielzahl wird beim Start des Angebots festgelegt).

## Rahmenbedingungen
- **Team:** eine Person (Product Owner und Entwickler) mit Coding-Agent; Nebenprojekt.
- **Zeitrahmen:** kein harter Termin; das MVP soll für die Anlage V 2026 (Frühjahr 2027) nutzbar sein.
- **Budget:** möglichst 0 € (kostenlose Tarife). Kosten entstehen erst beim Angebot an Dritte (z. B. Vercel Pro, da Vercel Hobby nicht-kommerziell ist; Supabase Pro).
- **Plattform:** Web-Anwendung (Next.js), auf dem Handy voll bedienbar; keine native App.
- **Backend:** Supabase (Datenbank, Login), Benutzerkonten ab dem ersten Feature.
- Environment strategy: two-projects
- Data region: eu-central-1 (Frankfurt) für Produktion; Dev-Projekt in eu-west-2 (London), nur Testdaten (entschieden 2026-11-14, UK-Angemessenheitsbeschluss)
- Hosting: Vercel (vorläufig, wird bei `/deploy` bestätigt)
- Domain: wohnwerk-mb.de (vorhanden, erfasst 2026-11-14; Produktiv-Adresse und Absender-Domain für Mails)
- Testumgebung: test.wohnwerk-mb.de (Dev/QA; nutzt das Supabase-Dev-Projekt mit Testdaten, nie Live-Daten; wird bei `/deploy` als Vercel-Umgebung eingerichtet, ohne Suchmaschinen-Indexierung)
- Data protection law: GDPR (EU/DE)
- Data protection stance: standard
- Design system: siehe `docs/design-system.md` (Retro-Stil frühe 2000er, „Klassisch grau“)
- **Fachlich:** Die Zinsberechnung folgt der Methode der Bank und ist je Darlehen einstellbar (z. B. 30/360), damit die Abweichung unter 1 € bleibt.

## Betriebsbedingungen und Annahmen

| | Annahme / Bedingung | Status (Quelle/Owner) | Neu prüfen, wenn … |
|---|---|---|---|
| Nutzer | zunächst 1 Nutzer, später einige Dutzend Vermieter | Annahme (Owner: Produktinhaber) | das Angebot an Dritte startet |
| Nutzung | ca. einmal im Monat, Pausen bis zu 3 Monaten möglich | bestätigt (Produktinhaber) | — |
| Datenmenge | ≤ 20 Wohnungen je Nutzer, einige hundert Datensätze, keine Dateien | Annahme | ein Nutzer deutlich mehr verwaltet |
| Verbindung | nur online, kein Offline-Betrieb | bestätigt | — |
| Datenverlust | kaum tolerierbar – Steuer- und Finanzdaten müssen 10 Jahre nachvollziehbar sein | Annahme (Owner: Produktinhaber) | — |
| Ausfall | Stunden verschmerzbar, keine zeitkritischen Abläufe | Annahme | externe Nutzer zahlen |
| Anbieter-Grenzen | Supabase Free pausiert inaktive Projekte und hat keine Backups. **Entscheidung:** Free-Tarif mit Wachhalter und regelmäßigem Export; Wechsel auf Supabase Pro, sobald externe Nutzer dazukommen | entschieden (Produktinhaber, 2026-11-02) | Start des Angebots an Dritte oder geänderte Free-Tarif-Regeln |

## Nicht-Ziele
- Betriebskostenabrechnung für Mieter (später)
- Kontoauszug-Abruf und Buchungszuordnung (später)
- Cashflow- und Kosten-Dashboards (später)
- Import aus fremden Formaten (Excel, andere Tools) und Zusammenführen mit bestehenden Daten (später)
- Abo und Bezahlung für externe Nutzer (später)
- Mieterportal / Zugang für Mieter
- ELSTER-Übermittlung oder Ausfüllen der Anlage V – WohnWerk liefert nur die Zahlen
- Ganze Häuser, WEG-Selbstverwaltung, gewerbliche Hausverwaltung
- Zahlungsabwicklung (Lastschrift, Mahnwesen)
- Native App im App Store
- Dokumente bzw. Dateianhänge im MVP
