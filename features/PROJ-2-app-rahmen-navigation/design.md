# PROJ-2 — Technischer Entwurf: App-Rahmen & Navigation

> Der technische Entwurf (das WIE). Zwei Leser: der Product Owner (gibt frei) und `/build` (setzt danach um). Kein Code – aber umsetzungsgenau.
> Owner: `/architecture`. Der Vertrag (WAS) steht in `spec.md`; die Aufgabenliste in `tasks.md`.

## Überblick in einem Absatz

Der Rahmen ist ein **geteilter Baustein** unter `src/components/rahmen/`, den das Layout der angemeldeten Routengruppe `(angemeldet)` einmal um alle Bereiche legt. Er zeichnet Titel-, Menü-, Werkzeug- und Statusleiste sowie die Bereichsliste und bietet den Bereichs-Features (PROJ-3 bis PROJ-10) eine kleine **Rahmen-Schnittstelle**: Aktionen anmelden, Anzahl melden, Bestätigung melden, Laden melden, „ungespeichert“ melden. Welche Bereiche und Menüeinträge schon gebaut sind, steht in **einem festen Verzeichnis** im Rahmen; jedes Feature schaltet dort beim eigenen `/build` seinen Eintrag frei. Hell/Dunkel übernimmt das bereits installierte `next-themes` (Speicherung im Browser, kein Aufblitzen), „Maximiert“ ein kleines Cookie, damit der Server das Fenster gleich richtig zeichnet. Es gibt **keine Datenbankänderung** und keine neue Server-Schnittstelle; Zugriffsschutz bleibt bei PROJ-1 (Anfrage-Grenze `src/proxy.ts`).

## Komponenten-Struktur

```
Wurzel-Layout (alle Seiten, auch abgemeldet)
+-- Darstellungs-Anbieter (Hell / Dunkel / Wie System, ohne Aufblitzen)   → AC-18–20, EC-6–8

Angemeldetes Layout  (src/app/(angemeldet)/layout.tsx)
+-- Rahmen-Kontext (Zustand: Aktionen, Anzahl, Status, Laden, ungespeichert, online)
    +-- Programmfenster (Desktop: auf blauer Arbeitsfläche mit 16-px-Rand;
    |   maximiert oder Handy: bildschirmfüllend)                          → AC-1, AC-3, AC-24
    |   +-- Titelleiste „WohnWerk – <Bereich>[ – <Detail>]“
    |   |   +-- [≡] Menü-Knopf (nur Handy, links)                         → AC-24
    |   |   +-- [□] Maximieren / Wiederherstellen (nur Desktop, rechts)   → AC-3
    |   +-- Menüleiste (nur Desktop): Datei · Bearbeiten · Ansicht · Extras · ?   → AC-11–16
    |   |   +-- Ansicht → Darstellung ▸ (Hell ◉ / Dunkel / Wie System)      → AC-19
    |   +-- Werkzeugleiste: Neu · Bearbeiten · Löschen │ Aktualisieren
    |   |   (nur die Aktionen, die der Bereich anmeldet)                  → AC-13, AC-17
    |   +-- Bereichsliste (nur Desktop, links, fest)                      → AC-6, AC-7
    |   |   Wohnungen · Mieter · Mietverträge · Darlehen
    |   +-- Inhaltsbereich (scrollt als Einziges)                         → AC-2
    |   |   +-- Seite des Bereichs-Features
    |   |   +-- Ladezustand (leer, Statusleiste zeigt „Bitte warten…“)     → AC-23, AC-35
    |   |   +-- „Diese Seite gibt es nicht.“ [Zu den Wohnungen]           → AC-10, EC-2
    |   |   +-- Meldungsfenster „Hier ist etwas schiefgelaufen.“
    |   |       [Erneut versuchen] [Zu den Wohnungen]                     → AC-32
    |   +-- Statusleiste
    |       Desktop: Statustext + Segment-Fortschritt │ Anzahl │ Angemeldet: …   → AC-21–23
    |       Handy: nur Statustext, einzeilig                              → AC-24
    +-- Schublade (Handy, von links): Bereiche + alle Menüeinträge         → AC-25
    +-- Dialog „Nicht gespeicherte Änderungen verwerfen?“ [Verwerfen] [Abbrechen]  → AC-27
    +-- Dialog „Über WohnWerk“ (Name, Version, Links Datenschutz/Impressum) → AC-16
    +-- Wächter (unsichtbar): Verlassen-Rückfrage des Browsers, Zurück-Knopf, Verbindung  → AC-28, AC-33

Abgemeldet: unverändert aus PROJ-1 – nur das Anmeldefenster auf der Arbeitsfläche   → AC-4
```

### Was in Menü, Werkzeugleiste und Schublade steht (AC-11, AC-25)

