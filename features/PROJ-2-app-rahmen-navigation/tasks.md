# PROJ-2 Aufgaben – App-Rahmen & Navigation

> Erzeugt von `/tasks` aus `spec.md` + `design.md`. Der geordnete, nachvollziehbare Bauplan – die Brücke zwischen Vertrag (WAS) und Umsetzung (WIE).
> `[P]` = parallelisierbar: Die Dateien der Aufgabe sind disjunkt zu allen anderen `[P]`-Aufgaben derselben Ebene, `/build` kann sie an einen eigenen Subagenten geben.
> Ebenen laufen **nacheinander** (jede ist eine Schranke). Aufgaben **innerhalb** einer Ebene laufen parallel, wo `[P]` steht. Jede Aufgabe verweist auf die AC-IDs aus `spec.md` – die Kette AC → Aufgabe → Test.
> `[user]` = eine Einstellung, die nur du im Dashboard eines Anbieters machen kannst: `where:` statt `files:`, nie `[P]`, von dir abgehakt – `/build` übergibt sie, `/deploy` liefert nicht aus, solange sie offen ist.
> `[user go-live]` = dasselbe, braucht aber die Produktiv-URL bzw. das Prod-Projekt: niemand kann sie vor `/deploy` machen, sie blockiert weder `/qa` noch Approved – `/deploy` erledigt sie in Schritt 2 und hakt sie in Schritt 4 ab, sobald sie nachweislich wirkt.
> Owner: `/tasks` erstellt diese Datei; `/build` hakt die Kästchen ab – außer `[user]`-Aufgaben, die hakst du ab.
> Kein Statusfeld hier – der Status des Features steht AUSSCHLIESSLICH in `features/INDEX.md`.

Pfade ohne Präfix liegen unter `src/components/rahmen/`; Routen in `(angemeldet)` liegen unter `src/app/`.

**Voraussetzung:** PROJ-1 ist gebaut (`window.tsx`, Layout `(angemeldet)`, Kontoseite, Sitzungswächter, Abmelden-Action, Anfrage-Grenze). Die Browser-Tests in Ebene 6 brauchen ein angemeldetes Testkonto im Dev-Projekt.

## Ebene 1 — Fundament (Regeln, Darstellung, Fenster)

- [x] T1 [P]  Verzeichnis der Bereiche/Menüziele (Kennung, Beschriftung, Pfad, Feature, gebaut – Stand laut `design.md`) + reine Funktionen: aktiver Bereich aus Pfad (auch `/<bereich>/<id>`), Titelleistentext, Tab-Titel zu Bereichskennung (nur Beschriftung, nie Detailname – AC-36), „ist schon die aktuelle Ansicht“, Menüeinträge verfügbar/ausgegraut + Test  · files: src/components/rahmen/navigation.rules.ts, src/components/rahmen/navigation.rules.test.ts  · → AC-5, AC-6, AC-7, AC-9, AC-10, AC-11, AC-36, EC-1, EC-2
- [x] T2 [P]  Rahmen-Regeln: Statustext-Vorrang (Keine Verbindung > Bitte warten… > Bestätigung > Bereit), Bestätigungsdauer 10 s, Cookie „Maximiert“ (nur exakt `1`) + Test  · files: src/components/rahmen/rahmen.rules.ts, src/components/rahmen/rahmen.rules.test.ts  · → AC-3, AC-21, AC-22, AC-23, AC-33, EC-7, EC-10
- [x] T3 [P]  Darstellung app-weit: Darstellungs-Anbieter (`next-themes`, Schlüssel `wohnwerk-darstellung`, Standard „system“), Titelvorlage „WohnWerk – %s“; `globals.css`: Dunkelwerte an Klasse `dark`, globaler Fokus-Stil (gepunkteter Innenrahmen + 2-px-Ring), Fensterhöhe `dvh`, reduzierte Bewegung  · files: src/components/rahmen/darstellung-anbieter.tsx, src/app/layout.tsx, src/app/globals.css  · → AC-2, AC-18, AC-19, AC-20, AC-30, AC-31, EC-6, EC-8
- [x] T4 [P]  `window.tsx` erweitern: Knopf-Plätze links/rechts in der Titelleiste, Variante „eingebettet“ ohne eigene Titelleiste + Test  · files: src/components/retro/window.tsx, src/components/retro/window.test.tsx  · → AC-1, AC-3, AC-14, AC-24

