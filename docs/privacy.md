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
**Zuletzt geprüft:** 2026-11-14 (PROJ-1 nach technischem Entwurf, PROJ-2)

---

## Verarbeitungstätigkeiten

| Zweck | Daten | Wessen | Rechtsgrundlage | Aufbewahrung | Beteiligte Dienste |
|---------|------|-------|------------------|-----------|---------------------|
| Benutzerkonten betreiben (PROJ-1) | E-Mail-Adresse, Passwort-Hash, Anzeigename (optional), 2FA-Faktoren, Sitzungen, Zeitpunkt der letzten Aktivität (Cookie) | registrierte Nutzer | Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag) | bis zur Kontolöschung (sofort); unbestätigte Registrierungen nach 7 Tagen; Sitzung endet beim Schließen des Browsers bzw. nach 30 Min. Inaktivität (Sitzungs-Cookies ohne Ablaufdatum plus Aktivitäts-Cookie – unbedingt erforderlich, siehe Gerätespeicher) | Supabase, Vercel |
| Freigabeliste für die Registrierung (PROJ-1) | E-Mail-Adressen eingeladener Personen, optionale Notiz des Betreibers (max. 200 Zeichen) | Eingeladene und Nutzer | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: Zugang beschränken) | bis zur Entfernung durch den Betreiber; Pflege im Supabase-Dashboard. **Offen:** bleibt nach einer Kontolöschung bisher stehen (siehe Offene Punkte) | Supabase |
| Schutz vor Missbrauch der Anmeldung (PROJ-1) | Fehlversuche je E-Mail-Adresse (auch unbekannte Adressen; Art und Zeitpunkt, **keine** IP in der eigenen Tabelle); IP-Adresse und Geräte-/Browsersignale beim CAPTCHA; Anmelde-Protokoll und IP-Ratenbegrenzung des Auth-Dienstes | alle, die Anmeldung/Registrierung aufrufen | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: Sicherheit, Art. 32) | Fehlversuche nach 24 h gelöscht; Auth-Protokoll: Dauer laut Supabase – **nicht ermittelt** | Supabase, Cloudflare Turnstile |
| E-Mails zum Konto versenden (PROJ-1) | E-Mail-Adresse, Link-Token, Mailinhalt (Bestätigung, Passwort, E-Mail-Wechsel, „bereits registriert“, Sicherheitshinweis) | Nutzer, Eingeladene | Art. 6 Abs. 1 lit. b DSGVO; Sicherheitshinweise zusätzlich Art. 32 | in WohnWerk nur für den Versand; Versandprotokolle beim Mail-Dienst – Dauer **nicht ermittelt** | Supabase (Entwicklung), Brevo (App-Mails; ab Go-live alle Mails) |
| Fehler protokollieren (PROJ-1, PROJ-2) | Fehlermeldung, Zeitpunkt, aufgerufene Adresse (nur Bereich + Datensatz-ID); **ohne** Passwort, Token, vollständige E-Mail-Adresse oder Eingabewerte | Nutzer | Art. 6 Abs. 1 lit. f DSGVO (Betrieb und Fehlerbehebung) | Server-Protokoll laut Vercel – **nicht ermittelt**; Fehler-Tracking-Dienst wird bei `/deploy` entschieden | Vercel |
| Darstellung und Fenstergröße merken (PROJ-2) | Hell/Dunkel/Wie System, Fenster maximiert ja/nein – kein Personenbezug im Wert | Nutzer des Geräts | kein personenbezogenes Datum im Wert; Zugriff auf das Endgerät nach § 25 Abs. 2 Nr. 2 TDDDG (vom Nutzer ausdrücklich gewählt) | bis der Nutzer die Browserdaten löscht bzw. 1 Jahr (Cookie); „Wiederherstellen“ löscht das Cookie | keine (nur im Browser) |

### Gerätespeicher (Cookies / localStorage, § 25 TDDDG)

Für die Datenschutzerklärung: WohnWerk setzt **keine** Analyse-, Werbe- oder Tracking-Cookies und lädt keine solchen Dienste. Deshalb ist kein Cookie-Banner vorgesehen.

| Name | Art | Zweck | Dauer | Gesetzt von | Einwilligung |
|------|-----|-------|-------|-------------|--------------|
| Supabase-Sitzungs-Cookies (`sb-…`) | Cookie | Anmeldung halten | bis zum Schließen des Browsers | PROJ-1 | nein – unbedingt erforderlich |
| Aktivitäts-Cookie (letzte Aktivität) | Cookie | Abmeldung nach 30 Min. Inaktivität | Sitzung | PROJ-1 | nein – unbedingt erforderlich (Sicherheit) |
| Cloudflare Turnstile | Skript/Browsersignale | CAPTCHA auf Anmelden, Registrieren, Passwort vergessen | laut Cloudflare – **nicht ermittelt** | PROJ-1 | Anwaltsfrage offen (siehe unten) |
| `wohnwerk-darstellung` | localStorage | Hell/Dunkel/Wie System | bis Browserdaten gelöscht | PROJ-2 | nein – vom Nutzer gewählte Einstellung |
| `wohnwerk-fenster` | Cookie | Fenster maximiert | 1 Jahr | PROJ-2 | nein – vom Nutzer gewählte Einstellung |

## Besondere Kategorien (Art. 9 DSGVO)

- keine in PROJ-1 und PROJ-2. Hinweis für spätere Features: Mieterdaten sind personenbezogene Daten Dritter, aber nach aktuellem Stand keine besonderen Kategorien.

## Auftragsverarbeiter

