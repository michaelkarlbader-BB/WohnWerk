# PROJ-2: App-Rahmen & Navigation

<!-- This file (spec.md) is the stable CONTRACT — it defines WHAT, not HOW.
     Owner: /write-spec (creates), /refine (updates). During /build this file is READ-ONLY.
     Technical design lives in design.md, QA results in qa-report.md.
     No status or date fields here: the feature's status lives ONLY in features/INDEX.md,
     and git records when this file changed. -->

## Abhängigkeiten
- Benötigt: PROJ-1 (Benutzerkonto & Login) – Anmeldestatus, Abmelden, Anzeigename/E-Mail für die Statusleiste, Kontoseite unter *Extras → Konto*, Sitzungswächter und Fenster-Baustein (`src/components/retro/window.tsx`).
- Grundlage für alle Bereiche: PROJ-3 bis PROJ-10 zeigen ihre Oberfläche im Inhaltsbereich dieses Rahmens und füllen Werkzeugleiste, Menüaktionen und Statusleiste.
- Rahmen-Struktur und Seitenmuster: `docs/app-shell.md`; Gestaltung: `docs/design-system.md`.

## User Stories
- Als Vermieter möchte ich WohnWerk wie ein vertrautes Büroprogramm bedienen (Fenster, Menüs, Werkzeugleiste, Statusleiste), damit ich mich auch nach Monaten Pause sofort zurechtfinde.
- Als Vermieter möchte ich mit einem Klick zwischen Wohnungen, Mietern, Mietverträgen und Darlehen wechseln, damit ich schnell zu den gesuchten Daten komme.
- Als Vermieter möchte ich WohnWerk am Handy voll bedienen können, damit ich unterwegs Daten nachschlagen und ändern kann.
- Als Vermieter möchte ich gewarnt werden, bevor ungespeicherte Eingaben verloren gehen, damit ich nichts doppelt erfassen muss.
- Als Vermieter möchte ich zwischen hellem und dunklem Erscheinungsbild wählen, damit WohnWerk zu meinem Gerät und zur Tageszeit passt.
- Als Vermieter möchte ich Bereiche und Details als Lesezeichen speichern und mit dem Zurück-Knopf des Browsers navigieren, damit sich WohnWerk wie eine normale Webseite verhält.
- Als Vermieter möchte ich bei Fehlern oder fehlender Verbindung eine verständliche Meldung sehen und weiterarbeiten können, statt vor einer leeren Seite zu stehen.

## Nicht im Umfang
- Inhalte der Bereiche (Listen, Details, Registerkarten) – liefern PROJ-3 bis PROJ-10; der Rahmen stellt nur Platz, Leisten und Muster bereit
- Startseite „Übersicht“ mit Dashboards (PROJ-14)
- Verschiebbare, in der Größe veränderbare oder mehrere gleichzeitige Fenster; Minimieren und Schließen-Knopf
- Tastatur-Kurzbefehle (z. B. Strg+Alt+1–4, F5 im Bereich) und Tastatursteuerung der Menüleiste mit Alt/F10 und Pfeiltasten
- Darstellung kontoweit speichern (gilt je Gerät)
- „Speichern“ aus dem Warn-Dialog für ungespeicherte Änderungen heraus
- Offline-Betrieb (PRD: nur online)
- Rollen, Admin-Bereich (PRD/PROJ-1)
- Suche über alle Bereiche, Hilfe-Texte/Handbuch
- Uhrzeit/Datum in der Statusleiste
- Anmeldefenster und Kontoseite selbst (PROJ-1)

## Akzeptanzkriterien

### Fenster und Leisten
- [ ] **AC-1** — Angenommen ein angemeldeter Nutzer am Desktop (ab `md`), wenn er eine Seite von WohnWerk öffnet, dann sieht er ein Programmfenster auf der blauen Arbeitsfläche mit Titelleiste „WohnWerk – <Bereich>“, Menüleiste, Werkzeugleiste, Bereichsliste links, Inhalt rechts und Statusleiste – gestaltet nach `docs/design-system.md`
- [ ] **AC-2** — Angenommen das Fenster wird angezeigt, wenn der Inhalt länger ist als der verfügbare Platz, dann scrollt nur der Inhaltsbereich; Titel-, Menü-, Werkzeug- und Statusleiste sowie die Bereichsliste bleiben stehen
- [ ] **AC-3** — Angenommen ein Nutzer am Desktop, wenn er den Maximieren-Knopf in der Titelleiste wählt, dann füllt das Fenster den Browser ohne Rand (ohne sichtbare Arbeitsfläche); ein erneuter Klick stellt den Rand wieder her, und die Wahl bleibt auf diesem Gerät beim nächsten Besuch erhalten
- [ ] **AC-4** — Angenommen der Nutzer ist abgemeldet, wenn er WohnWerk aufruft, dann sieht er nur das Anmeldefenster aus PROJ-1 ohne Menü-, Werkzeug- und Bereichsleiste