## Ebene 2 — Rahmen-Schnittstelle

- [ ] T5  Rahmen-Kontext: Bereich einrichten (Aktionen neu/bearbeiten/löschen/aktualisieren mit Funktion + verfügbar, Anzahl, Detailtitel, ungespeichert), Bestätigung, Laden (gezählt), Online/Offline (Offline beendet Ladeanzeigen), angesteuertes Ziel (sofortige Rückmeldung), geschützte Navigation + geschützter Link, „ohne Rückfrage verlassen“; laufende Aktion gesperrt; Zurücksetzen beim Verlassen der Seite + Test  · files: src/components/rahmen/rahmen-kontext.tsx, src/components/rahmen/rahmen-kontext.test.tsx  · → AC-13, AC-17, AC-21, AC-22, AC-23, AC-27, AC-33, AC-35, EC-3, EC-9, EC-10

## Ebene 3 — Leisten und Bausteine

- [ ] T6 [P]  Wächter „ungespeichert“: Dialog „Nicht gespeicherte Änderungen verwerfen?“ (Verwerfen/Abbrechen), Browser-Rückfrage vor dem Verlassen nur bei gemeldetem Zustand, zusätzlicher Verlaufseintrag für Zurück, Umgehung bei automatischer Abmeldung + Test  · files: src/components/rahmen/ungespeichert-waechter.tsx, src/components/rahmen/ungespeichert-waechter.test.tsx  · → AC-27, AC-28, AC-29, EC-3, EC-8
- [ ] T7 [P]  Menüleiste: fünf einzelne shadcn-Aufklappmenüs (Datei, Bearbeiten, Ansicht, Extras, ?) laut Tabelle in `design.md`, Darstellung als markierte Optionsgruppe, Schließen bei Auswahl/außerhalb/Esc + Test  · files: src/components/rahmen/menueleiste.tsx, src/components/rahmen/menueleiste.test.tsx  · → AC-7, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-19, AC-30
- [ ] T8 [P]  Werkzeugleiste: genau die gemeldeten Aktionen, ausgegraut wenn nicht verfügbar, gesperrt während Ausführung, am Handy ≥ 44 px + Test  · files: src/components/rahmen/werkzeugleiste.tsx, src/components/rahmen/werkzeugleiste.test.tsx  · → AC-13, AC-17, AC-24, EC-9
- [ ] T9 [P]  Bereichsliste: vier echte Links mit Auswahlmarkierung, ungebaute ausgegraut, Klick auf aktuelle Ansicht ignoriert + Test  · files: src/components/rahmen/bereichsliste.tsx, src/components/rahmen/bereichsliste.test.tsx  · → AC-6, AC-7, AC-9, EC-1, EC-9
- [ ] T10 [P]  Schublade (Handy, von links): Bereiche + alle Menüeinträge gruppiert; schließt bei Auswahl, Antippen daneben, Zurück, Esc und beim Wechsel auf Desktop-Breite + Test  · files: src/components/rahmen/schublade.tsx, src/components/rahmen/schublade.test.tsx  · → AC-24, AC-25, AC-30, EC-4
- [ ] T11 [P]  Statusleiste: Statustext + Segment-Fortschritt, Anzahl, „Angemeldet: …“, Kürzen mit „…“, am Handy einzeilig nur Statustext + Test  · files: src/components/rahmen/statusleiste.tsx, src/components/rahmen/statusleiste.test.tsx  · → AC-21, AC-22, AC-23, AC-24, AC-33, EC-5, EC-10
- [ ] T12 [P]  Dialog „Über WohnWerk“ (Name, Version als Eingabe, Links Datenschutz/Impressum)  · files: src/components/rahmen/ueber-dialog.tsx  · → AC-16
- [ ] T13 [P]  Inhaltsmeldungen: „Diese Seite gibt es nicht.“ [Zu den Wohnungen], „Hier ist etwas schiefgelaufen.“ [Erneut versuchen] [Zu den Wohnungen] ohne technische Details, Lade-Platzhalter (meldet „Laden“, solange sichtbar) + Test  · files: src/components/rahmen/inhalt-meldungen.tsx, src/components/rahmen/inhalt-meldungen.test.tsx  · → AC-10, AC-23, AC-32, EC-2