| Menü | Eintrag | Wirkung | Verfügbar |
| --- | --- | --- | --- |
| Datei | Neu… | Aktion „Neu“ des Bereichs | wenn der Bereich „Neu“ anmeldet und freigibt |
| Datei | Abmelden | Abmelden aus PROJ-1 (mit Rückfrage bei ungespeichert) | immer |
| Bearbeiten | Bearbeiten… | Aktion „Bearbeiten“ des Bereichs | wie Neu |
| Bearbeiten | Löschen… | Aktion „Löschen“ des Bereichs | wie Neu |
| Ansicht | Wohnungen / Mieter / Mietverträge / Darlehen | Bereich öffnen; aktiver Bereich markiert | laut Verzeichnis (gebaut ja/nein) |
| Ansicht | Aktualisieren | Aktion „Aktualisieren“ des Bereichs | wie Neu |
| Ansicht | Darstellung ▸ Hell / Dunkel / Wie System | sofort umschalten; aktive Wahl markiert (Optionsgruppe) | immer |
| Extras | Export & Import… | `/export-import` | laut Verzeichnis (PROJ-10) |
| Extras | Konto… | `/konto` | immer (PROJ-1) |
| ? | Über WohnWerk | Dialog | immer |
| ? | Datenschutz / Impressum | `/datenschutz`, `/impressum` (Seiten aus PROJ-1, ohne Rahmen) | immer |

Die Schublade am Handy zeigt oben die vier Bereiche, darunter dieselben Einträge gruppiert unter den Menünamen als Überschriften; „Darstellung“ als Optionsgruppe mit drei Einträgen. Ausgegraute Einträge sind sichtbar, aber nicht auswählbar (AC-7, AC-25).

## Code-Struktur

Der Rahmen ist **geteilter Code** (`src/components/rahmen/`), weil jedes Bereichs-Feature seine Schnittstelle importiert. Der Struktur-Check verbietet geteiltem Code, Features zu importieren – damit kann der Rahmen nie von einem Bereich abhängen. Was PROJ-1 liefert (Anzeigename, Abmelden), reicht das Layout der Route als Eingabe hinein.

| Modul / Pfad | Aufgabe und Schnittstelle | Erlaubte Abhängigkeiten / genutzte Module |
| --- | --- | --- |
| `src/components/rahmen/navigation.rules.ts` | **Verzeichnis** der Bereiche und Menüziele: je Eintrag Kennung, Beschriftung, Pfad, Feature-ID, *gebaut* ja/nein. Reine Funktionen: aktiver Bereich zu einem Pfad (auch Detailpfade `/<bereich>/<id>`), Text der Titelleiste (Bereich + optional Detail), „ist das schon die aktuelle Ansicht?“ (EC-1), Menüeinträge mit Zustand verfügbar/ausgegraut | keine |
| `src/components/rahmen/rahmen.rules.ts` | Reine Regeln: Statustext aus Zustand (Vorrang: Keine Verbindung > Bitte warten… > Bestätigung > Bereit), Bestätigungsdauer 10 s, Cookie-Wert „Maximiert“ lesen (nur exakt `1` gilt als maximiert, alles andere als normal) | keine |
| `src/components/rahmen/rahmen-kontext.tsx` | Client-Zustand des Rahmens und die **Rahmen-Schnittstelle** für Features (siehe „Rahmen-Schnittstelle“) | React, `navigation.rules`, `rahmen.rules` |
| `src/components/rahmen/ungespeichert-waechter.tsx` | Rückfrage-Dialog (AC-27), Browser-Rückfrage beim Schließen/Neuladen (AC-28), Abfangen von Zurück (AC-27), Umgehung für automatische Abmeldung (EC-3) | shadcn `alert-dialog`, `rahmen-kontext` |
| `src/components/rahmen/programmfenster.tsx` | Fensteraufbau Desktop/Handy, Maximieren (setzt Cookie, schaltet ohne Neuladen um), Scroll nur im Inhalt | `src/components/retro/window.tsx`, Leisten-Module |
| `src/components/rahmen/menueleiste.tsx` | Fünf Menüs, je ein eigenes Aufklappmenü (jeder Menütitel per Tab erreichbar) | shadcn `dropdown-menu`, `rahmen-kontext`, `next-themes` |
| `src/components/rahmen/werkzeugleiste.tsx` | Knöpfe der angemeldeten Aktionen; während eine Aktion läuft, ist ihr Knopf gesperrt (EC-9) | shadcn `button`, `tooltip`, `lucide-react`-Symbole |
| `src/components/rahmen/bereichsliste.tsx` | Navigationsliste der vier Bereiche als echte Links (Lesezeichen, Mittelklick) mit Auswahlmarkierung | `rahmen-kontext` |
| `src/components/rahmen/schublade.tsx` | Handy-Schublade; schließt bei Auswahl, Antippen daneben, Zurück, Esc und beim Wechsel auf Desktop-Breite (EC-4) | shadcn `sheet`, `src/hooks/use-mobile.tsx` |
| `src/components/rahmen/statusleiste.tsx` | Statustext, Segment-Fortschritt (unbestimmt, laufend), Anzahl, „Angemeldet: …“; Kürzen mit „…“ (EC-5); Verbindungsstatus | shadcn `progress` (umgestaltet zu Segmenten) |
| `src/components/rahmen/ueber-dialog.tsx` | Dialog „Über WohnWerk“ mit Name, Version (als Eingabe), Links | shadcn `dialog` |
| `src/components/rahmen/inhalt-meldungen.tsx` | Inhaltsbausteine „Diese Seite gibt es nicht.“ und Meldungsfenster „Hier ist etwas schiefgelaufen.“ sowie Lade-Platzhalter, der „Laden“ meldet, solange er sichtbar ist | `src/components/retro/window.tsx`, shadcn `button`, `rahmen-kontext` |
| `src/components/rahmen/darstellung-anbieter.tsx` | Hell/Dunkel/Wie System für die ganze App (auch Anmeldefenster) | `next-themes` |
| `src/components/retro/window.tsx` | (aus PROJ-1) erweitert um: Platz für Knöpfe links/rechts in der Titelleiste, Variante „eingebettet“ ohne eigene Titelleiste für Inhalte im Rahmen | shadcn |
| `src/app/layout.tsx` | Darstellungs-Anbieter einhängen; Titel-Vorlage „WohnWerk – %s“ für den Browser-Tab (%s ist immer nur die Beschriftung des Bereichs bzw. Menüziels aus dem Verzeichnis, nie ein Detailname – AC-36) | `darstellung-anbieter` |
| `src/app/global-error.tsx` | Letzte Auffanglinie, falls der Rahmen selbst abstürzt: „Hier ist etwas schiefgelaufen.“ mit [Neu laden] | — |
| `src/app/(angemeldet)/layout.tsx` | (aus PROJ-1, ersetzt dessen kleine Statuszeile) liest auf dem Server Anzeigename/E-Mail (PROJ-1), Cookie „Maximiert“ und die Version; gibt Abmelden-Action von PROJ-1 hinein; legt Rahmen-Kontext + Programmfenster um alle Bereiche; Sitzungswächter bleibt | `src/components/rahmen/*`, `src/features/konto/*` |
| `src/app/(angemeldet)/loading.tsx` | Ladezustand beim Bereichswechsel (sofort sichtbar) | `inhalt-meldungen` |
| `src/app/(angemeldet)/error.tsx` | Absturzmeldung im Inhalt; „Erneut versuchen“ setzt zurück und lädt die Daten des Bereichs neu | `inhalt-meldungen` |
| `src/app/(angemeldet)/not-found.tsx` + `src/app/(angemeldet)/[...pfad]/page.tsx` | „Diese Seite gibt es nicht.“ im Rahmen – für unbekannte Adressen (Auffang-Route) und für Detailseiten, deren Datensatz fehlt | `inhalt-meldungen` |
| `src/app/(angemeldet)/wohnungen/page.tsx` | Übergangs-Startseite bis PROJ-3: grauer Hinweis „Die Wohnungsverwaltung folgt mit dem nächsten Ausbau.“ | `inhalt-meldungen` |
| `src/app/(angemeldet)/konto/page.tsx`, `src/features/konto/components/konto-fenster.tsx` | Kontoseite im Inhalt ohne eigene Titelleiste (Variante „eingebettet“); Titelleiste des Rahmens zeigt „WohnWerk – Konto“ | `window.tsx` |
| `src/features/konto/components/sitzungswaechter.tsx` | ruft vor der automatischen Abmeldung „ohne Rückfrage verlassen“ des Rahmens auf (EC-3) | `rahmen-kontext` |
| `src/app/globals.css` | Dunkelwerte an die Klasse `dark` binden (statt nur an die Systemeinstellung), Fokus-Stil global (gepunkteter Innenrahmen + 2-px-Ring), Fensterhöhe nach sichtbarer Bildschirmhöhe (`dvh`), weniger Bewegung bei „reduzierte Bewegung“ | — |