### Bereiche und Navigation
- [ ] **AC-5** — Angenommen ein angemeldeter Nutzer, wenn er WohnWerk ohne bestimmte Adresse öffnet oder sich anmeldet, dann landet er im Bereich „Wohnungen“ (Startseite)
- [ ] **AC-6** — Angenommen die Bereichsliste wird angezeigt, wenn der Nutzer einen Bereich (Wohnungen, Mieter, Mietverträge, Darlehen) wählt, dann zeigt der Inhalt diesen Bereich, die Titelleiste lautet „WohnWerk – <Bereich>“ und der Bereich ist in der Liste als ausgewählt markiert
- [ ] **AC-7** — Angenommen das Feature eines Bereichs oder Menüeintrags ist noch nicht gebaut, wenn der Nutzer Bereichsliste oder Menüs ansieht, dann ist der Eintrag sichtbar, aber ausgegraut und lässt sich nicht auswählen
- [ ] **AC-8** — Angenommen ein angemeldeter Nutzer, wenn er die Adresse eines Bereichs oder eines Details direkt aufruft oder als Lesezeichen öffnet, dann sieht er genau diese Ansicht im Rahmen (abgemeldet: erst nach der Anmeldung, PROJ-1 AC-8)
- [ ] **AC-9** — Angenommen der Nutzer hat zwischen Bereichen bzw. Details gewechselt, wenn er Zurück oder Vor im Browser wählt, dann zeigt WohnWerk die vorherige bzw. nächste Ansicht samt passender Titelleiste und Auswahl in der Bereichsliste
- [ ] **AC-10** — Angenommen ein angemeldeter Nutzer, wenn er eine unbekannte Adresse oder einen nicht (mehr) vorhandenen Datensatz aufruft, dann zeigt der Inhalt im Rahmen die Meldung „Diese Seite gibt es nicht.“ mit dem Knopf „Zu den Wohnungen“

### Menüleiste
- [ ] **AC-11** — Angenommen ein angemeldeter Nutzer am Desktop, wenn er einen Menütitel anklickt, dann klappt ein Menü mit diesen Einträgen auf: **Datei** – Neu…, Abmelden · **Bearbeiten** – Bearbeiten…, Löschen… · **Ansicht** – Wohnungen, Mieter, Mietverträge, Darlehen, Aktualisieren, Darstellung ▸ Hell / Dunkel / Wie System · **Extras** – Export & Import…, Konto… · **?** – Über WohnWerk, Datenschutz, Impressum
- [ ] **AC-12** — Angenommen ein Menü ist offen, wenn der Nutzer einen Eintrag wählt, außerhalb klickt oder Esc drückt, dann schließt sich das Menü (bei einem Eintrag nach Ausführen der Aktion)
- [ ] **AC-13** — Angenommen ein Bereich bietet eine Aktion an (Neu, Bearbeiten, Löschen, Aktualisieren), wenn der Nutzer sie im Menü wählt, dann passiert dasselbe wie beim gleichnamigen Knopf der Werkzeugleiste; bietet der Bereich die Aktion gerade nicht an (z. B. Löschen ohne ausgewählten Eintrag), ist sie in Menü und Werkzeugleiste ausgegraut
- [ ] **AC-14** — Angenommen ein angemeldeter Nutzer, wenn er *Extras → Konto…* wählt, dann öffnet sich die Kontoseite aus PROJ-1 im Inhaltsbereich des Rahmens
- [ ] **AC-15** — Angenommen ein angemeldeter Nutzer, wenn er *Datei → Abmelden* wählt, dann wird er abgemeldet und sieht das Anmeldefenster (PROJ-1 AC-9)
- [ ] **AC-16** — Angenommen ein angemeldeter Nutzer, wenn er *? → Über WohnWerk* wählt, dann erscheint ein Dialogfenster mit Name und Version von WohnWerk sowie Links zu Datenschutz und Impressum; *? → Datenschutz* bzw. *Impressum* öffnen die jeweilige Seite

### Werkzeugleiste
- [ ] **AC-17** — Angenommen ein Bereich ist geöffnet, wenn die Werkzeugleiste angezeigt wird, dann enthält sie genau die Aktionen, die dieser Bereich anbietet; nicht verfügbare Aktionen sind ausgegraut, und ein Bereich ohne Aktionen zeigt eine leere Werkzeugleiste

