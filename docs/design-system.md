# Design-System – WohnWerk

> Stil: **„Klassisch grau“** – Büro-Software der frühen 2000er. Ruhig, seriös, dicht. Mit heutigen Anforderungen an Lesbarkeit, Tastaturbedienung und Handy.
> Freigegeben bei `/init` am 2026-11-02. `/build` wendet diese Werte an; Umsetzung über die Variablen der vorhandenen shadcn/ui-Bausteine in `src/app/globals.css` – keine Nachbauten.

## Farben

| Rolle | Hell | Dunkel | Verwendung |
|---|---|---|---|
| Fensterfläche | `#D4D0C8` | `#2E3036` | Fenster, Leisten, Buttons |
| Arbeitsfläche | `#3A5F8A` | `#1A1F29` | Hintergrund hinter dem Programmfenster (nur Desktop) |
| Eingabefeld / Tabelle | `#FBFBF8` | `#1E2025` | Felder, Tabelleninhalte |
| Text | `#1C1C1C` | `#E6E4DF` | Fließtext |
| Text gedämpft | `#4F4F4F` | `#A9A7A1` | Hilfetexte, Statusleiste |
| Primär (Titelleiste, Auswahl) | `#0A246A` → Verlauf `#3A6EA5` | `#2F5597` → `#4A78B8` | aktive Titelleiste, ausgewählte Zeile, Rahmen Primär-Button |
| Primär hover / aktiv / dezent | `#16348A` / `#061A50` / `#DCE4F2` | `#3A64AA` / `#24467F` / `#26324A` | Zustände, dezente Auswahl |
| Titelleiste inaktiv | `#808080` → `#C0C0C0` | `#4A4C52` → `#62646A` | Dialoge im Hintergrund |
| 3D-Licht / Schatten / Tiefschatten | `#FAFAF7` / `#808080` / `#404040` | `#4C4F57` / `#17181C` / `#0B0C0E` | plastische Kanten |
| Positiv | `#1E6B2E` | `#6BC07A` | Beträge > 0 |
| Negativ / Destruktiv | `#A4161A` | `#F07A7A` | Beträge < 0, Löschen, Fehler |
| Warnung | `#8A5A00` auf `#FFF4CC` | `#F2C14E` auf `#3A3220` | Hinweise (z. B. Abweichung Restschuld) |

Regeln: kein reines `#000`/`#fff` als Hinter- oder Vordergrund; Text mindestens **4,5:1** Kontrast in beiden Modi; Hell- und Dunkelmodus sind von Anfang an definiert.

## Typografie
- Schrift: `Tahoma, Verdana, "Segoe UI", sans-serif` – Systemschriften, keine Webschrift.
- Größen: 11 / **13 (Standard Desktop)** / 15 / 18 px. Auf dem Handy Eingabefelder mindestens **16 px**.
- Gewichte: normal für Text; **fett** für Titelleisten, Spaltenköpfe, Summen.
- Zahlen: `tabular-nums`, rechtsbündig, deutsches Format (`1.234,56 €`, Datum `TT.MM.JJJJ`).

## Radius, Abstände, Tiefe
- **Radius 0 überall** – eine Entscheidung, überall angewendet.
- Abstände im **4-px-Raster**, dicht. Auf dem Handy Klickflächen mindestens **44 px** hoch.
- **Kein Schattenwurf.** Tiefe nur über 3D-Kanten: Buttons/Leisten erhaben, Felder/Tabellen eingelassen, gedrückte Buttons mit invertierten Kanten.

## Bauteil-Konventionen
- **Fenster:** Titelleiste (Verlauf, fetter Titel) → Menüleiste → Werkzeugleiste (Symbol-Buttons) → Inhalt → Statusleiste.
- **Buttons:** Höhe 23 px Desktop / 44 px Handy. Standard: grau, erhaben. Primär: zusätzlich dunkler Rahmen (klassischer „Standard-Button“). Destruktiv: Text in Negativ-Farbe.
- **Hover:** leicht aufgehellte Fläche. **Fokus:** gepunkteter Innenrahmen **plus** 2-px-Ring in Primärfarbe – auf jedem interaktiven Element sichtbar.
- **Formulare:** Beschriftung links (Desktop) bzw. oben (Handy); Feldhöhe 21 px Desktop / 44 px Handy; Gruppen in **Gruppenrahmen** mit Titel (z. B. „Kaufdaten“, „AfA“).
- **Tabellen:** Spaltenköpfe als erhabene Buttons, Gitterlinien, dezente Zebrastreifen, Auswahlzeile in Primärfarbe.
- **Leerzustand:** grauer Hinweistext im Inhaltsbereich (z. B. „Noch keine Wohnungen erfasst“) mit Button „Neue Wohnung…“.
- **Laden:** Segment-Fortschrittsbalken in der Statusleiste plus „Bitte warten…“.
- **Fehler:** Meldungsfenster im Dialogstil mit Symbol und Text; Feldfehler rot unter dem Feld.
- **Bestätigungen:** kurzer Text in der Statusleiste („Wohnung gespeichert.“) – keine eingeblendeten Benachrichtigungen.
