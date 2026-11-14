# App-Rahmen & Navigation

> Die app-weite Übersicht über **den Rahmen, in dem jedes Feature angezeigt wird** – Navigation, Layout-Bereiche und die Muster, die jede Seite wiederholt.
>
> - Erstellt von `/init` (erster Gesamtentwurf), 2026-11-02.
> - Verfeinert von `/architecture`, sobald ein Feature entworfen wird.
> - **Flughöhe:** Struktur, nicht Gestaltung. Farben, Schrift und Bauteil-Stil stehen in `docs/design-system.md`; das Innere einer einzelnen Seite im `design.md` des jeweiligen Features.

## Verantwortliches Feature

Owner: **PROJ-2 App-Rahmen & Navigation** – Änderungen am Rahmen laufen über `/refine PROJ-2`.

## Bereiche

| Bereich | Adresse | Was der Nutzer dort tut | Sichtbar für | Feature |
|------|------|--------------------------|------------|----------------|
| Wohnungen (Startseite) | `/wohnungen` | Liste aller Wohnungen, Details, Hausgeld, Abschreibungsplan | angemeldete Nutzer | PROJ-3, PROJ-4 |
| Mieter | `/mieter` | Mieterliste und Kontaktdaten | angemeldete Nutzer | PROJ-5 |
| Mietverträge | `/mietvertraege` | Verträge, Mietbestandteile, Mietanpassungen | angemeldete Nutzer | PROJ-6, PROJ-7 |
| Darlehen | `/darlehen` | Darlehen, Tilgungsplan, Stichtage, Zuordnung zu Wohnungen | angemeldete Nutzer | PROJ-8, PROJ-9 |
| Extras → Export & Import | `/export-import` | Sichern, Wiederherstellen, „Alle meine Daten löschen“ | angemeldete Nutzer | PROJ-10 |
| Extras → Konto | `/konto` | Passwort, Abmelden, Konto löschen | angemeldete Nutzer | PROJ-1 |

Details liegen unter `/<bereich>/<id>` (nur Datensatz-ID in der Adresse, nie Namen oder andere personenbezogene Daten). Der Browser-Tab-Titel ist immer nur „WohnWerk – <Bereich>“ aus dem Verzeichnis – Detailnamen (z. B. Mieter, Anschrift) erscheinen nur in der Titelleiste im Fenster (PROJ-2 AC-36). Ob ein Bereich schon gebaut ist (sonst ausgegraut), steht im Verzeichnis `src/components/rahmen/navigation.rules.ts`; jedes Feature schaltet seinen Eintrag beim eigenen `/build` frei. Bis PROJ-3 zeigt `/wohnungen` eine Übergangsseite.

PROJ-11 (Wachhalter) hat keine Oberfläche. Spätere Dashboards (PROJ-14) erhalten eine neue Startseite „Übersicht“.

**Menüleiste (PROJ-2):** Datei – Neu…, Abmelden · Bearbeiten – Bearbeiten…, Löschen… · Ansicht – die vier Bereiche, Aktualisieren, Darstellung ▸ Hell / Dunkel / Wie System · Extras – Export & Import…, Konto… · ? – Über WohnWerk, Datenschutz, Impressum. Am Handy dieselben Einträge in der Schublade.

## Layout-Bereiche

Ein Programmfenster auf der Arbeitsfläche (Desktop):

```
╔═ WohnWerk – Wohnungen ═════════════════════════════════╗  Titelleiste
║ Datei  Bearbeiten  Ansicht  Extras  ?                  ║  Menüleiste
║ [Neu] [Bearbeiten] [Löschen] │ [Aktualisieren]          ║  Werkzeugleiste (je Bereich)
║┌ Bereiche ──────┐┌──────────────────────────────────────┐║
║│ ▸ Wohnungen    ││  Inhalt des Bereichs                 │║
║│   Mieter       ││  (Liste oder Detail)                 │║
║│   Mietverträge ││                                      │║
║│   Darlehen     ││                                      │║
║└────────────────┘└──────────────────────────────────────┘║
║ Bereit                │ 4 Wohnungen │ angemeldet: …     ║  Statusleiste
╚════════════════════════════════════════════════════════╝
```

- **Titelleiste:** „WohnWerk – <Bereich>“.
- **Menüleiste:** Datei · Bearbeiten · Ansicht · Extras · ?
- **Werkzeugleiste:** Aktionen des aktuellen Bereichs (Neu, Bearbeiten, Löschen, Aktualisieren …).
- **Bereiche (links):** Navigation zwischen den Bereichen.
- **Inhalt (rechts):** die Oberfläche des Features.
- **Statusleiste:** Status-/Bestätigungstexte, Ladeanzeige, Anzahl, angemeldeter Nutzer.
- **Handy (unter `md`):** Fenster bildschirmfüllend, keine Arbeitsfläche; Menü-Button links in der Titelleiste öffnet Bereiche und Menüpunkte als Schublade von links; Werkzeugleiste mit großen Symbol-Buttons; Statusleiste einzeilig.

## Seitenmuster

