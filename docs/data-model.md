# Datenmodell

> Die app-weite Übersicht, **welche Daten das Produkt speichert und wie sie zusammenhängen** – der gemeinsame Bauplan, an dem sich die Tabellen jedes Features orientieren.
>
> - Erstellt von `/init` (erster Gesamtentwurf: Entitäten und Beziehungen), 2026-11-02.
> - Verfeinert von `/architecture`, sobald ein Feature entworfen wird.
> - **Flughöhe:** Entitäten, Beziehungen und Eigentum stehen hier (Produktebene). Spaltentypen, Indizes und konkrete Fremdschlüssel werden pro Feature in dessen `design.md` entschieden – nicht hier.

## Entitäten

| Entität | Was sie darstellt | Gehört / sichtbar für |
|--------|--------------------|---------------------------|
| Profil | Das Konto eines Vermieters (optionaler Anzeigename; Login-Daten verwaltet Supabase Auth) | nur der Nutzer selbst |
| Freigabeliste | E-Mail-Adressen, die sich registrieren dürfen (PROJ-1) | nur der Betreiber, im Supabase-Dashboard – kein Zugriff aus der App |
| Fehlversuch | Fehlgeschlagener Anmeldeversuch je E-Mail für die Sperre (PROJ-1), nach 24 h gelöscht | niemand direkt; nur Prüf-/Zählfunktionen |
| Wohnung | Eine vermietete Eigentumswohnung mit Objekt-, WEG-, Kauf- und AfA-Angaben (Bemessungsgrundlage, Modell, Sonder-AfA ja/nein); die WEG (Verwaltung, Wohnanlage) ist eine Angabe an der Wohnung, keine eigene Entität | der Eigentümer-Nutzer |
| Miteigentümer | Eine Person mit Eigentumsanteil an einer Wohnung (Name, %) – nur zur Information | über die Wohnung |
| Hausgeld-Eintrag | Hausgeld einer Wohnung ab einem Datum (umlagefähig / nicht umlagefähig) | über die Wohnung |
| Mieter | Eine Person mit Kontaktdaten | der Nutzer |
| Mietvertrag | Ein Vertrag über eine Wohnung mit Laufzeit, Vertragsart (Standard/Staffel/Index) und Kaution | über die Wohnung |
| Vertragspartei | Verknüpft einen Mieter mit einem Mietvertrag | über den Vertrag |
| Mietbestandteil | Ein Betrag eines Vertrags (Kaltmiete, BK-, HK-Vorauszahlung, Zuschlag) gültig ab einem Datum | über den Vertrag |
| Mietanpassung | Dokumentierte Änderung (Grund, Gültig ab, alter/neuer Betrag); vorab hinterlegte Staffeln sind geplante Anpassungen | über den Vertrag |
| Darlehen | Ein Kredit mit Bank, Betrag, Auszahlung, Zins, Rate und Zinsmethode; die Art des Verteilschlüssels (Fläche, Kaufpreis, fest) gilt je Darlehen | der Nutzer |
| Darlehensereignis | Sondertilgung, Zins- oder Ratenänderung ab einem Datum | über das Darlehen |
| Restschuld-Stichtag | Restschuld laut Bank zu einem Datum (Ankerpunkt) | über das Darlehen |
| Darlehenszuordnung | Verknüpft ein Darlehen mit einer Wohnung und ihrem Anteil | über das Darlehen |

**Berechnet, nicht gespeichert:** Abschreibungsplan, Tilgungsplan, aktuelle Restschuld, aktuelle Miete, aufgeteilte Zins-/Tilgungsbeträge je Wohnung – immer frisch aus den erfassten Daten.

**Später (PROJ-12 bis PROJ-17):** Bankkonto, Kontobuchung (Zuordnung verweist auf eine Wohnung), Betriebskostenabrechnung, Abo.

## Beziehungen

- Ein Profil besitzt viele Wohnungen, Mieter und Darlehen – alles hängt am Profil; jeder Nutzer sieht nur seine eigenen Daten. Wird das Konto gelöscht, wird alles Abhängige mitgelöscht; bei eingerichteter 2FA sind Daten nur mit zweiter Stufe sichtbar (ADR-001 in `docs/decisions.md`).
- Freigabeliste und Fehlversuche stehen für sich und verweisen auf kein Profil (sie betreffen auch Adressen ohne Konto). Löscht ein Nutzer sein Konto, wird der Freigabelisten-Eintrag seiner E-Mail-Adresse mitgelöscht (PROJ-1 AC-29).
- Eine Wohnung hat viele Hausgeld-Einträge, keinen oder mehrere Miteigentümer und über die Zeit viele Mietverträge (höchstens einer gleichzeitig aktiv).
- Ein Mietvertrag gehört zu genau einer Wohnung und hat einen oder mehrere Mieter (über Vertragspartei); ein Mieter kann über die Zeit mehrere Verträge haben.
- Ein Mietvertrag hat viele Mietbestandteile und Mietanpassungen; eine Anpassung erzeugt ab ihrem Datum einen neuen Wert des betroffenen Bestandteils.
- Ein Darlehen hat viele Ereignisse und Restschuld-Stichtage.
- Darlehen und Wohnungen sind **n:m** über die Darlehenszuordnung verbunden; die Anteile eines Darlehens ergeben zusammen 100 %.

## Diagramm

```
Profil
 ├─ Wohnung ──┬─ Hausgeld-Eintrag
 │            ├─ Miteigentümer
 │            └─ Mietvertrag ──┬─ Vertragspartei ── Mieter
 │                             ├─ Mietbestandteil
 │                             └─ Mietanpassung
 ├─ Mieter
 └─ Darlehen ─┬─ Darlehensereignis
              ├─ Restschuld-Stichtag
              └─ Darlehenszuordnung ── Wohnung
```

---

_Lebendes Dokument. Wenn `/architecture` ein Feature entwirft, das eine Entität einführt oder ändert, aktualisiert es zuerst diese Übersicht._