### Darstellung
- [ ] **AC-18** — Angenommen der Nutzer hat noch keine Darstellung gewählt, wenn er WohnWerk öffnet, dann folgt das Erscheinungsbild der Hell-/Dunkel-Einstellung seines Geräts
- [ ] **AC-19** — Angenommen ein Nutzer wählt *Ansicht → Darstellung → Hell*, *Dunkel* oder *Wie System*, wenn die Wahl getroffen ist, dann wechselt das Erscheinungsbild sofort ohne Neuladen, die aktive Wahl ist im Menü markiert und gilt auf diesem Gerät auch beim nächsten Besuch – auch im Anmeldefenster
- [ ] **AC-20** — Angenommen eine gespeicherte Darstellung, wenn WohnWerk geladen wird, dann erscheint die Seite direkt in dieser Darstellung, ohne kurz in der anderen aufzublitzen

### Statusleiste
- [ ] **AC-21** — Angenommen ein angemeldeter Nutzer am Desktop, wenn die Statusleiste angezeigt wird, dann zeigt sie von links nach rechts: Statustext („Bereit“), die vom Bereich gemeldete Anzahl (z. B. „4 Wohnungen“, leer wenn der Bereich keine meldet) und „Angemeldet: <Anzeigename oder E-Mail>“
- [ ] **AC-22** — Angenommen ein Bereich meldet eine Bestätigung (z. B. „Wohnung gespeichert.“), wenn sie erscheint, dann steht sie im Statustext und wird nach etwa 10 Sekunden wieder zu „Bereit“; eine neue Bestätigung ersetzt die vorige sofort
- [ ] **AC-23** — Angenommen ein Bereich lädt Daten, wenn das Laden läuft, dann zeigt die Statusleiste einen Segment-Fortschrittsbalken und „Bitte warten…“ und danach wieder den vorherigen Statustext

### Handy
- [ ] **AC-24** — Angenommen ein angemeldeter Nutzer auf einem Bildschirm schmaler als `md`, wenn er WohnWerk öffnet, dann füllt das Fenster den Bildschirm ohne Arbeitsfläche und ohne Maximieren-Knopf, links in der Titelleiste sitzt ein Menü-Knopf, die Werkzeugleiste hat Knöpfe von mindestens 44 px Höhe und die Statusleiste zeigt einzeilig nur den Statustext
- [ ] **AC-25** — Angenommen ein Nutzer am Handy, wenn er den Menü-Knopf antippt, dann öffnet sich von links eine Schublade mit den Bereichen und allen Menüeinträgen aus AC-11 (gleiche Regeln für ausgegraute Einträge); Antippen eines Eintrags führt ihn aus und schließt die Schublade, Antippen daneben oder Zurück schließt sie ohne Aktion
- [ ] **AC-26** — Angenommen ein Nutzer am Handy (Bildschirmbreite ab 360 px), wenn er eine beliebige Seite des Rahmens ansieht, dann gibt es keinen waagrechten Bildlauf der ganzen Seite und jedes Bedienelement ist mindestens 44 px hoch

### Ungespeicherte Änderungen
- [ ] **AC-27** — Angenommen ein Bereich meldet ungespeicherte Änderungen, wenn der Nutzer den Bereich wechselt, im Browser zurückgeht, ein Menü-Ziel öffnet oder sich abmeldet, dann erscheint ein Dialogfenster „Nicht gespeicherte Änderungen verwerfen?“ mit „Verwerfen“ (führt die Aktion aus) und „Abbrechen“ (bleibt mit allen Eingaben auf der Seite)
- [ ] **AC-28** — Angenommen ein Bereich meldet ungespeicherte Änderungen, wenn der Nutzer den Tab schließt oder neu lädt, dann zeigt der Browser seine Rückfrage vor dem Verlassen
- [ ] **AC-29** — Angenommen kein Bereich meldet ungespeicherte Änderungen, wenn der Nutzer navigiert oder sich abmeldet, dann erscheint keine Rückfrage

### Bedienbarkeit
- [ ] **AC-30** — Angenommen ein Nutzer bedient den Rahmen nur mit der Tastatur, wenn er mit Tab bzw. Umschalt+Tab durch Menütitel, Werkzeugleiste, Bereichsliste und Statusleisten-Elemente geht, dann ist jedes Element erreichbar, mit Enter bzw. Leertaste auslösbar, der Fokus sichtbar (gepunkteter Innenrahmen plus Ring laut Design-System) und Esc schließt offene Menüs, Schublade und Dialoge
- [ ] **AC-31** — Angenommen der Rahmen in Hell- oder Dunkeldarstellung, wenn der Text- und Hintergrundkontrast aller Leisten, Menüs und Meldungen gemessen wird, dann beträgt er mindestens 4,5:1

