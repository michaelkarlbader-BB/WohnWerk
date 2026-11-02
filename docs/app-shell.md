# App-Rahmen & Navigation

> Die app-weite Übersicht über **den Rahmen, in dem jedes Feature angezeigt wird** – Navigation, Layout-Bereiche und die Muster, die jede Seite wiederholt.
>
> - Erstellt von `/init` (erster Gesamtentwurf), 2026-11-02.
> - Verfeinert von `/architecture`, sobald ein Feature entworfen wird.
> - **Flughöhe:** Struktur, nicht Gestaltung. Farben, Schrift und Bauteil-Stil stehen in `docs/design-system.md`; das Innere einer einzelnen Seite im `design.md` des jeweiligen Features.

## Verantwortliches Feature

Owner: **PROJ-2 App-Rahmen & Navigation** – Änderungen am Rahmen laufen über `/refine PROJ-2`.

## Bereiche

| Bereich | Was der Nutzer dort tut | Sichtbar für | Feature |
|------|--------------------------|------------|----------------|
| Wohnungen (Startseite) | Liste aller Wohnungen, Details, Hausgeld, Abschreibungsplan | angemeldete Nutzer | PROJ-3, PROJ-4 |
| Mieter | Mieterliste und Kontaktdaten | angemeldete Nutzer | PROJ-5 |
| Mietverträge | Verträge, Mietbestandteile, Mietanpassungen | angemeldete Nutzer | PROJ-6, PROJ-7 |
| Darlehen | Darlehen, Tilgungsplan, Stichtage, Zuordnung zu Wohnungen | angemeldete Nutzer | PROJ-8, PROJ-9 |
| Extras → Export & Import | Sichern, Wiederherstellen, „Alle meine Daten löschen“ | angemeldete Nutzer | PROJ-10 |
| Extras → Konto | Passwort, Abmelden, Konto löschen | angemeldete Nutzer | PROJ-1 |

PROJ-11 (Wachhalter) hat keine Oberfläche. Spätere Dashboards (PROJ-14) erhalten eine neue Startseite „Übersicht“.

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
- **Laden:** Segment-Fortschrittsbalken in der Statusleiste plus „Bitte warten…“.
- **Leer:** grauer Hinweistext im Inhalt mit Button „Neu…“.
- **Fehler:** Meldungsfenster im Dialogstil; Feldfehler unter dem Feld.
- **Bestätigungen:** kurzer Text in der Statusleiste.
- **Löschen:** immer mit Rückfrage im Dialogfenster.

## Anmeldestatus

- **Abgemeldet:** nur ein Anmeldefenster mittig auf der Arbeitsfläche (Anmelden, Registrieren, Passwort vergessen); kein Menü, keine Bereiche.
- **Angemeldet:** alle Bereiche.
- **Rollen:** keine im MVP.

## Rahmen-Bausteine

_Wird von `/architecture` für PROJ-2 mit Dateipfaden gefüllt._

| Baustein | Datei | Zweck |
|-----------|------|---------|

---

_Lebendes Dokument. Wenn `/architecture` ein Feature entwirft, das einen Bereich, eine Layout-Region oder ein neues Seitenmuster hinzufügt, aktualisiert es zuerst diese Übersicht. Verhaltensänderungen am Rahmen laufen über `/refine PROJ-2`._