## Ebene 4 — Fenster, Inhaltsrouten, PROJ-1-Anpassungen

- [ ] T14 [P]  Programmfenster: Desktop mit Arbeitsfläche, maximiert bzw. Handy bildschirmfüllend nur über CSS-Breakpoint `md` (Inhalt einmal gezeichnet), Maximieren setzt/löscht Cookie `wohnwerk-fenster` ohne Neuladen (Fehler beim Speichern still), nur der Inhalt scrollt + Test  · files: src/components/rahmen/programmfenster.tsx, src/components/rahmen/programmfenster.test.tsx  · → AC-1, AC-2, AC-3, AC-24, EC-4, EC-7
- [ ] T15 [P]  Inhaltsrouten: Ladezustand, Fehlergrenze (Erneut versuchen lädt Bereich neu), Nicht-gefunden, Auffang-Route, letzte Auffanglinie `global-error`  · files: src/app/(angemeldet)/loading.tsx, src/app/(angemeldet)/error.tsx, src/app/(angemeldet)/not-found.tsx, src/app/(angemeldet)/[...pfad]/page.tsx, src/app/global-error.tsx  · → AC-10, AC-23, AC-32, AC-35, EC-2
- [ ] T16 [P]  PROJ-1-Anpassungen: Kontoseite in Variante „eingebettet“ (Titel „WohnWerk – Konto“ vom Rahmen); Sitzungswächter ruft vor automatischer Abmeldung „ohne Rückfrage verlassen“  · files: src/features/konto/components/konto-fenster.tsx, src/app/(angemeldet)/konto/page.tsx, src/features/konto/components/sitzungswaechter.tsx  · → AC-14, EC-3

## Ebene 5 — Zusammenbau

- [ ] T17 [P]  Angemeldetes Layout: liest auf dem Server Anzeigename/E-Mail, Cookie „Maximiert“ und `package.json`-Version; reicht Abmelden-Action hinein; legt Rahmen-Kontext, Programmfenster und Wächter um alle Bereiche (lädt keine Bereichsdaten); ersetzt PROJ-1-Statuszeile; Übergangsseite „Wohnungen“ („Die Wohnungsverwaltung folgt mit dem nächsten Ausbau.“)  · files: src/app/(angemeldet)/layout.tsx, src/app/(angemeldet)/wohnungen/page.tsx  · → AC-1, AC-4, AC-5, AC-8, AC-15, AC-16, AC-21, AC-34
- [ ] T18 [P]  Testseite nur für Browser-Tests (in Produktion „nicht gefunden“): wirft auf Wunsch einen Fehler, meldet Aktionen, Laden, Bestätigung und „ungespeichert“  · files: src/app/(angemeldet)/rahmen-test/page.tsx  · → AC-13, AC-17, AC-27, AC-32

## Ebene 6 — Browser-Tests (Playwright)