### Fehler und Verbindung
- [ ] **AC-32** — Angenommen beim Anzeigen eines Bereichs tritt ein unerwarteter Fehler auf, wenn er passiert, dann bleiben Leisten und Bereichsliste bedienbar und der Inhalt zeigt ein Meldungsfenster „Hier ist etwas schiefgelaufen.“ mit „Erneut versuchen“ (lädt den Bereich neu) und „Zu den Wohnungen“; technische Details werden nicht angezeigt
- [ ] **AC-33** — Angenommen die Internetverbindung des Geräts bricht ab, wenn der Rahmen das bemerkt, dann zeigt die Statusleiste „Keine Verbindung – Änderungen können nicht gespeichert werden.“, bis die Verbindung zurück ist; danach erscheint wieder „Bereit“

### Geschwindigkeit
- [ ] **AC-34** — Angenommen ein aktuelles Handy mit auf „Fast 4G“ gedrosseltem Netz (Browser-Werkzeuge), wenn sich der Nutzer anmeldet, dann ist der Rahmen mit Bereichsliste bzw. Menü-Knopf nach höchstens 2 Sekunden sichtbar und bedienbar (gemessen ab Absenden der Anmeldung bzw. ab Aufruf mit bestehender Sitzung, Inhalte des Bereichs ausgenommen)
- [ ] **AC-35** — Angenommen der Rahmen ist geladen, wenn der Nutzer einen anderen Bereich wählt, dann zeigen Titelleiste, Auswahl in der Bereichsliste und Ladeanzeige den neuen Bereich nach weniger als 0,5 Sekunden (gemessen in den Browser-Werkzeugen unter denselben Bedingungen wie AC-34)

## Sonderfälle
- **EC-1** — Angenommen der Nutzer wählt den bereits aktiven Bereich erneut, wenn er klickt, dann bleibt die Ansicht stehen und es entsteht kein zusätzlicher Eintrag im Browser-Verlauf
- **EC-2** — Angenommen der Nutzer ruft die Adresse eines noch nicht gebauten Bereichs direkt auf, wenn die Seite lädt, dann sieht er „Diese Seite gibt es nicht.“ (AC-10)
- **EC-3** — Angenommen der Nutzer wählt „Verwerfen“ im Dialog aus AC-27 bei der Aktion Abmelden, wenn er bestätigt, dann wird er abgemeldet und die Eingaben sind verloren; die automatische Abmeldung nach 30 Minuten Inaktivität (PROJ-1 AC-7, EC-3) fragt nicht nach
- **EC-4** — Angenommen das Browserfenster am Desktop wird unter `md` verkleinert oder das Handy gedreht, wenn sich die Breite ändert, dann wechselt der Rahmen ohne Neuladen in die passende Ansicht, eine offene Schublade schließt sich und ungespeicherte Eingaben bleiben erhalten
- **EC-5** — Angenommen sehr lange Anzeigenamen, Bereichs- oder Detailnamen, wenn sie in Titel- oder Statusleiste angezeigt werden, dann werden sie mit „…“ gekürzt, ohne die Leiste umzubrechen oder andere Elemente zu verdrängen
- **EC-6** — Angenommen die Darstellung ist auf „Wie System“, wenn der Nutzer die Hell-/Dunkel-Einstellung seines Geräts bei geöffnetem WohnWerk ändert, dann folgt WohnWerk ohne Neuladen
- **EC-7** — Angenommen der Browser lässt kein Speichern von Einstellungen zu (z. B. privates Fenster), wenn der Nutzer Darstellung oder Maximieren wählt, dann wirkt die Wahl für den aktuellen Besuch und WohnWerk funktioniert ohne Fehlermeldung weiter
- **EC-8** — Angenommen der Nutzer öffnet WohnWerk in zwei Tabs, wenn er in einem Tab die Darstellung ändert, dann gilt sie im anderen spätestens beim nächsten Neuladen; ungespeicherte Änderungen werden je Tab getrennt behandelt
- **EC-9** — Angenommen der Nutzer klickt schnell mehrfach auf einen Bereich oder Menüeintrag, wenn die Klicks eintreffen, dann wird die Navigation bzw. Aktion nur einmal ausgeführt
- **EC-10** — Angenommen die Verbindung bricht während eines Ladevorgangs ab, wenn das Laden scheitert, dann endet die Ladeanzeige und die Statusleiste zeigt den Hinweis aus AC-33 statt dauerhaft „Bitte warten…“