| Dienst | Was er verarbeitet | Region | AVV abgeschlossen | Außerhalb angemessener Länder? |
|---------|-------------------|--------|------------------|----------------|
| Supabase | alle Anwendungsdaten, Auth | Prod: eu-central-1 (Frankfurt); Dev/Test: eu-west-2 (London, nur Testdaten – UK-Angemessenheitsbeschluss) | ☐ | US-Unternehmen, Hosting in der EU (EU-US DPF prüfen) |
| Vercel | Anfragen, Server-Logs (IP, Adressen, Fehlermeldungen) | Funktionsregion **nicht ermittelt** (Vorschlag: fra1) | ☐ | US-Unternehmen (EU-US DPF prüfen) |
| Cloudflare Turnstile (CAPTCHA) | IP, Browser-/Gerätesignale | global – **nicht ermittelt** | ☐ | US-Unternehmen (EU-US DPF prüfen) |
| Brevo (E-Mail-Versand) | E-Mail-Adresse, Mailinhalt, Versandprotokolle (Aufbewahrung **nicht ermittelt**) | EU (Sitz Frankreich) – Rechenzentrum **nicht ermittelt** | ☐ | nein (EU-Unternehmen) |
| Supabase-Testversand (nur Entwicklung) | E-Mail-Adresse, Mailinhalt | wie Supabase | über Supabase-AVV | wie Supabase |

## Betroffenenrechte

| Recht | DSGVO | Wie WohnWerk es erfüllt |
|-------|------|------------------------------|
| Auskunft / Kopie | Art. 15 | Kontoeinstellungen zeigen alle gespeicherten Kontodaten (PROJ-1); Gesamtexport über PROJ-10; sonst per E-Mail an den Verantwortlichen, manuell |
| Berichtigung | Art. 16 | Anzeigename, E-Mail, Passwort selbst änderbar (PROJ-1) |
| Löschung | Art. 17 | „Konto löschen“ – sofort und endgültig (PROJ-1); Reste: Fehlversuche bis 24 h, Versand-/Auth-Protokolle der Dienstleister nach deren Fristen (**nicht ermittelt**); Freigabelisten-Eintrag siehe Offene Punkte. Gerätespeicher löscht der Nutzer über seinen Browser |
| Datenübertragbarkeit | Art. 20 | JSON-/CSV-Export (PROJ-10) |
| Widerspruch | Art. 21 | gegen Sicherheitsmaßnahmen (lit. f) per E-Mail; zwingende Gründe für Missbrauchsschutz werden geprüft |

> Frist: **ein Kalendermonat** (Art. 12 Abs. 3 DSGVO), verlängerbar um zwei Monate bei komplexen Fällen, wenn die Person im ersten Monat informiert wird.

## Offene Punkte

- [ ] AVV mit Supabase abschließen (Dashboard → Legal/DPA)
- [ ] AVV mit Vercel abschließen; Funktionsregion auf Frankfurt (fra1) festlegen – bei `/deploy`
- [ ] AVV mit Cloudflare (Turnstile) abschließen – entschieden in PROJ-1 design.md
- [ ] AVV mit Brevo abschließen; Versand-Domain `wohnwerk-mb.de` bei Brevo verifizieren (SPF, DKIM, DMARC) vor dem ersten `/deploy` – entschieden in PROJ-1 design.md
- [ ] Aufbewahrungsdauer des Supabase-Auth-Protokolls (IP-Adressen) ermitteln und eintragen
- [ ] Aufbewahrung der Brevo-Versandprotokolle und der Vercel-Server-Logs ermitteln und eintragen
- [ ] Freigabelisten-Eintrag bei Kontolöschung mitlöschen – **entschieden 2026-11-14**, Umsetzung per `/refine PROJ-1`
- [ ] Notizfeld der Freigabeliste streichen – **entschieden 2026-11-14**, Umsetzung per `/refine PROJ-1`
- [ ] Browser-Tab-Titel ohne Detailnamen – **entschieden 2026-11-14**, Umsetzung per `/refine PROJ-2` (die Kriterien zu Gerätespeicher und Protokollen hat der Product Owner nicht übernommen)
- [ ] Datenschutzerklärung muss die Tabelle „Gerätespeicher“ und Cloudflare/Brevo/Vercel/Supabase nennen
- [ ] Datenschutzerklärung und Impressum erstellen (Generator oder Anwalt) – vor dem ersten `/deploy`
- [ ] Vor dem Angebot an Dritte: Rollenklärung für Mieterdaten (siehe Fragen unten)

## Für einen Anwalt / Datenschutzberater

- **Rollen bei Mieterdaten, sobald andere Vermieter WohnWerk nutzen:** Jeder Vermieter erfasst Daten seiner Mieter. Ist der Betreiber von WohnWerk dann Auftragsverarbeiter der Vermieter (mit AVV zwischen WohnWerk und jedem Nutzer, z. B. in den AGB) – und welche Pflichten folgen daraus für den Betreiber als Privatperson bzw. später als Unternehmen?
- **CAPTCHA ohne Einwilligung:** Cloudflare Turnstile wird auf Anmelde- und Registrierungsformularen geladen und verarbeitet IP- und Browsersignale. Reicht hier „unbedingt erforderlich“ nach § 25 Abs. 2 Nr. 2 TDDDG plus Information in der Datenschutzerklärung, oder ist eine Einwilligung nötig? Kurz mitbestätigen lassen: Das 1-Jahres-Cookie für „Fenster maximiert“ und der localStorage-Eintrag für die Darstellung werden nur nach ausdrücklicher Wahl des Nutzers gesetzt – ebenfalls ohne Einwilligung zulässig?
- **Impressumspflicht als Privatperson:** Ist für eine nur privat genutzte, aber öffentlich erreichbare Web-App mit Anmeldeseite ein Impressum nach DDG nötig – und ab wann (Einladung erster Testnutzer, gewerbliches Angebot)?