Tests liegen neben dem Modul (`*.test.ts(x)`); Browser-Tests (Zurück-Knopf, Darstellung, Handy, Tastatur, Kontrast) in `tests/`.

### Rahmen-Schnittstelle (für PROJ-3 bis PROJ-10)

Diese Schnittstelle wird in `docs/app-shell.md` → Rahmen-Bausteine eingetragen; Features nutzen nur sie.

| Was das Feature meldet | Form | Verhalten des Rahmens |
| --- | --- | --- |
| **Bereich einrichten** (einmal je Seite) | Aktionen *neu*, *bearbeiten*, *löschen*, *aktualisieren* – je: auszuführende Funktion + *verfügbar* ja/nein; nicht gemeldet = nicht angeboten. Optional: *Anzahl* (fertiger Text, z. B. „4 Wohnungen“), *Detailtitel* (z. B. „WE 03 – Musterstraße 5“), *ungespeichert* ja/nein | Werkzeugleiste und Menü zeigen genau diese Aktionen (AC-13, AC-17); beim Verlassen der Seite wird alles automatisch zurückgesetzt (keine veralteten Knöpfe) |
| **Bestätigung** | Text, max. 120 Zeichen | ersetzt sofort die vorige; nach 10 s wieder „Bereit“ (AC-22) |
| **Laden** | ja/nein (mehrere gleichzeitig möglich, gezählt) | „Bitte warten…“ + Segment-Fortschritt, solange mindestens ein Laden läuft (AC-23). Das Feature meldet das Ende **auch bei Fehlern** |
| **Geschützte Navigation** | Link-Baustein bzw. Navigationsfunktion des Rahmens für Links im Inhalt | fragt bei „ungespeichert“ nach (AC-27) |
| **Ohne Rückfrage verlassen** | Funktion (nur für Sitzungswächter / automatische Abmeldung) | löscht „ungespeichert“ und die Browser-Rückfrage, damit nichts nachfragt (EC-3) |

