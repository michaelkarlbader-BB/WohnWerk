# Datenschutz-Protokoll – was WohnWerk mit personenbezogenen Daten macht

> Die ehrliche Übersicht, welche personenbezogenen Daten WohnWerk verarbeitet, wozu und wie lange.
>
> - Erstellt und aktuell gehalten von `/dsgvo`, ein Eintrag je Verarbeitungszweck.
> - Wächst mit dem Produkt: Ändert ein Feature, was gespeichert wird, ändert sich sein Eintrag.
> - **Flughöhe:** Zwecke, Rechtsgrundlagen, Aufbewahrung, wer die Daten noch sieht. Felddetails stehen in `docs/data-model.md` und den Feature-Designs.
>
> Entspricht weitgehend dem Verarbeitungsverzeichnis (Art. 30 DSGVO) – ist aber ein technisches Dokument, keine rechtliche Erklärung. Ein Anwalt oder Datenschutzberater hat das letzte Wort.

**Anwendbares Recht:** DSGVO (EU/DE) inkl. BDSG, TDDDG, DDG – Regeln in `docs/law/gdpr.md`
**Datenschutz-Stufe:** standard (`docs/PRD.md` → Rahmenbedingungen)
**Verantwortlicher:** Michael Bader (Privatperson), Anschrift: siehe Impressum – ändert sich bei gewerblichem Angebot
**Zuletzt geprüft:** 2026-11-08 (PROJ-1)

---

## Verarbeitungstätigkeiten

| Zweck | Daten | Wessen | Rechtsgrundlage | Aufbewahrung | Beteiligte Dienste |
|---------|------|-------|------------------|-----------|---------------------|
| Benutzerkonten betreiben (PROJ-1) | E-Mail-Adresse, Passwort-Hash, Anzeigename (optional), 2FA-Faktoren, Sitzungen | registrierte Nutzer | Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag) | bis zur Kontolöschung (sofort); unbestätigte Registrierungen nach 7 Tagen; Sitzung endet beim Schließen des Browsers bzw. nach 30 Min. Inaktivität (nur Sitzungs-Cookie, unbedingt erforderlich) | Supabase, Vercel |
| Freigabeliste für die Registrierung (PROJ-1) | E-Mail-Adressen eingeladener Personen | Eingeladene (noch keine Nutzer) | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: Zugang beschränken) | bis zur Entfernung durch den Betreiber; Pflege im Supabase-Dashboard | Supabase |
| Schutz vor Missbrauch der Anmeldung (PROJ-1) | Fehlversuche je E-Mail/IP, IP-Adresse, Geräte-/Browsersignale (CAPTCHA), Anmelde-Protokoll des Auth-Dienstes | alle, die Anmeldung/Registrierung aufrufen | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: Sicherheit, Art. 32) | Zähler kurzlebig (Sperrfenster); Auth-Protokoll: Dauer laut Supabase – **nicht ermittelt** | Supabase, CAPTCHA-Anbieter (Vorschlag: Cloudflare Turnstile) |
| E-Mails zum Konto versenden (PROJ-1) | E-Mail-Adresse, Link-Token | Nutzer, Eingeladene | Art. 6 Abs. 1 lit. b DSGVO | nur für den Versand | E-Mail-Versand-Dienst – **nicht ermittelt** (wird in `/architecture` PROJ-1 entschieden) |

## Besondere Kategorien (Art. 9 DSGVO)

- keine in PROJ-1. Hinweis für spätere Features: Mieterdaten sind personenbezogene Daten Dritter, aber nach aktuellem Stand keine besonderen Kategorien.

## Auftragsverarbeiter

| Dienst | Was er verarbeitet | Region | AVV abgeschlossen | Außerhalb angemessener Länder? |
|---------|-------------------|--------|------------------|----------------|
| Supabase | alle Anwendungsdaten, Auth | eu-central-1 (Frankfurt) | ☐ | US-Unternehmen, Hosting in der EU (EU-US DPF prüfen) |
| Vercel | Anfragen, Server-Logs (IP) | Funktionsregion **nicht ermittelt** (Vorschlag: fra1) | ☐ | US-Unternehmen (EU-US DPF prüfen) |
| CAPTCHA-Anbieter (Vorschlag: Cloudflare Turnstile) | IP, Browser-/Gerätesignale | global – **nicht ermittelt** | ☐ | US-Unternehmen (EU-US DPF prüfen) |
| E-Mail-Versand | E-Mail-Adresse, Mailinhalt | **nicht ermittelt** | ☐ | **nicht ermittelt** |

## Betroffenenrechte

| Recht | DSGVO | Wie WohnWerk es erfüllt |
|-------|------|------------------------------|
| Auskunft / Kopie | Art. 15 | Kontoeinstellungen zeigen alle gespeicherten Kontodaten (PROJ-1); Gesamtexport über PROJ-10; sonst per E-Mail an den Verantwortlichen, manuell |
| Berichtigung | Art. 16 | Anzeigename, E-Mail, Passwort selbst änderbar (PROJ-1) |
| Löschung | Art. 17 | „Konto löschen“ – sofort und endgültig (PROJ-1) |
| Datenübertragbarkeit | Art. 20 | JSON-/CSV-Export (PROJ-10) |
| Widerspruch | Art. 21 | gegen Sicherheitsmaßnahmen (lit. f) per E-Mail; zwingende Gründe für Missbrauchsschutz werden geprüft |

> Frist: **ein Kalendermonat** (Art. 12 Abs. 3 DSGVO), verlängerbar um zwei Monate bei komplexen Fällen, wenn die Person im ersten Monat informiert wird.

## Offene Punkte

- [ ] AVV mit Supabase abschließen (Dashboard → Legal/DPA)
- [ ] AVV mit Vercel abschließen; Funktionsregion auf Frankfurt (fra1) festlegen – bei `/deploy`
- [ ] CAPTCHA-Anbieter festlegen und AVV abschließen – `/architecture` PROJ-1
- [ ] E-Mail-Versand-Dienst festlegen (Supabase-Standardversand ist nicht für den Produktivbetrieb gedacht) und AVV abschließen – `/architecture` PROJ-1
- [ ] Aufbewahrungsdauer des Supabase-Auth-Protokolls (IP-Adressen) ermitteln und eintragen
- [ ] Datenschutzerklärung und Impressum erstellen (Generator oder Anwalt) – vor dem ersten `/deploy`
- [ ] Vor dem Angebot an Dritte: Rollenklärung für Mieterdaten (siehe Fragen unten)

## Für einen Anwalt / Datenschutzberater

- **Rollen bei Mieterdaten, sobald andere Vermieter WohnWerk nutzen:** Jeder Vermieter erfasst Daten seiner Mieter. Ist der Betreiber von WohnWerk dann Auftragsverarbeiter der Vermieter (mit AVV zwischen WohnWerk und jedem Nutzer, z. B. in den AGB) – und welche Pflichten folgen daraus für den Betreiber als Privatperson bzw. später als Unternehmen?
- **CAPTCHA ohne Einwilligung:** Cloudflare Turnstile wird auf Anmelde- und Registrierungsformularen geladen und verarbeitet IP- und Browsersignale. Reicht hier „unbedingt erforderlich“ nach § 25 Abs. 2 Nr. 2 TDDDG plus Information in der Datenschutzerklärung, oder ist eine Einwilligung nötig?
- **Impressumspflicht als Privatperson:** Ist für eine nur privat genutzte, aber öffentlich erreichbare Web-App mit Anmeldeseite ein Impressum nach DDG nötig – und ab wann (Einladung erster Testnutzer, gewerbliches Angebot)?
