# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Mapped** - already built before the kit arrived; proposed by `/map`, confirmed at `/init`, no spec folder yet — `/reverse-spec` writes it
- **Spec'd** - `/reverse-spec` done: runs in production, criteria confirmed, not yet verified — `/qa` closes that gap
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **Tasked** - `/tasks` done, tasks.md approved, ready to build
- **In Progress** - `/build` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production
- **Merged** - spec folded into another feature by `/refine`; the Spec cell names it, the folder lies in `features/archive/`

## Features

> The **Spec** column links to the feature **folder** (`features/PROJ-X-name/`), not a single file. Each folder contains `spec.md`, `design.md`, `tasks.md`, and `qa-report.md`.
>
> **A row is never a log.** This file is loaded into every session. What was built, fixed, measured or decided goes into the feature's folder (`design.md`, `qa-report.md`) and the commit — here only the status changes.
>
> **Feature** is the name only — two to four words, the way you would say it ("User accounts & login", "Kanban board"). **Description** is one sentence of what it does. Priority and dependencies are not columns: they are the **build order** line under the table, and it is the only place they live — there is no second roadmap table anywhere else.

| ID | Feature | Description | Status | Spec | Created |
|----|---------|-------------|--------|------|---------|
| PROJ-1 | Benutzerkonto & Login | Registrieren, Anmelden, Abmelden und Konto löschen – jeder Nutzer sieht nur seine eigenen Daten. | Approved | [PROJ-1-benutzerkonto-login](PROJ-1-benutzerkonto-login/) | 2026-11-02 |
| PROJ-2 | App-Rahmen & Navigation | Retro-Programmfenster mit Menü-, Werkzeug- und Statusleiste, Navigation zwischen den Bereichen und Handy-Ansicht. | Approved | [PROJ-2-app-rahmen-navigation](PROJ-2-app-rahmen-navigation/) | 2026-11-02 |
| PROJ-3 | Wohnungen | Stammdaten je Wohnung erfassen: Objekt, WEG, Kauf, Eigentumsverhältnis, Steuerdaten und Hausgeld mit Historie. | Roadmap | — | 2026-11-02 |
| PROJ-4 | Abschreibungsplan | Berechnet je Wohnung den AfA-Plan (linear, degressiv, Sonder-AfA § 7b) mit Jahresbeträgen und Restwert. | Roadmap | — | 2026-11-02 |
| PROJ-5 | Mieter | Mieter mit Kontaktdaten anlegen und pflegen. | Roadmap | — | 2026-11-02 |
| PROJ-6 | Mietverträge | Verträge zwischen Wohnung und Mietern mit Laufzeit, Mietbestandteilen, Kaution und Staffel-/Indexmiete. | Roadmap | — | 2026-11-02 |
| PROJ-7 | Mietanpassungen | Mietänderungen mit Grund und Gültig-ab-Datum dokumentieren, mit vollständiger Historie. | Roadmap | — | 2026-11-02 |
| PROJ-8 | Darlehen & Tilgungsplan | Darlehen mit Ereignissen und Zinsmethode erfassen, Tilgungsplan und aktuelle Restschuld berechnen, mit Ankerpunkten laut Bank. | Roadmap | — | 2026-11-02 |
| PROJ-9 | Darlehensverteilung | Darlehen einer oder mehreren Wohnungen zuordnen und Zins, Tilgung und Restschuld nach Fläche, Kaufpreis oder festen Prozenten aufteilen. | Roadmap | — | 2026-11-02 |
| PROJ-10 | Datenexport & Import | Alle Daten als JSON und CSV exportieren, eine JSON-Sicherung in ein leeres Konto einspielen und „Alle meine Daten löschen“. | Roadmap | — | 2026-11-02 |
| PROJ-11 | Wachhalter | Automatischer Job, der die Datenbank aktiv hält, damit sie im kostenlosen Tarif nicht pausiert. | Roadmap | — | 2026-11-02 |
| PROJ-12 | Kontoauszug-Abruf | Bankumsätze automatisch abrufen. | Roadmap | — | 2026-11-02 |
| PROJ-13 | Buchungszuordnung | Einnahmen und Ausgaben möglichst automatisch den Wohnungen zuordnen. | Roadmap | — | 2026-11-02 |
| PROJ-14 | Cashflow-Dashboards | Gesamt- und Wohnungsdashboards zu Cashflow und Kostenentwicklung. | Roadmap | — | 2026-11-02 |
| PROJ-15 | Betriebskostenabrechnung | Jährliche Abrechnung für Mieter auf Basis der WEG-Abrechnung. | Roadmap | — | 2026-11-02 |
| PROJ-16 | Excel-Import | Daten aus eigenen Excel-Listen übernehmen. | Roadmap | — | 2026-11-02 |
| PROJ-17 | Abo & Bezahlung | Bezahlmodell für externe Nutzer. | Roadmap | — | 2026-11-02 |

**Build order:** P0 (MVP): PROJ-1 → PROJ-2 (needs PROJ-1) → PROJ-3 (needs PROJ-2) → PROJ-4 (needs PROJ-3) → PROJ-5 (needs PROJ-2) → PROJ-6 (needs PROJ-3, PROJ-5) → PROJ-7 (needs PROJ-6) → PROJ-8 (needs PROJ-2) → PROJ-9 (needs PROJ-3, PROJ-8) → PROJ-10 (needs PROJ-3–PROJ-9) → PROJ-11 (needs PROJ-1) · P1: PROJ-12 (needs PROJ-1) → PROJ-13 (needs PROJ-12, PROJ-3) → PROJ-14 (needs PROJ-13, PROJ-9) · P2: PROJ-15 (needs PROJ-6), PROJ-16 (needs PROJ-3–PROJ-9), PROJ-17 (needs PROJ-1)

<!-- Add features above this line -->

## Deployments

> One line per release, written by `/deploy` — **the single deployment record**: tag · date · production URL · the features it shipped. `/security-check` reads the production URL here, `/audit` expects every Deployed feature on one line. A feature that was live before the kit arrived (reconstructed from code) gets its line from `/qa`: `live before the kit — verified by /qa on <date> · PROJ-X`.

- _v1.0.0 · 2026-01-31 · https://app.example.com · PROJ-1, PROJ-2_

## Next Available ID: PROJ-18