Läuft eine gemeldete Aktion asynchron, sperrt der Rahmen ihren Knopf und Menüeintrag bis zum Ende (EC-9). Die Aktion selbst (Dialoge, Speichern, Löschen-Rückfrage) bleibt Sache des Features.

### Verzeichnis „gebaut“ (beantwortet offene Frage 2 der Spec)

`navigation.rules.ts` führt alle Bereiche und Menüziele fest auf, Stand nach PROJ-2:

| Kennung | Pfad | Feature | gebaut |
| --- | --- | --- | --- |
| wohnungen | `/wohnungen` | PROJ-3 | **ja** (Übergangsseite bis PROJ-3, da Startseite) |
| mieter | `/mieter` | PROJ-5 | nein |
| mietvertraege | `/mietvertraege` | PROJ-6 | nein |
| darlehen | `/darlehen` | PROJ-8 | nein |
| export-import | `/export-import` | PROJ-10 | nein |
| konto | `/konto` | PROJ-1 | ja |

Jedes Feature setzt beim eigenen `/build` im selben Commit wie seine Route den Eintrag auf „gebaut“ (eine Zeile, als Aufgabe in dessen `tasks.md`). Eine Adresse eines ungebauten Bereichs hat keine Seite und landet automatisch bei „Diese Seite gibt es nicht.“ (EC-2).

## Footprint