- **Liste:** Tabelle aller Einträge; Werkzeugleiste mit Neu / Bearbeiten / Löschen; Doppelklick bzw. Tippen öffnet das Detail. Am Handy wird die Tabelle zur Kartenliste.
- **Detail:** Kopfzeile mit Name (z. B. „WE 03 – Musterstraße 5“) und Aktionen Speichern / Abbrechen; darunter **Registerkarten** (z. B. Wohnung: Allgemein · Kauf & AfA · Hausgeld · Abschreibungsplan · Verträge · Darlehen).
- **Laden:** Segment-Fortschrittsbalken in der Statusleiste plus „Bitte warten…“ – das Feature meldet Laden über die Rahmen-Schnittstelle, auch das Ende bei Fehlern.
- **Leer:** grauer Hinweistext im Inhalt mit Button „Neu…“.
- **Fehler:** Meldungsfenster im Dialogstil; Feldfehler unter dem Feld. Unerwartete Fehler fängt der Rahmen ab: Inhalt zeigt „Hier ist etwas schiefgelaufen.“ mit „Erneut versuchen“ / „Zu den Wohnungen“, Leisten bleiben bedienbar.
- **Nicht gefunden:** unbekannte Adresse oder fehlender/fremder Datensatz → „Diese Seite gibt es nicht.“ mit „Zu den Wohnungen“ im Inhalt (Features lösen dafür die Nicht-gefunden-Anzeige aus).
- **Bestätigungen:** kurzer Text in der Statusleiste, nach 10 s wieder „Bereit“.
- **Ungespeicherte Änderungen:** das Feature meldet „ungespeichert“; der Rahmen fragt bei Navigation, Zurück, Menüzielen und Abmelden nach („Verwerfen“ / „Abbrechen“). Links im Inhalt nutzen den geschützten Link des Rahmens.
- **Keine Verbindung:** Hinweis in der Statusleiste, kein Offline-Betrieb.
- **Löschen:** immer mit Rückfrage im Dialogfenster.
- **Darstellung:** Hell / Dunkel / Wie System je Gerät (gilt auch für das Anmeldefenster); Fenster maximiert je Gerät.

## Anmeldestatus

- **Abgemeldet:** nur ein Anmeldefenster mittig auf der Arbeitsfläche (Anmelden, Registrieren, Passwort vergessen); kein Menü, keine Bereiche.
- **Angemeldet:** alle Bereiche.
- **Rollen:** keine im MVP.

## Rahmen-Bausteine

Der Rahmen ist geteilter Code unter `src/components/rahmen/` (gehört PROJ-2; liegt nicht unter `src/features/`, damit alle Bereichs-Features ihn importieren dürfen und er selbst nie ein Feature importiert). Details: `features/PROJ-2-app-rahmen-navigation/design.md`.

| Baustein | Datei | Zweck |
|-----------|------|---------|
| Programmfenster + Leisten | `src/components/rahmen/` (programmfenster, menueleiste, werkzeugleiste, bereichsliste, statusleiste, schublade, ueber-dialog) | Der Rahmen um alle angemeldeten Seiten; eingehängt einmal im Layout `src/app/(angemeldet)/layout.tsx` – **nie** in einem Feature nachbauen |
| Rahmen-Schnittstelle | `src/components/rahmen/rahmen-kontext.tsx` | Was Features melden: **Bereich einrichten** (Aktionen neu/bearbeiten/löschen/aktualisieren je mit Funktion + verfügbar; optional Anzahl-Text, Detailtitel, ungespeichert), **Bestätigung** (Text), **Laden** (an/aus), **geschützter Link / geschützte Navigation**, **ohne Rückfrage verlassen** (nur Sitzungswächter) |
| Verzeichnis der Bereiche | `src/components/rahmen/navigation.rules.ts` | Bereiche und Menüziele mit Adresse und „gebaut“ – jedes Feature schaltet seinen Eintrag frei |
| Inhaltsmeldungen | `src/components/rahmen/inhalt-meldungen.tsx` | „Diese Seite gibt es nicht.“, „Hier ist etwas schiefgelaufen.“, Lade-Platzhalter |
| Darstellung | `src/components/rahmen/darstellung-anbieter.tsx` | Hell / Dunkel / Wie System (next-themes) für die ganze App |
| Fenster | `src/components/retro/window.tsx` | Titelleiste, Inhalt, optionale Statuszeile im Design-System-Stil – angelegt in PROJ-1, von PROJ-2 erweitert (Titelleisten-Knöpfe, Variante „eingebettet“ ohne eigene Titelleiste für Inhalte im Rahmen) |
| Sitzungswächter | `src/features/konto/components/` (Sitzungswächter) | Inaktivität (30 Min.) und Abmeldung in anderen Tabs – auf jeder angemeldeten Seite, angelegt in PROJ-1; ruft vor automatischer Abmeldung „ohne Rückfrage verlassen“ |
| Anfrage-Grenze | `src/proxy.ts` | Umleitung nicht angemeldeter Besucher auf `/anmelden?weiter=…` – PROJ-1 |

**Routengruppen:** `(abgemeldet)` – Anmelden, Registrieren, Passwort vergessen/neu (PROJ-1); `(angemeldet)` – Layout mit Rahmen, `loading.tsx`, `error.tsx`, `not-found.tsx`, Auffang-Route `[...pfad]` (PROJ-2), darunter je Bereich eine Route; ohne Anmeldung erreichbar außerdem `/auth/bestaetigen`, `/datenschutz`, `/impressum`.

---

_Lebendes Dokument. Wenn `/architecture` ein Feature entwirft, das einen Bereich, eine Layout-Region oder ein neues Seitenmuster hinzufügt, aktualisiert es zuerst diese Übersicht. Verhaltensänderungen am Rahmen laufen über `/refine PROJ-2`._