- [ ] T19 [P]  Navigation: Startseite, Bereichswechsel, Lesezeichen/Direktaufruf, Zurück/Vor, unbekannte Adresse, ungebauter Bereich, abgemeldet, Mehrfachklick  · files: tests/rahmen-navigation.spec.ts  · → AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-36, EC-1, EC-2, EC-9
- [ ] T20 [P]  Menüs, Werkzeugleiste, Statusleiste, Offline-Hinweis  · files: tests/rahmen-menue-status.spec.ts  · → AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-21, AC-22, AC-23, AC-33, EC-10
- [ ] T21 [P]  Ungespeichert (Bereichswechsel, Menüziel, Abmelden, Zurück, Neuladen) und Fehlergrenze – in Chrome, Firefox und Safari  · files: tests/rahmen-ungespeichert.spec.ts  · → AC-27, AC-28, AC-29, AC-32, EC-3
- [ ] T22 [P]  Darstellung und Maximieren: kein Aufblitzen, Wie System folgt live, privates Fenster ohne Fehler  · files: tests/rahmen-darstellung.spec.ts  · → AC-3, AC-18, AC-19, AC-20, EC-6, EC-7
- [ ] T23 [P]  Handy bei 360 px: kein waagrechter Bildlauf, Bedienelemente ≥ 44 px, Schublade, Breitenwechsel mit erhaltenen Eingaben  · files: tests/rahmen-handy.spec.ts  · → AC-24, AC-25, AC-26, EC-4
- [ ] T24 [P]  Tastatur (Tab-Reihenfolge, Enter/Leertaste, Esc, sichtbarer Fokus) und Kontrast mit axe in Hell und Dunkel; Entwicklungspaket `@axe-core/playwright`  · files: tests/rahmen-bedienbarkeit.spec.ts, package.json, package-lock.json  · → AC-30, AC-31

## Abdeckung

- Alle AC-1 bis AC-36 und EC-1 bis EC-10 sind mindestens einer Aufgabe zugeordnet (AC-36 ergänzt 2026-11-14: T1, T19; Tab-Titel der Seiten in T15–T17 über die Hilfsfunktion aus T1).
- AC-34 und AC-35 (Geschwindigkeit) werden durch T17 (Rahmen auf dem Server, keine Bereichsdaten) sowie T5/T15 (angesteuertes Ziel, `loading.tsx`) gebaut; die Messung in den Browser-Werkzeugen erfolgt in `/qa` und steht in `qa-report.md` (laut `design.md`).
- EC-8 (zwei Tabs): Darstellung über `next-themes` (T3), „ungespeichert“ je Tab im Wächter (T6) – kein eigener Browser-Test.
- Keine `[user]`-Aufgaben: `design.md` → „Einstellungen, die du selbst machst“ ist leer.

## Parallelisierung

- **Ebenen sind Schranken.** Regeln/Darstellung/Fenster (E1) → Rahmen-Kontext (E2) → Leisten und Bausteine (E3) → Programmfenster, Inhaltsrouten, PROJ-1-Anpassungen (E4) → Layout und Testseite (E5) → Browser-Tests (E6).
- **`[P]` verlangt disjunkte Dateien.** Geprüft: Keine zwei `[P]`-Aufgaben einer Ebene teilen einen Pfad. T5 läuft allein, weil alle Leisten den Kontext importieren; das Programmfenster (T14) liegt nach den Leisten, das Layout (T17) nach dem Programmfenster.
- **Vereinbarte Namen über Aufgaben hinweg:** Cookie `wohnwerk-fenster` (T2 Regel, T14 setzt, T17 liest); localStorage-Schlüssel `wohnwerk-darstellung` (T3, T22); Funktion „ohne Rückfrage verlassen“ (T5, genutzt von T6 und T16); Testseite `/rahmen-test` (T18, genutzt von T20, T21).
- Während `/build` läuft jede `[P]`-Aufgabe der aktiven Ebene in einem eigenen Subagenten; der Hauptagent integriert, prüft gegen die AC-IDs der Ebene und hakt hier ab.