- **Code und Tests:** `src/components/rahmen/**` (neu), `src/components/retro/window.tsx` (erweitert), `src/app/layout.tsx`, `src/app/global-error.tsx`, `src/app/globals.css`, `src/app/(angemeldet)/layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `[...pfad]/page.tsx`, `wohnungen/page.tsx`, `konto/page.tsx`; Anpassung `src/features/konto/components/konto-fenster.tsx` und `sitzungswaechter.tsx`; Browser-Tests in `tests/rahmen*.spec.ts`
- **Migrationen, Tabellen, Zugriffsregeln:** keine
- **Umgebungsvariablen (nur Namen):** keine
- **Pakete:** keine neuen zur Laufzeit (`next-themes`, Radix-Bausteine vorhanden); Entwicklung: `@axe-core/playwright`
- **Gerätespeicher:** `localStorage` → Schlüssel `wohnwerk-darstellung` (Werte `light` / `dark` / `system`); Cookie `wohnwerk-fenster` (Wert `1` = maximiert, Pfad `/`, `SameSite=Lax`, 1 Jahr, nicht HttpOnly, da der Browser es setzt)
- **Anbindungen:** Routengruppe `(angemeldet)` (Layout, Laden, Fehler, Nicht-gefunden, Auffang-Route); PROJ-1: Abmelden-Action, Anzeigename/E-Mail, Sitzungswächter, Kontoseite; Seiten `/datenschutz`, `/impressum`; keine externen Dienste

## Qualität und Fehlerverhalten

| AC/EC | Bedingung und Grenze | Mechanismus | Geplante Prüfung |
| --- | --- | --- | --- |
| AC-2 | Langer Inhalt → nur Inhalt scrollt | Fenster hat feste Höhe (sichtbare Bildschirmhöhe, `dvh`); nur der Inhaltsbereich hat eigenen Bildlauf | Browser-Test: Seite mit langem Inhalt, Leisten bleiben an Position |
| AC-3, EC-7 | Maximiert bleibt je Gerät; privates Fenster ohne Fehler | Cookie wird im Browser gesetzt, Server liest es beim nächsten Aufruf und zeichnet sofort richtig; schlägt Speichern fehl, gilt die Wahl nur im Zustand der Seite | Unit-Test Cookie-Regel; Browser-Test: maximieren, neu laden |
| AC-9, EC-1 | Zurück/Vor zeigt richtige Ansicht; aktiver Bereich erzeugt keinen Verlaufseintrag | Echte Adressen je Bereich/Detail, Titel und Auswahl werden aus der Adresse abgeleitet; Klick auf aktuelle Ansicht wird ignoriert | Unit-Test „aktueller Bereich aus Pfad“; Browser-Test Zurück/Vor |
| AC-20, EC-6, EC-8 | Kein Aufblitzen der falschen Darstellung | `next-themes` setzt die Klasse vor dem ersten Zeichnen; folgt Systemänderungen live; anderer Tab spätestens beim Neuladen | Browser-Test mit gespeicherter Darstellung „Dunkel“ und System „Hell“: erstes Bild ist dunkel |
| AC-26 | Handy ≥ 360 px: kein waagrechter Bildlauf, Bedienelemente ≥ 44 px | Handy-Maße über Tailwind-Breakpoint `md`; lange Texte gekürzt (EC-5) | Browser-Test bei 360 px: Seitenbreite = Bildschirmbreite, Höhe aller Bedienelemente gemessen |
| AC-27 | Rückfrage bei ungespeichert: Bereichswechsel, Menüziel, Abmelden, **Zurück** | Alle Rahmen-Navigation läuft über eine geschützte Funktion. Für Zurück legt der Rahmen, sobald „ungespeichert“ gemeldet wird, einen zusätzlichen Verlaufseintrag derselben Adresse an; Zurück verbraucht ihn, der Rahmen fragt: Abbrechen → Eintrag erneut anlegen; Verwerfen → tatsächlich zurück | Browser-Test: Eingabe, Zurück → Dialog; Abbrechen → Eingabe da; Verwerfen → vorige Seite |
| AC-28 | Tab schließen/neu laden | Browser-Ereignis „vor dem Verlassen“ nur, solange „ungespeichert“ gemeldet ist (AC-29) | Browser-Test: Dialog-Ereignis tritt nur bei gemeldetem Zustand auf |
| AC-30 | Nur Tastatur | Jeder Menütitel ist ein eigenes Aufklappmenü (einzeln per Tab erreichbar); Bereichsliste als Links; globaler Fokus-Stil; Esc schließt Menüs/Schublade/Dialoge (Radix) | Browser-Test: Tab-Reihenfolge und Esc |
| AC-31 | Kontrast ≥ 4,5:1 hell und dunkel | Farben nur aus `docs/design-system.md` | Kontrastprüfung mit axe (Browser-Test) in beiden Darstellungen |
| AC-32 | Fehler im Bereich → Rahmen bleibt bedienbar | Fehlergrenze der Routengruppe liegt **innerhalb** des Layouts: nur der Inhalt wird ersetzt | Browser-Test mit absichtlich fehlerhafter Testseite (nur in Tests vorhanden) |
| AC-33, EC-10 | Verbindung weg → Hinweis, danach „Bereit“ | Rahmen hört auf die Online/Offline-Ereignisse des Browsers; „Keine Verbindung“ hat Vorrang vor allem anderen; beim Offline-Ereignis enden alle laufenden Ladeanzeigen | Unit-Test Vorrangregel; Browser-Test mit Offline-Schalter |
| AC-34 | Fast 4G, aktuelles Handy: Rahmen ≤ 2 s bedienbar | Rahmen wird auf dem Server gezeichnet; Layout lädt **keine** Bereichsdaten; keine neuen Laufzeit-Pakete; Menüs und Schublade erst beim Öffnen geladen | Messung in den Browser-Werkzeugen (Gerät: Mittelklasse-Handy-Profil, Fast 4G), Ergebnis in `qa-report.md` |
| AC-35 | Bereichswechsel → neue Titelleiste/Auswahl/Ladeanzeige < 0,5 s | Beim Klick merkt sich der Rahmen sofort das Ziel und zeigt Titel, Auswahl und „Bitte warten…“, bevor die Seite da ist; Ladezustand `loading.tsx` wird vorab geladen (Links im Sichtbereich werden vorgeladen) | Messung in den Browser-Werkzeugen (Performance-Aufzeichnung), Ergebnis in `qa-report.md` |
| AC-36 | Tab-Titel und Adresse ohne Detailangaben | Jede Seite setzt ihren Tab-Titel über eine Hilfsfunktion in `navigation.rules.ts` („Tab-Titel zu Bereichskennung“ → nur Beschriftung); Detailseiten (PROJ-3 ff.) nutzen dieselbe Funktion und setzen den Titel **nicht** aus Datensatzwerten; Adressen nur `/<bereich>/<id>` | Unit-Test der Hilfsfunktion; Browser-Test: `document.title` je Bereich, Konto und „gibt es nicht“ ist „WohnWerk – <Bereich>“ |
| EC-3 | Automatische Abmeldung fragt nicht | Sitzungswächter ruft „ohne Rückfrage verlassen“, bevor er umleitet | Komponententest Sitzungswächter + Wächter |
| EC-4 | Breitenwechsel ohne Neuladen, Eingaben bleiben | Umschalten nur über CSS-Breakpoints – der Inhalt wird **nicht** doppelt gezeichnet und nicht neu aufgebaut; Schublade schließt beim Wechsel auf Desktop | Browser-Test: Eingabe, Fenster verkleinern/vergrößern, Eingabe noch da |
| EC-9 | Mehrfachklick | Navigation zum selben Ziel, während sie läuft, wird ignoriert; laufende Aktion sperrt ihren Knopf | Komponententest |

**Fehlerarten an den Schnittstellen:**

| Art | Verhalten |
| --- | --- |
| Unbekannte Adresse / Datensatz fehlt | Auffang-Route bzw. das Feature meldet „nicht gefunden“ → Inhalt zeigt „Diese Seite gibt es nicht.“ mit [Zu den Wohnungen]. Features prüfen fremde/fehlende IDs gleich (RLS liefert nichts → „nicht gefunden“, nie „kein Zugriff“). |
| Nicht angemeldet | Unverändert PROJ-1: Anfrage-Grenze leitet auf `/anmelden?weiter=…` (AC-4, AC-8). |
| Unerwarteter Fehler im Bereich | Fehlergrenze zeigt das Meldungsfenster ohne technische Details; Fehler wird einmal protokolliert (Browser-Konsole bzw. Server-Protokoll; Fehler-Tracking kommt bei `/deploy`). „Erneut versuchen“ baut den Bereich neu auf und lädt seine Daten neu. |
| Fehler im Rahmen selbst (Layout) | Fällt auf die allgemeine Fehlerseite von Next.js zurück (`src/app/global-error.tsx`, gleiche Meldung „Hier ist etwas schiefgelaufen.“ mit [Neu laden]). |
| Keine Verbindung | Hinweis in der Statusleiste; Speichern scheitert im Feature mit dessen Meldung; kein automatischer Wiederholungsversuch. |
| Gerätespeicher gesperrt | Darstellung/Maximiert gelten nur für den Besuch, keine Meldung (EC-7). |

## Datenmodell

**Keine Datenbankänderung.** `docs/data-model.md` bleibt unverändert.

Gespeichert wird nur im Browser des Geräts, ohne Personenbezug:

```
Darstellung
- Ort: localStorage, Schlüssel „wohnwerk-darstellung“
- Wert: eines von light / dark / system; fehlt → system (AC-18)
- Gültig: bis der Nutzer die Browserdaten löscht