## Technische Anforderungen
- Auf Desktop und Handy (ab 360 px Breite) voll bedienbar; aktuelle Versionen von Chrome, Edge, Firefox und Safari (inkl. iOS).
- Struktur nach `docs/app-shell.md`, Gestaltung nach `docs/design-system.md`; vorhandene shadcn/ui-Bausteine (Menü, Schublade, Dialog) werden genutzt, nicht nachgebaut.
- Darstellung und Maximieren werden nur im Browser des Geräts gespeichert, ohne Personenbezug; keine neue Datenbanktabelle.
- Qualitätsszenarien: AC-26, AC-30, AC-31 (Bedienbarkeit, Kontrast), AC-34, AC-35 (Geschwindigkeit; Annahme: 1 Nutzer, ca. monatliche Nutzung laut PRD).
- Schnittstelle zu den Bereichs-Features (Inhalt, Aktionen, Anzahl, Bestätigungen, Ladezustand, ungespeicherte Änderungen) legt `/architecture` fest und trägt sie in `docs/app-shell.md` → Rahmen-Bausteine ein.

## Offene Fragen
- [ ] Woher kommt die Versionsnummer für „Über WohnWerk“ (z. B. Paketversion oder Release-Tag)? → `/architecture`
- [ ] Wie meldet ein Feature seinen Bereich als „gebaut“ bzw. noch nicht gebaut (AC-7)? → `/architecture`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Echte Aufklapp-Menüs, die die Werkzeugleisten-Aktionen wiederholen und Bereichswechsel, Konto, Darstellung und Hilfe-Links enthalten | Gehört zum vertrauten Büroprogramm-Gefühl des Retro-Stils; jede Funktion bleibt auch ohne Werkzeugleiste erreichbar | 2026-11-08 |
| Noch nicht gebaute Bereiche und Menüeinträge ausgegraut statt ausgeblendet | Der Nutzer sieht von Anfang an, was WohnWerk werden soll; der Rahmen ändert seine Gestalt später nicht | 2026-11-08 |
| Darstellung (Hell/Dunkel/Wie System) je Gerät im Browser, Standard „Wie System“ | Kein Datenbankfeld nötig; am Handy darf eine andere Einstellung gelten als am PC; vom Nutzer ausdrücklich gewählte Einstellung, kein Personenbezug | 2026-11-08 |
| Warnung bei ungespeicherten Änderungen nur mit Verwerfen/Abbrechen, kein Speichern aus dem Dialog | Einfacher Vertrag mit den Features (sie melden nur „ungespeichert“); Speichern bleibt im Formular | 2026-11-08 |
| Tastatur: nur Grundbedienung (Tab, Enter/Leertaste, Esc), keine Menü-Tastatursteuerung und keine Kurzbefehle | Seltene Nutzung (ca. monatlich); Alt-Kürzel kollidieren mit dem Browser; sichtbarer Fokus bleibt Pflicht | 2026-11-08 |
| Fenster fest am Desktop mit Rand und Maximieren-Knopf; Wahl je Gerät gespeichert; kein Verschieben, keine Größenänderung | Retro-Optik mit Arbeitsfläche, aber volle Fläche bei Bedarf auf kleinen Laptops | 2026-11-08 |
| Statusleiste: Statustext (Bestätigung ca. 10 s), Anzahl, angemeldeter Nutzer; am Handy nur Statustext | Ersetzt eingeblendete Benachrichtigungen (Design-System); am Handy fehlt der Platz | 2026-11-08 |
| Eigene Adressen für Bereiche und Details, Zurück-Knopf funktioniert, „Diese Seite gibt es nicht.“ im Rahmen | Lesezeichen und Browser-Gewohnheiten bleiben nutzbar; Rahmen bleibt auch bei Fehlern bedienbar | 2026-11-08 |
| Absturzmeldung nur im Inhalt mit „Erneut versuchen“; Offline-Hinweis in der Statusleiste | Ein Fehler in einem Bereich legt nicht die ganze App lahm; PRD: nur online, deshalb nur ein Hinweis statt Offline-Betrieb | 2026-11-08 |
| Geschwindigkeit: Rahmen ≤ 2 s auf gedrosseltem 4G, Rückmeldung beim Bereichswechsel < 0,5 s | Handy-Nutzung unterwegs ist ein Kernziel; messbar mit den Browser-Werkzeugen | 2026-11-08 |
