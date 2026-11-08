# Projektweite Entscheidungen

> Entscheidungen, die mehrere Features betreffen. Feature-Entwürfe verlinken die ID, statt den Inhalt zu kopieren. Eine ersetzte Entscheidung bleibt mit Verweis auf ihre Nachfolgerin stehen.

## ADR-001 — Datentrennung, Kontolöschung und 2FA-Pflicht in der Datenbank

- **Status:** Accepted · **Datum:** 2026-11-08 · **Eingeführt durch:** PROJ-1 · **Gilt für:** alle Features mit Nutzerdaten (PROJ-3 bis PROJ-17)
- **Kontext:** Der öffentliche Supabase-Schlüssel steckt im Browser. Jeder kann damit die Datenbank-Schnittstelle direkt ansprechen. WohnWerk speichert Finanzdaten und personenbezogene Daten von Mietern und soll später mehrere Vermieter getrennt bedienen. Die Kontolöschung (PROJ-1 AC-19) muss alle Daten aller Features entfernen.
- **Entscheidung:**
  1. Jede Tabelle mit Nutzerdaten hat eine Eigentümer-Spalte, die auf das Konto verweist und beim Löschen des Kontos **mitgelöscht** wird (direkt oder über die übergeordnete Zeile, z. B. Mietbestandteil → Mietvertrag → Wohnung → Konto).
  2. Zugriffsregeln (Row Level Security) sind auf jeder Tabelle eingeschaltet und erlauben Lesen, Anlegen, Ändern und Löschen **nur für Zeilen des angemeldeten Eigentümers**.
  3. Hat der Nutzer 2FA eingerichtet, gelten die Regeln nur für Sitzungen **mit zweiter Stufe** (eine zusätzliche, einschränkende Regel je Tabelle).
  4. Die App nutzt keinen Supabase-Admin-Schlüssel; Sonderfälle laufen über eng begrenzte Datenbankfunktionen.
- **Alternativen:** Prüfung nur im App-Code (verworfen: direkt umgehbar); eigene Datenbank je Nutzer (verworfen: unverhältnismäßig für 1–20 Wohnungen je Nutzer).
- **Folgen:** Jede neue Tabelle braucht Eigentümer-Spalte, Mitlöschen und die zwei Regeln – `/architecture` nimmt sie in jeden Entwurf auf, `/qa` prüft sie mit zwei Testkonten und direkten Abfragen. Tabellen-übergreifende Prüfungen (z. B. Darlehenszuordnung nur zu eigenen Wohnungen) müssen beide Seiten auf denselben Eigentümer prüfen.
- **Tragend:** ja – nachträglich nur mit Migration aller Tabellen änderbar.