Fenster maximiert
- Ort: Cookie „wohnwerk-fenster“ (Pfad /, SameSite=Lax, Ablauf 1 Jahr)
- Wert: „1“ = maximiert; fehlt oder anderer Wert = mit Rand
- Gültig: 1 Jahr bzw. bis Browserdaten gelöscht; „Wiederherstellen“ löscht das Cookie
```

Beides ist eine vom Nutzer ausdrücklich gewählte Einstellung und damit für den gewünschten Dienst unbedingt erforderlich (keine Einwilligung nötig); `/dsgvo` trägt die zwei Einträge in `docs/privacy.md` nach.

**Version für „Über WohnWerk“** (beantwortet offene Frage 1 der Spec): das Feld `version` aus `package.json`, auf dem Server gelesen und als fertiger Text an den Dialog gegeben (nur die Versionsnummer gelangt in den Browser). `/deploy` hebt die Version beim Release an und setzt das gleichnamige Tag.

## Abläufe und Zugriff

Kein eigener Server-Zugriff. Alle Routen der Gruppe `(angemeldet)` – inklusive Auffang-Route – sind durch die Anfrage-Grenze aus PROJ-1 geschützt; der Rahmen zeigt nur Anzeigename bzw. E-Mail des **angemeldeten** Nutzers, die das Layout auf dem Server liest.

```
Bereich wählen (Liste, Menü, Schublade)
- Ist das die aktuelle Ansicht? → nichts tun (EC-1)
- Läuft schon eine Navigation dorthin? → nichts tun (EC-9)
- „ungespeichert“ gemeldet? → Dialog; Abbrechen → bleiben; Verwerfen → weiter
- Ziel sofort in Titelleiste/Auswahl, „Bitte warten…“ (AC-35) → Seite wechseln

Abmelden (Menü / Schublade)
- „ungespeichert“? → Dialog (EC-3: Verwerfen → abmelden)
- Abmelden-Action aus PROJ-1 → Anmeldefenster (AC-15)

Darstellung wählen → sofort umschalten, im Gerät merken, Menü markiert (AC-19)
Maximieren → sofort umschalten, Cookie setzen bzw. löschen (AC-3)
```

**Sicherheit (SEC-01/02/03/05/06):** Keine Geheimnisse, keine neuen Umgebungsvariablen. Der einzige Wert von außen ist das Cookie – der Server akzeptiert nur exakt `1`. Adressen enthalten nur Bereichsnamen und Datensatz-IDs, nie Namen oder andere personenbezogene Daten (Regel für PROJ-3 ff., in `docs/app-shell.md` vermerkt). Sicherheits-Header und Content-Security-Policy kommen bei `/deploy`; dann bekommt das kleine Darstellungs-Skript von `next-themes` die Nonce der Policy (der Baustein unterstützt das).

## Abhängigkeiten (Pakete)

- keine neuen Laufzeit-Pakete – `next-themes` und die shadcn-Bausteine `dropdown-menu`, `sheet`, `alert-dialog`, `dialog`, `progress`, `button`, `tooltip` sind vorhanden
- `@axe-core/playwright` (nur Entwicklung) – automatische Kontrastprüfung für AC-31 in beiden Darstellungen

## Einstellungen, die du selbst machst

Keine.

## Technische Entscheidungen

| Entscheidung | Begründung | Erwogene Alternative | Kompromiss | Datum |
| --- | --- | --- | --- | --- |
| Tab-Titel nur aus dem Verzeichnis (Bereichsbeschriftung), Detailname nur in der Titelleiste im Fenster (AC-36) | Datenschutzprüfung 2026-11-14: Browserverlauf und Synchronisierung sollen keine Mieternamen oder Anschriften enthalten | Detailname auch im Tab-Titel | Mehrere Tabs mit Details desselben Bereichs sind am Tab nicht unterscheidbar | 2026-11-14 |
| Rahmen als geteilter Baustein `src/components/rahmen/`, PROJ-1-Teile (Anzeigename, Abmelden) reicht das Layout hinein | Alle Bereichs-Features importieren die Rahmen-Schnittstelle; der Struktur-Check stellt sicher, dass der Rahmen nie von einem Feature abhängt | Ordner `src/features/rahmen/` | Rahmen-Code liegt nicht unter `src/features/`, obwohl er einem Feature (PROJ-2) gehört – in `docs/app-shell.md` vermerkt | 2026-11-08 |
| Festes Verzeichnis „gebaut ja/nein“ in `navigation.rules.ts`; jedes Feature schaltet seinen Eintrag beim `/build` frei | Einfach, prüfbar, ein Ort; ungebaute Adressen landen automatisch bei „gibt es nicht“ | Automatische Erkennung vorhandener Routen | Jedes Feature muss an die eine Zeile denken – wird Aufgabe in dessen `tasks.md` | 2026-11-08 |
| „Wohnungen“ ist ab PROJ-2 freigegeben und zeigt bis PROJ-3 eine Übergangsseite | Startseite (AC-5) muss erreichbar sein; ein ausgegrauter Startbereich mit „gibt es nicht“ wäre widersprüchlich | Wohnungen ausgegraut, Start auf `/konto` | Bis PROJ-3 zeigt der Startbereich nur einen Hinweis | 2026-11-08 |
| Darstellung mit dem vorhandenen `next-themes` (Klasse `dark` am Dokument) | Löst Wie System, Live-Folgen der Systemeinstellung und kein Aufblitzen fertig; schon installiert, auch im Anmeldefenster wirksam | Eigenes Skript + Cookie | `globals.css` muss Dunkelwerte an die Klasse binden; Skript braucht später die CSP-Nonce | 2026-11-08 |
| „Maximiert“ als Cookie statt localStorage | Der Server kennt den Zustand beim Zeichnen → kein Springen des Fensters nach dem Laden | localStorage | Cookie wird bei jeder Anfrage mitgeschickt (1 Byte Inhalt, kein Personenbezug) | 2026-11-08 |
| Menüleiste aus fünf einzelnen shadcn-Aufklappmenüs (`dropdown-menu`), nicht shadcn `menubar` | Spec verlangt Tab zwischen Menütiteln (AC-30); die Menubar erlaubt nur Pfeiltasten zwischen Titeln. Dropdown-Menü ist installiert, kann Untermenü und markierte Optionsgruppe (Darstellung) | shadcn `menubar` (neu zu installieren) | Kein Wechsel zum Nachbarmenü per Pfeiltaste (laut Spec nicht im Umfang) | 2026-11-08 |
| Bereichsliste als einfache Link-Liste + shadcn `sheet` für die Schublade, nicht shadcn `sidebar` | Die Sidebar ist am Bildschirmrand fixiert, hat Einklappen, Rail und Strg+B – das passt nicht in ein Fenster unter Titel- und Menüleiste; mit „nicht einklappbar“ verliert sie ihre Handy-Schublade | shadcn `sidebar` | Vier Links eigenes Markup (kein Nachbau eines shadcn-Bausteins, nur Liste) | 2026-11-08 |
| Desktop/Handy nur über CSS-Breakpoint `md`; Inhalt wird genau einmal gezeichnet | Breitenwechsel ohne Neuaufbau, Eingaben bleiben erhalten (EC-4) | Zwei getrennte Layouts per JavaScript | Etwas mehr Klassen im Fenster-Markup | 2026-11-08 |
| Zurück-Knopf bei „ungespeichert“: zusätzlicher Verlaufseintrag als Wächter | Der App Router hat keine eingebaute Navigationssperre; Next.js unterstützt eigene Verlaufseinträge offiziell | Browser-Navigations-API (noch nicht in allen Zielbrowsern verlässlich abbrechbar) | Nach dem Speichern bleibt evtl. ein doppelter Verlaufseintrag derselben Adresse (ein Zurück ohne sichtbare Wirkung). **Risiko:** fragilster Teil des Rahmens → Browser-Test in Chrome, Firefox und Safari Pflicht | 2026-11-08 |
| Statustext aus einer reinen Vorrangregel (Keine Verbindung > Laden > Bestätigung > Bereit) | Ein Ort, unit-testbar; EC-10 ergibt sich daraus | Zustände direkt in der Statusleiste verknüpfen | — | 2026-11-08 |
| Fehler- und Nicht-gefunden-Anzeige als `error.tsx` / `not-found.tsx` der Routengruppe plus Auffang-Route | Liegen innerhalb des Layouts → Leisten bleiben stehen (AC-10, AC-32) | Eigene Fehlerbehandlung je Feature | Auffang-Route muss die Anfrage-Grenze passieren (tut sie, da unter `(angemeldet)`) | 2026-11-08 |
| Sofortige Rückmeldung beim Bereichswechsel durch „angesteuertes Ziel“ im Rahmen-Kontext + `loading.tsx` | AC-35 verlangt < 0,5 s auch bei langsamem Netz; der Seitenwechsel selbst darf länger dauern | Nur auf Seitenwechsel warten | Kurzer Zwischenzustand, in dem Titel schon neu, Inhalt noch alt/leer ist | 2026-11-08 |
| Version aus `package.json`, auf dem Server gelesen | Ein Ort, `/deploy` pflegt ihn mit dem Release-Tag; nichts außer der Nummer gelangt in den Browser | Git-Commit von Vercel | Version ändert sich nur bei Releases, nicht je Commit | 2026-11-08 |
| Kontrastprüfung automatisch mit `@axe-core/playwright` | AC-31 messbar und wiederholbar in hell und dunkel | Manuell mit Browser-Werkzeugen | Eine Entwicklungs-Abhängigkeit mehr | 2026-11-08 |

Keine Entscheidung dieses Entwurfs ist projektweit *tragend* im Sinne von ADR-001; die Rahmen-Schnittstelle ist der wichtigste Vertrag mit späteren Features und steht deshalb in `docs/app-shell.md`.

## Offene Fragen

- keine

## Umsetzungsnotizen (`/build`, 2026-11-16)

Abweichungen und Ergänzungen gegenüber dem Entwurf – jeweils klein und begründet:

- **Zusätzliche Hilfsmodule im Rahmen:** `use-menues.ts` (eine gemeinsame Menü-Logik für Menüleiste und Schublade, damit beide dasselbe anbieten und tun) und `verlauf.ts` (markierte Verlaufseinträge, damit sich Wächter „ungespeichert“ und Schublade beim Zurück-Knopf nicht gegenseitig stören).
- **Rahmen-Schnittstelle um `useRahmenVorAbmelden` ergänzt** (nur für den Sitzungswächter, wie „ohne Rückfrage verlassen“): Das Abmelden aus dem Menü meldet sich weiterhin in den anderen Tabs ab (PROJ-1 EC-4), ohne dass der Rahmen Code aus dem Konto-Feature importiert.
- **Schublade und „Zurück“ (AC-25):** Die Schublade legt beim Öffnen einen eigenen Verlaufseintrag derselben Adresse an; „Zurück“ schließt sie. Ein gewählter Eintrag wird erst ausgeführt, wenn dieser Eintrag wieder entfernt ist.
- **Tab-Titel:** Weil das Wurzel-Layout jetzt „WohnWerk – “ voranstellt, setzen auch die abgemeldeten Seiten sowie Datenschutz und Impressum nur noch ihren eigenen Namen; die sichtbaren Tab-Titel sind unverändert. Unbekannte Adressen heißen „WohnWerk – Seite nicht gefunden“.
- **Unbekannte Adresse und Statuscode:** Die Seite „Diese Seite gibt es nicht.“ wird hinter dem Ladezustand gestreamt; der HTTP-Status ist dabei 200 (Next.js setzt `noindex`). Die Spec verlangt keinen Statuscode.
- **Kontoseite:** eingebettet ohne eigene Titelleiste; ihre eigene Statuszeile für Meldungen der Registerkarten bleibt wie in PROJ-1 bestehen.
- **Fehlergrenze:** nutzt `retry` von Next.js 16.3+ (lädt die Daten des Bereichs neu und baut ihn neu auf).
- **`AbmeldenKnopf` (PROJ-1)** wird vom Layout nicht mehr verwendet (Abmelden läuft über Menü und Schublade); Datei und Test bleiben vorerst liegen.
- **Browser-Tests:** zusätzlich `tests/anmelden.setup.ts`, `tests/rahmen.hilfen.ts`, Anpassung von `playwright.config.ts` (Projekte Chromium, Firefox, WebKit, Handy-Safari, „abmelden“ zuletzt) und `.gitignore` (`tests/.auth/`). Das CAPTCHA der Anmeldung läuft in einem von Playwright gesteuerten Browser nicht durch und wird für Tests nicht abgeschwächt: Vor einem Lauf meldet sich eine Person in einem normalen Chrome an, das Setup übernimmt nur die Sitzung (Ablauf im Kopf von `tests/anmelden.setup.ts`). Der letzte Test meldet das Testkonto ab; jeder vollständige Lauf braucht daher eine neue Anmeldung.
- **Parallelisierung:** Worktree-Isolation wird in diesem Arbeitsordner abgelehnt; alle `[P]`-Aufgaben wurden nacheinander gebaut.
- **Von den Browser-Tests gefundene und behobene Fehler:** (1) Nach „Zurück“ blieb ein altes Navigationsziel in Titelleiste und Auswahl stehen; (2) die Schublade schloss sich im Entwicklungsmodus sofort wieder. Beide haben einen Unit-Test, der vorher rot war.

- **Gemeinsame Zugangsprüfung (BUG-2, Freigabe des Nutzers 2026-11-16):** `src/features/konto/zugang.ts` (`zugangPruefen`: Sitzung, 30-Minuten-Inaktivität, zweiter Faktor) wird von Proxy, angemeldetem Layout und Kontoseite gemeinsam genutzt. Adressen, die der Proxy-Filter auslässt (Dateiendungen wie `/konto.png`), treffen damit auf dieselbe Prüfung. Der Filter selbst bleibt unverändert, damit Bilder aus `public/` ohne Anmeldung laden.
- **Titelleiste dunkel (BUG-3, Entscheidung des Nutzers 2026-11-16):** Verlaufsende `#4A78B8` → `#34609F` (mindestens 4,98:1 für den Titeltext); in `docs/design-system.md` nachgetragen, geprüft in `src/app/farben.test.ts`.
