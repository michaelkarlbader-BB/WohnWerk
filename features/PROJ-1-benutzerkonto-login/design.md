# PROJ-1 — Technischer Entwurf: Benutzerkonto & Login

> Der technische Entwurf (das WIE). Zwei Leser: der Product Owner (gibt frei) und `/build` (setzt danach um). Kein Code – aber umsetzungsgenau.
> Owner: `/architecture`. Der Vertrag (WAS) steht in `spec.md`; die Aufgabenliste in `tasks.md`.

## Überblick in einem Absatz

Supabase Auth verwaltet Konten, Passwörter, Sitzungen und 2FA. Alles, was Zugangsdaten prüft (Anmelden, Registrieren, Passwort vergessen, 2FA-Code, Konto löschen), läuft über **Server Actions** auf dem Server von WohnWerk – nie direkt aus dem Browser. Dort sitzt der Sperrzähler (5 Fehlversuche / 15 Minuten je E-Mail). Was niemand umgehen darf, steht zusätzlich **in der Datenbank selbst**: die Freigabeliste (Prüfung beim Anlegen eines Kontos), die Datentrennung (jede Tabelle sieht nur ihren Eigentümer) und bei aktiver 2FA die Pflicht zur zweiten Stufe. Ein CAPTCHA (Cloudflare Turnstile) prüft Supabase bei jeder Anmeldung, Registrierung und Passwort-Anfrage.

## Komponenten-Struktur

```
Abgemeldet: Arbeitsfläche (blau) mit einem Fenster in der Mitte
+-- Fenster „WohnWerk – Anmelden"          (/anmelden)
|   +-- E-Mail, Passwort, CAPTCHA, [Anmelden]
|   +-- Schritt 2 (nur bei 2FA): 6-stelliger Code, [Bestätigen]
|   +-- Links: Registrieren · Passwort vergessen
|   +-- Fußzeile: Datenschutz · Impressum
+-- Fenster „WohnWerk – Registrieren"      (/registrieren)
|   +-- E-Mail, Passwort, Passwort wiederholen, CAPTCHA, [Registrieren]
|   +-- Erfolgsmeldung „Bitte bestätige deine E-Mail-Adresse …"
+-- Fenster „Passwort vergessen"           (/passwort-vergessen)
+-- Fenster „Neues Passwort setzen"        (/passwort-neu, nur über Link aus der E-Mail)
+-- Meldungsfenster für Link-Fehler        (abgelaufen / benutzt → „Neuen Link anfordern")
+-- Seiten Datenschutz und Impressum       (/datenschutz, /impressum – Inhalt liefert der Betreiber)

Angemeldet
+-- Platzhalter-Bereich „Wohnungen"        (/wohnungen – leer, bis PROJ-2/PROJ-3 ihn ersetzen)
+-- Fenster „Konto"                        (/konto – später unter Extras → Konto im Rahmen von PROJ-2)
|   +-- Registerkarte „Allgemein": E-Mail, Anzeigename, Konto angelegt am, 2FA-Status (AC-18)
|   |   +-- Anzeigename ändern · E-Mail ändern
|   +-- Registerkarte „Sicherheit": Passwort ändern · 2FA einrichten / zweiter Authenticator / ausschalten
|   |   +-- Abmelden · Auf allen Geräten abmelden
|   +-- Registerkarte „Konto löschen": Hinweis, Passwort, ggf. 2FA-Code, Eingabe „LÖSCHEN", [Konto endgültig löschen]
+-- Sitzungswächter (unsichtbar, auf jeder angemeldeten Seite): Inaktivität und Abmeldung in anderen Tabs
```

Alle Fenster folgen `docs/design-system.md` (Titelleiste, 3D-Kanten, Gruppenrahmen, Radius 0) und `docs/app-shell.md` (Abgemeldet: nur Anmeldefenster auf der Arbeitsfläche). Bestätigungen erscheinen im Fenster als Statuszeile, Fehler unter dem Feld bzw. als Meldungsfenster.

## Code-Struktur

| Modul / Pfad | Aufgabe und Schnittstelle | Erlaubte Abhängigkeiten / genutzte Module |
| --- | --- | --- |
| `src/features/konto/konto.schema.ts` | Eingaberegeln: E-Mail (gültig, max. 254, kleingeschrieben), Passwort (12–72 Zeichen), Anzeigename (optional, max. 60), 2FA-Code (genau 6 Ziffern), Bestätigungstext „LÖSCHEN", interne Rücksprungadresse (nur Pfade, die mit `/` beginnen und kein `//` enthalten) | Zod |
| `src/features/konto/konto.rules.ts` | Reine Regeln: Sperrentscheidung aus Fehlversuch-Zeitpunkten (gesperrt ja/nein, gesperrt bis), Inaktivitätsentscheidung (letzte Aktivität + 30 Min.), Abbildung von Supabase-Fehlercodes auf die neutralen Meldungen der Spec | keine (Zeit wird übergeben) |
| `src/features/konto/konto.data.ts` | Serverseitiger Datenzugriff: Profil lesen/ändern, Fehlversuche prüfen/zählen/löschen, Freigabe prüfen, eigenes Konto löschen | `src/lib/supabase/server.ts`, `server-only` |
| `src/features/konto/mail.integration.ts` | Versand der drei App-eigenen Mails (AC-17 alte Adresse, AC-24 „bereits registriert", AC-27 Sicherheitshinweis) über die Brevo-API; deutsche Texte | Brevo-HTTP-API (fetch), `server-only` |
| `src/features/konto/auth.actions.ts` | Server Actions: anmelden, 2FA-Code prüfen, registrieren, Bestätigungsmail erneut senden, Passwort vergessen, neues Passwort setzen, abmelden, überall abmelden, Aktivität melden | schema, rules, data, mail.integration |
| `src/features/konto/konto.actions.ts` | Server Actions: Anzeigename ändern, E-Mail ändern, Passwort ändern, 2FA einrichten/bestätigen/zweiten Faktor hinzufügen/ausschalten, Konto löschen | schema, rules, data, mail.integration |
| `src/features/konto/components/*` | Fenster und Formulare (Anmelden, Registrieren, Passwort vergessen/neu, Konto mit drei Registerkarten), CAPTCHA-Feld, Sitzungswächter | shadcn/ui-Bausteine, `src/components/retro/*`, Actions |
| `src/components/retro/window.tsx` | Geteilter Fenster-Baustein (Titelleiste, Inhalt, optionale Statuszeile) im Stil des Design-Systems – erster Rahmen-Baustein, wird von PROJ-2 erweitert | shadcn/ui |
| `src/proxy.ts` | Anfrage-Grenze: Sitzung erneuern und am Auth-Server prüfen, Inaktivität (30 Min.) prüfen, nicht angemeldete Besucher auf `/anmelden?weiter=…` umleiten | `src/lib/supabase`, `konto.rules` |
| `src/app/(abgemeldet)/anmelden/page.tsx` usw. | Routen der abgemeldeten Fenster; `src/app/auth/bestaetigen/route.ts` verarbeitet die Links aus den Mails | Feature-Komponenten |
| `src/app/(angemeldet)/wohnungen/page.tsx`, `src/app/(angemeldet)/konto/page.tsx` | Platzhalter „Wohnungen" und Kontoseite | Feature-Komponenten |
| `src/app/datenschutz/page.tsx`, `src/app/impressum/page.tsx` | Statische Seiten; Platzhaltertext bis der Betreiber den Inhalt liefert | — |
| `src/app/globals.css`, `src/app/layout.tsx` | Design-System-Werte als Theme-Variablen (hell/dunkel), Systemschrift, `lang="de"` | — |
| `supabase/migrations/*` | Tabellen, Zugriffsregeln, Datenbankfunktionen, geplante Aufräum-Jobs (siehe Datenmodell) | — |
| `supabase/templates/*.html` | Deutsche Texte der Supabase-Mails (Bestätigung, Passwort zurücksetzen, E-Mail-Wechsel) zum Einfügen im Dashboard | — |

Tests liegen neben dem jeweiligen Modul (`*.test.ts`).

## Footprint

- **Code und Tests:** `src/features/konto/**`, `src/components/retro/window.tsx`, `src/proxy.ts`, Routen unter `src/app/(abgemeldet)/`, `src/app/(angemeldet)/`, `src/app/auth/bestaetigen/`, `src/app/datenschutz/`, `src/app/impressum/`; Theme in `src/app/globals.css`, `src/app/layout.tsx`
- **Migrationen, Tabellen, Zugriffsregeln:** Tabellen `profiles`, `registration_allowlist`, `login_attempts`; Funktionen „Freigabe prüfen beim Anlegen", „Profil anlegen", „Fehlversuche prüfen/zählen/löschen", „eigenes Konto löschen", „2FA-Stufe prüfen"; Aufräum-Jobs (pg_cron) für unbestätigte Registrierungen und alte Fehlversuche; Zugriffsregeln auf allen drei Tabellen
- **Umgebungsvariablen (nur Namen):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (vorhanden), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `BREVO_API_KEY`, `MAIL_FROM_ADDRESS`
- **Pakete:** `@marsidev/react-turnstile`
- **Anbindungen:** `src/proxy.ts` (neu), Routengruppen `(abgemeldet)` / `(angemeldet)`, Supabase Auth (E-Mail/Passwort, TOTP-MFA, Before-User-Created-Hook, CAPTCHA), Cloudflare Turnstile, Brevo (Mail-API), Supabase-Mailversand (Entwicklung) bzw. SMTP über Brevo (ab Go-live)

## Qualität und Fehlerverhalten

| AC/EC | Bedingung und Grenze | Mechanismus | Geplante Prüfung |
| --- | --- | --- | --- |
| AC-2 | Registrierung mit nicht freigegebener Adresse – auch direkt über die Supabase-Schnittstelle | Datenbank lehnt das Anlegen ab (Hook prüft Freigabeliste); Server Action zeigt die Einladungs-Meldung | Registrierung über Formular **und** direkter Aufruf mit dem öffentlichen Schlüssel → kein Konto |
| AC-7 | Browser geschlossen oder 30 Min. ohne Aktivität → abgemeldet | Sitzungs-Cookies ohne Ablaufdatum (verschwinden beim Schließen); Cookie „letzte Aktivität" wird bei jeder Anfrage und alle 5 Min. bei Tippen/Klicken aktualisiert; Proxy meldet nach > 30 Min. ab | Unit-Test der Inaktivitätsregel; Browser-Test mit vorgestellter Uhr |
| AC-10, EC-4 | Abmelden überall bzw. in anderem Tab | Globale Abmeldung beendet alle Sitzungen am Auth-Server; Proxy prüft die Sitzung bei jeder Anfrage am Auth-Server (nicht nur lokal); Tabs hören auf Abmelde-Ereignisse | Zwei Browser-Kontexte, Abmeldung in einem → nächste Aktion im anderen zeigt Anmeldefenster |
| AC-21 | A greift auf Daten von B zu, auch direkt mit dem öffentlichen Schlüssel | Zugriffsregeln (RLS) in der Datenbank: nur eigene Zeilen; bei eingerichteter 2FA nur mit zweiter Stufe | Zwei Testkonten, direkte Abfragen gegen jede Tabelle → leer bzw. abgelehnt |
| AC-22, EC-9 | ≥ 5 Fehlversuche je E-Mail in 15 Min. → 15 Min. Sperre, unabhängig von IP | Zähler in der Datenbank, vor jeder Prüfung abgefragt; zählt Passwort- und 2FA-Fehler | 6 falsche Versuche → 6. abgelehnt, auch mit richtigem Passwort; Versuche mit wechselnder IP |
| AC-23 | Ohne gültiges CAPTCHA keine Anmeldung/Registrierung/Passwort-Anfrage | Supabase prüft das Turnstile-Token selbst (Attack Protection) – auch bei direkten Aufrufen | Anfrage ohne Token → abgelehnt |
| AC-29, EC-5 | Nach Kontolöschung ist die Adresse nicht mehr freigegeben | „Eigenes Konto löschen" entfernt den Eintrag zur E-Mail des Kontos in derselben Transaktion | Testkonto löschen → Eintrag weg; erneute Registrierung → Einladungs-Meldung |
| AC-26 | Unbestätigt nach 7 Tagen gelöscht | Täglicher Datenbank-Job | Testkonto mit vordatiertem Anlagedatum, Job ausführen |
| EC-6 | Doppelklick | Buttons während der Anfrage gesperrt; Löschen und Registrieren sind wiederholbar ohne Doppelwirkung | Doppelte Anfrage → eine Wirkung |

**Fehlerarten an den Schnittstellen:**

| Art | Verhalten |
| --- | --- |
| Erwartete Ablehnung (Validierung, falsches Passwort, gesperrt, nicht freigegeben, Link abgelaufen) | Server Action gibt ein Ergebnis mit festem Code zurück; die Oberfläche zeigt die Meldung aus der Spec. Keine Ausnahme, kein Stacktrace. |
| Anmeldung verweigert / nicht angemeldet | Fail closed: Proxy leitet auf `/anmelden` um; Actions prüfen die Sitzung selbst nochmal. Meldungen verraten nie, ob ein Konto existiert (AC-6, AC-11, AC-24, EC-8). |
| Externer Dienst fällt aus (Supabase, Turnstile, Brevo) | Meldungsfenster „Der Dienst ist gerade nicht erreichbar. Bitte versuche es in einigen Minuten erneut." Kein automatischer Wiederholungsversuch bei Zugangsdaten. Ausfall von Brevo bei einer Benachrichtigungsmail blockiert die eigentliche Änderung nicht, wird aber protokolliert. |
| Unerwarteter Fehler | Fehlerseite im Meldungsfenster-Stil; ein Protokolleintrag ohne Passwort, Token oder vollständige E-Mail-Adresse. |

## Datenmodell

**Profil** (`profiles`) – eines je Konto
- ID – identisch mit der Konto-ID von Supabase Auth; wird gelöscht, wenn das Konto gelöscht wird
- Anzeigename – Text, optional, 1–60 Zeichen, führende/abschließende Leerzeichen entfernt
- Angelegt am, Geändert am – Zeitstempel
- Angelegt automatisch, sobald Supabase ein Konto anlegt (vor der Bestätigung; ein unbestätigtes Konto kann sich nicht anmelden)
- Zugriff: nur der Eigentümer liest und ändert sein Profil; Anlegen und Löschen nur durch die Datenbank selbst
- Aufbewahrung: bis zur Kontolöschung

**Freigabeliste** (`registration_allowlist`) – Betreiber-Daten
- E-Mail – Text, max. 254, kleingeschrieben gespeichert, eindeutig
- (kein Notizfeld – Datenminimierung, Entscheidung 2026-11-14)
- Angelegt am – Zeitstempel
- Zugriff: **kein** Zugriff aus der App, weder lesend noch schreibend; nur die Prüffunktion beim Anlegen eines Kontos liest sie; Pflege durch den Betreiber im Supabase-Dashboard (Table Editor)
- Aufbewahrung: bis der Betreiber den Eintrag entfernt **oder** der Nutzer mit dieser Adresse sein Konto löscht (AC-29 – „eigenes Konto löschen" entfernt den Eintrag zur aktuellen E-Mail des Kontos)

**Fehlversuch** (`login_attempts`)
- E-Mail-Schlüssel – Text, kleingeschrieben (auch für unbekannte Adressen, damit die Sperre nichts verrät)
- Art – eines von: Passwort, 2FA-Code
- Zeitpunkt – Zeitstempel
- Zugriff: kein direkter Zugriff aus der App; nur über drei Datenbankfunktionen: „ist gesperrt?" (liefert gesperrt ja/nein und gesperrt bis), „Fehlversuch zählen" (nur wenn nicht gesperrt), „Fehlversuche löschen" (nur für die eigene E-Mail des gerade angemeldeten Nutzers, also erst nach erfolgreicher Anmeldung)
- Aufbewahrung: täglicher Job löscht Einträge älter als 24 Stunden

**Sperrregel:** Gibt es für einen E-Mail-Schlüssel 5 oder mehr Fehlversuche in den letzten 15 Minuten, ist er gesperrt bis 15 Minuten nach dem jüngsten dieser Fehlversuche. Versuche während der Sperre werden abgelehnt und nicht gezählt. Eine erfolgreiche vollständige Anmeldung (inkl. 2FA) löscht die Fehlversuche.

**Von Supabase Auth verwaltet (keine eigene Tabelle):** E-Mail, Passwort-Hash, Bestätigungsstatus, Sitzungen, 2FA-Faktoren (max. 2 je Nutzer laut Spec-Entscheidung), Anmelde-Protokoll mit IP-Adressen.

**Regel für alle späteren Tabellen (ADR-001):** Jede Nutzertabelle hat eine Eigentümer-Spalte, die auf das Konto verweist und beim Löschen des Kontos mitgelöscht wird; Zugriffsregeln erlauben nur Zeilen des Eigentümers; hat der Nutzer 2FA eingerichtet, gelten sie nur mit zweiter Stufe. So erfüllt das Löschen des Kontos (AC-19) automatisch alle Features.

## Abläufe und Zugriff

```
Registrieren (Server Action)
- Eingaben prüfen (AC-3) → CAPTCHA-Token an Supabase weitergeben (AC-23)
- Supabase legt das Konto an; die Datenbank prüft dabei die Freigabeliste
  → nicht freigegeben: Ablehnung → Meldung „nur auf Einladung" (AC-2)
- Adresse existiert schon: Supabase antwortet wie bei Neuanlage →
  gleiche Erfolgsmeldung (AC-24) + App sendet „Du bist bereits registriert" an die Adresse
- Bestätigungsmail mit Link auf /auth/bestaetigen → Konto aktiv, angemeldet, weiter zu /wohnungen (AC-4)

Anmelden (Server Action)
- Eingaben prüfen → „ist gesperrt?" → gesperrt: Meldung mit Wartezeit (AC-22)
- Supabase-Anmeldung mit CAPTCHA-Token
  → falsch/unbekannt: Fehlversuch zählen, Meldung „E-Mail oder Passwort falsch." (AC-6)
  → nicht bestätigt: Hinweis + „Bestätigungs-E-Mail erneut senden" (EC-1)
  → richtig, ohne 2FA: Fehlversuche löschen, weiter zur Rücksprungadresse oder /wohnungen (AC-5, AC-8)
  → richtig, mit 2FA: Schritt 2 (Code) – Sitzung hat bis dahin nur Stufe 1 und sieht keine Daten
- 2FA-Code (Server Action): „ist gesperrt?" → Code prüfen → falsch: Fehlversuch zählen (AC-22)
  → richtig: Fehlversuche löschen, weiter (AC-13)

Passwort vergessen (Server Action, CAPTCHA) → immer dieselbe Meldung (AC-11);
  Link → /auth/bestaetigen → /passwort-neu → neues Passwort (12+ Zeichen) → AC-27-Mail

Konto (alle Actions verlangen eine angemeldete Sitzung, bei 2FA mit zweiter Stufe)
- Anzeigename ändern/leeren – nur eigenes Profil (AC-15)
- Passwort ändern – aktuelles Passwort wird über eine Anmeldeprüfung bestätigt (zählt als Versuch),
  neues ≥ 12 Zeichen (AC-16); danach Sicherheitsmail (AC-27)
- E-Mail ändern – Supabase sendet Bestätigungslink an die neue Adresse; App sendet Hinweis an die alte
  (AC-17); bereits vergebene Adresse → „Diese Adresse kann nicht verwendet werden." (EC-8);
  keine Prüfung der Freigabeliste (Hook greift nur beim Anlegen)
- 2FA einrichten – QR-Code anzeigen, erst mit gültigem Code aktiv (AC-12); zweiten Authenticator
  hinzufügen und 2FA ausschalten nur mit gültigem Code bzw. Sitzung der Stufe 2 (AC-14);
  max. 2 Authenticatoren; Ausschalten → Sicherheitsmail (AC-27)
- Abmelden (AC-9) · Überall abmelden: alle Sitzungen am Auth-Server beenden (AC-10)
- Konto löschen – „LÖSCHEN" exakt, Passwort per Anmeldeprüfung (zählt als Versuch), bei 2FA Code;
  dann Datenbankfunktion „eigenes Konto löschen" (löscht den Freigabelisten-Eintrag zur E-Mail
  des Kontos (AC-29) und das Konto, alles Abhängige folgt – in einem Schritt);
  abmelden → /anmelden (AC-19); jede falsche Angabe → nichts gelöscht (AC-20)

Nicht angemeldet → jede Seite außer den abgemeldeten Fenstern, /auth/bestaetigen,
  /datenschutz, /impressum leitet auf /anmelden?weiter=<Pfad> um (AC-8).
  „weiter" akzeptiert nur interne Pfade (Schutz vor Umleitung auf fremde Seiten).
```

**Links aus E-Mails** (Bestätigung, Passwort, E-Mail-Wechsel) zeigen auf `/auth/bestaetigen` mit einem einmaligen Token; ungültig oder abgelaufen → Meldungsfenster mit „Neuen Link anfordern" (EC-2). Tokens erscheinen nicht in Protokollen.

## Abhängigkeiten (Pakete)

- `@marsidev/react-turnstile` – bindet das Cloudflare-CAPTCHA als React-Baustein in die Formulare ein

Alles andere ist vorhanden (`@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, shadcn/ui). Der QR-Code für 2FA kommt fertig von Supabase.

## Einstellungen, die du selbst machst

| Einstellung | Wo | Wann | Wert | Warum | → AC |
| --- | --- | --- | --- | --- | --- |
| Turnstile-Widget anlegen | Cloudflare Dashboard → Turnstile → Add widget (Hostnamen `localhost` und `test.wohnwerk-mb.de`; für Prod `wohnwerk-mb.de`) | now | Modus „Managed"; Site Key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local` | CAPTCHA | AC-23 |
| CAPTCHA in Supabase einschalten | Supabase (Dev) → Authentication → Attack Protection → Enable Captcha protection | now | Anbieter Turnstile, Secret Key aus Cloudflare | Supabase prüft das Token selbst | AC-23 |
| E-Mail-Bestätigung an | Authentication → Sign In / Providers → Email | now | „Confirm email" an, „Secure email change" **aus** (die App benachrichtigt die alte Adresse selbst) | Konto erst nach Bestätigung; Verhalten aus AC-17 | AC-1, AC-17 |
| Mindestlänge Passwort | Authentication → Sign In / Providers → Email | now | 12 Zeichen | zweite Prüfung neben der App | AC-3 |
| Site URL und Weiterleitungen | Authentication → URL Configuration | now | Site URL `http://localhost:3000`, Redirects `http://localhost:3000/auth/bestaetigen` und `https://test.wohnwerk-mb.de/auth/bestaetigen` (Testumgebung, nutzt das Dev-Projekt) | Links in Mails führen zur App | AC-4, AC-11 |
| Deutsche Mail-Vorlagen | Authentication → Emails → Templates (Confirm signup, Reset password, Change email address) | now | Texte aus `supabase/templates/` einfügen; Links auf `/auth/bestaetigen` | deutsche, als WohnWerk erkennbare Mails | AC-28 |
| Freigabe-Hook aktivieren | Authentication → Hooks → „Before User Created" → Postgres-Funktion aus der Migration | now | eingeschaltet | Freigabeliste nicht umgehbar | AC-2 |
| Eigene Adresse freigeben | Table Editor → `registration_allowlist` → Insert row | now | deine E-Mail-Adresse (+ ggf. Testadresse) | sonst kannst du dich nicht registrieren | AC-1 |
| Brevo-Konto und API-Schlüssel | brevo.com → kostenloses Konto → SMTP & API → API Keys; Absender unter Senders verifizieren | now | API-Schlüssel → `BREVO_API_KEY`, verifizierte Absenderadresse → `MAIL_FROM_ADDRESS` in `.env.local` | App-eigene Mails (alte Adresse, „bereits registriert", Sicherheitshinweis) | AC-17, AC-24, AC-27 |
| AVV abschließen | Supabase → Organization Settings → Legal Documents; Brevo → Konto → DPA; Cloudflare → DPA | now | annehmen | Datenschutz (`docs/privacy.md`) | — |
| Eigene Domain + SMTP | Domain `wohnwerk-mb.de` (vorhanden); bei Brevo Domain verifizieren (DNS: SPF, DKIM, DMARC); Supabase (Prod) → Authentication → Emails → SMTP Settings mit Brevo-SMTP | go-live | Absender z. B. `noreply@wohnwerk-mb.de` | Supabase-Testversand ist auf wenige Mails/Stunde und Team-Adressen begrenzt | AC-28 |
| Alle obigen Auth-Einstellungen im Prod-Projekt wiederholen | Supabase (Prod) – gleiche Pfade; Site URL = Produktiv-URL; Turnstile-Hostname = `wohnwerk-mb.de` | go-live | wie oben | Einstellungen liegen je Projekt | alle |

Die Rate-Limits von Supabase (Authentication → Rate Limits) bleiben auf den Standardwerten. Die Sperre aus AC-22 regelt die App selbst.

## Technische Entscheidungen

| Entscheidung | Begründung | Erwogene Alternative | Kompromiss | Datum |
| --- | --- | --- | --- | --- |
| **ADR-001:** Datentrennung und Kontolöschung über die Datenbank: Eigentümer-Spalte mit Mitlöschen, nur-eigene-Zeilen-Regeln, bei 2FA zweite Stufe Pflicht – gilt für **alle** Features | Der öffentliche Supabase-Schlüssel steckt im Browser; nur Regeln in der Datenbank schützen auch bei direkten Aufrufen. Ohne die 2FA-Regel könnte jemand mit nur dem Passwort die Daten direkt abfragen. | Prüfung nur im App-Code | Jede neue Tabelle braucht die Regeln (Vorlage in ADR-001); *tragend* – nachträglich teuer zu ändern | 2026-11-08 |
| Alle Zugangsdaten-Prüfungen in Server Actions statt direkt im Browser | Nur so kann der Sperrzähler je E-Mail vor jeder Prüfung greifen; Passwörter verlassen das Formular nur per POST | Anmeldung direkt aus dem Browser | Etwas mehr Code auf dem Server | 2026-11-08 |
| Sperrzähler in einer Datenbanktabelle mit drei schmalen Funktionen | Kein zusätzlicher Dienst (kein Upstash), keine Kosten; App braucht keinen geheimen Admin-Schlüssel | Upstash Redis | Eine Datenbankabfrage mehr pro Anmeldung | 2026-11-08 |
| Kein Supabase-Admin-Schlüssel (service role) in der App | Weniger Geheimnisse, die geleakt werden können; Kontolöschung und Fehlversuche laufen über eng begrenzte Datenbankfunktionen | Admin-Schlüssel serverseitig | Funktionen müssen sorgfältig auf „nur eigenes Konto" begrenzt sein | 2026-11-08 |
| Freigabeliste per „Before User Created"-Hook in der Datenbank | Auch ein direkter Registrierungsaufruf mit dem öffentlichen Schlüssel wird abgelehnt | Prüfung nur in der Server Action | Hook muss im Dashboard eingeschaltet werden. Falls im Free-Tarif nicht verfügbar: gleiche Prüfung als Trigger beim Anlegen des Kontos | 2026-11-08 |
| CAPTCHA: Cloudflare Turnstile, geprüft von Supabase | Kostenlos, meist ohne Bilderrätsel, von Supabase direkt unterstützt; deckt auch direkte Aufrufe ab | hCaptcha | Cloudflare als weiterer Auftragsverarbeiter (US); Einwilligungsfrage offen beim Anwalt | 2026-11-08 |
| Restrisiko direkter Aufrufe: Wer die Supabase-Schnittstelle direkt anspricht, umgeht den E-Mail-Zähler der App | Jeder Passwort-Versuch braucht dort trotzdem ein gelöstes CAPTCHA, und Supabase begrenzt je IP; massenhaftes Raten bleibt praktisch unmöglich | Supabase-Hook für Passwortversuche | Der Hook ist nach aktuellem Stand nur in höheren Tarifen verfügbar → beim Wechsel auf Pro erneut prüfen | 2026-11-08 |
| Abmeldung beim Schließen des Browsers: Sitzungs-Cookies ohne Ablaufdatum; 30 Min. Inaktivität über ein eigenes Aktivitäts-Cookie im Proxy plus Aktivitätsmeldung alle 5 Min. beim Tippen | Die Supabase-Einstellung für Inaktivität gibt es nur im Pro-Tarif; Tippen ohne Speichern soll nicht abmelden | Supabase „Inactivity timeout" (Pro) | Etwas eigener Code; Refresh-Token bleibt serverseitig bis zur Abmeldung gültig, ist aber nach Schließen des Browsers nicht mehr im Browser | 2026-11-08 |
| Proxy prüft die Sitzung bei jeder Anfrage am Auth-Server | Nur so wirkt „Überall abmelden" sofort auf anderen Geräten | nur lokale Prüfung des Tokens | Ein kurzer Netzwerkaufruf pro Seitenaufruf | 2026-11-08 |
| Mailversand: Supabase-Testversand in der Entwicklung, Brevo (EU-Anbieter, kostenlos bis 300 Mails/Tag) für App-eigene Mails und ab Go-live als SMTP für alle Mails | Keine Domain vorhanden; Brevo hat Sitz in der EU (Frankreich) | Resend, Postmark | Ohne Domain landen App-Mails eventuell im Spam; Domain ist vor `/deploy` Pflicht | 2026-11-08 |
| Kontolöschung entfernt den Freigabelisten-Eintrag in der Funktion „eigenes Konto löschen" (AC-29); Freigabeliste ohne Notizfeld | Datenschutzprüfung 2026-11-14; Funktion läuft ohnehin mit erweiterten Rechten und ist auf das eigene Konto begrenzt – kein Zugriff der App auf die Liste nötig | Betreiber entfernt Einträge von Hand | Neuregistrierung nach Löschung braucht neue Freigabe | 2026-11-14 |
| Geplante Aufräum-Jobs mit pg_cron in der Datenbank | Läuft unabhängig von der App, auch im Free-Tarif | Vercel Cron | Läuft nur, solange das Projekt nicht pausiert (PROJ-11 Wachhalter) | 2026-11-08 |
| Erster geteilter Rahmen-Baustein `src/components/retro/window.tsx` und das Theme entstehen in PROJ-1 | PROJ-1 ist die erste Oberfläche; PROJ-2 übernimmt und erweitert statt neu zu bauen | Anmeldefenster ohne Retro-Stil bis PROJ-2 | PROJ-2 muss den Baustein übernehmen (in `docs/app-shell.md` vermerkt) | 2026-11-08 |

## Offene Fragen

- [ ] Ist der „Before User Created"-Hook im Free-Tarif verfügbar? Falls nicht: Trigger-Variante (siehe Entscheidungen) – klärt `/build` beim Einrichten.
- [ ] Inhalt von Datenschutzerklärung und Impressum – liefert der Betreiber (Generator oder Anwalt) vor dem ersten `/deploy`.

## Umsetzungsnotizen (`/build`, 2026-11-14/15)

- **Freigabeliste doppelt abgesichert:** Neben dem „Before User Created“-Hook erzwingt ein Trigger beim Anlegen eines Kontos die Freigabe. Ohne Freigabe entsteht so auch dann kein Konto, wenn der Hook im Dashboard nicht eingeschaltet ist.
- **CAPTCHA auch bei „Passwort ändern“ und „Konto löschen“:** Die Prüfung des aktuellen Passworts ist eine Anmeldung bei Supabase und verlangt bei eingeschaltetem CAPTCHA ein Token. Beide Formulare tragen deshalb ein CAPTCHA-Feld.
- **„Neues Passwort setzen“ mit 2FA:** Die Action verlangt bei eingerichteter 2FA zusätzlich einen Code, bevor sie das Passwort setzt. Gegen echte Konten noch nicht geprüft.
- **Mailvorlagen im Free-Tarif:** Supabase lehnt eigene Vorlagen ohne eigenen SMTP-Versand ab (`entitlement_required: auth.email_templates`). Die Vorlagen-Abschnitte in `supabase/config.toml` sind deshalb auskommentiert. Die Route `/auth/bestaetigen` erwartet die Links aus den eigenen Vorlagen (`token_hash` + `type`); mit den Standardvorlagen funktionieren Bestätigung, Passwort-Reset und E-Mail-Wechsel nicht. Offen: Brevo-SMTP schon im Dev-Projekt eintragen (T34 vorziehen) oder die Route zusätzlich auf die Standard-Links auslegen.
- **Sperre von außen auslösbar:** `login_fehlversuch_zaehlen` ist mit dem öffentlichen Schlüssel ohne CAPTCHA aufrufbar. Wer eine E-Mail-Adresse kennt, kann deren Anmeldung alle 15 Minuten erneut sperren. Folge der Entscheidung „kein Admin-Schlüssel in der App“; kein Zugriff auf Daten.
- **Angemeldete Nutzer** auf `/anmelden` oder `/registrieren` werden nach `/wohnungen` geleitet.
- **Datenbank geprüft:** 33 zurückgerollte SQL-Prüfungen gegen das Dev-Projekt (Freigabe, RLS mit zwei Konten, 2FA-Stufe, Sperre, Kontolöschung, 7-Tage-Aufräumen) bestanden am 2026-11-14.
- **Lint-Warnungen, bewusst nicht unterdrückt:** `window.location.assign` im Sitzungswächter (volle Navigation ist gewollt, damit der Proxy entscheidet) und `<img>` für den QR-Code (fertige Data-URI von Supabase).
- **Design-System-Werte unter 4,5:1, nicht geändert:** Titelleisten-Verlaufsende im Dunkelmodus (3,54:1), „Positiv“ auf Fensterfläche im Hellmodus (4,27:1).

## Umsetzungsnotizen – QA-Fixes (`/build`, 2026-11-15)

Behebt BUG-1 bis BUG-12 aus `qa-report.md`. Abweichungen vom Entwurf oben, mit Freigabe des Nutzers am 2026-11-15:

- **Server-Schlüssel für den Fehlversuchszähler (BUG-6, ersetzt die Notiz „Sperre von außen auslösbar“):** Die Zählerfunktionen verlangen einen eigenen, engen Schlüssel – in Supabase Vault unter dem Namen `login_sperre_schluessel` und als `LOGIN_SPERRE_SCHLUESSEL` in der Server-Umgebung. Kein Admin-Schlüssel: Er öffnet nur `login_versuch_beginnen` und `login_versuch_zuruecknehmen`. Fehlt er, lehnt die App jede Anmeldung mit „Dienst nicht erreichbar“ ab (fail closed). Die alten Funktionen `login_sperre_pruefen` und `login_fehlversuch_zaehlen` sind entfernt (Migration `20261115120000_konto_haertung.sql`).
- **Prüfen und Zählen in einem Schritt (BUG-10):** `login_versuch_beginnen` prüft die Sperre und zählt den Versuch sofort, serialisiert je E-Mail über einen Advisory Lock. Stimmen die Zugangsdaten oder fällt der Dienst aus, gibt die App den Versuch zurück. Die Sperrregel selbst ist unverändert. In der App kapselt `alsVersuch` (`konto.data.ts`) diesen Ablauf für alle vier Prüfstellen.
- **Konto löschen nur mit frischer Anmeldung (BUG-3):** `delete_own_account` verlangt im Token der aufrufenden Sitzung eine Passwort-Anmeldung, die höchstens 5 Minuten alt ist, und bei eingerichteter 2FA zusätzlich einen höchstens 5 Minuten alten Code. Die Action führt deshalb Passwortprüfung, Code-Prüfung und Löschung auf der frischen Einmal-Sitzung aus.
- **Passwortwechsel verlangt bei Supabase das aktuelle Passwort (BUG-3):** `require_current_password = true` in `supabase/config.toml`; `passwortAendern` gibt es als `current_password` mit. Sitzungen aus einem Wiederherstellungslink sind bei Supabase davon ausgenommen.
- **„Neues Passwort setzen“ nur aus dem Wiederherstellungslink (BUG-1):** Seite und Action prüfen die verifizierten Token-Claims (`getClaims`): Der `amr`-Claim muss `recovery` (oder `otp`) mit einem Zeitstempel von höchstens 15 Minuten enthalten. Eine normale Anmeldung reicht nicht mehr. Annahme: Supabase trägt nach `verifyOtp` mit Typ `recovery` eine dieser beiden Methoden ein – gegen ein echtes Konto noch nicht geprüft.
- **Abgelaufene Sitzung beim Speichern (BUG-7):** `mitSitzung` leitet bei „nicht angemeldet“ auf `/anmelden?weiter=<Herkunftsseite>` um, die Herkunftsseite kommt aus dem `Referer`. Die Referrer-Policy `strict-origin-when-cross-origin` liefert ihn bei gleicher Herkunft vollständig.
- **Sicherheits-Header (BUG-5):** in `next.config.ts` für alle Pfade, dazu `poweredByHeader: false`. Die CSP enthält vorerst nur `frame-ancestors`, `base-uri` und `object-src`. Eine Skript-CSP mit Nonces kommt später, zuerst als Report-Only.
- **Weitere Fixes:** Das 60-Sekunden-Mailfrequenzlimit wird bei Registrieren, „Bestätigung erneut senden“ und „Passwort vergessen“ wie Erfolg beantwortet (BUG-2). Die Mail „bereits registriert“ geht erst nach der Antwort raus, über `after()` (BUG-11). Die Passwortlänge zählt UTF-8-Bytes (BUG-12). Auth-Cookies sind in Produktion `Secure` (BUG-9). „Abmelden“ in der Statusleiste benachrichtigt die anderen Tabs (BUG-8).
- **Datenbank geprüft:** 11 zurückgerollte SQL-Prüfungen gegen das Dev-Projekt bestanden am 2026-11-15: ohne Schlüssel abgelehnt, sechster Versuch gesperrt, Rückgabe gibt einen Platz frei, falsche Art abgelehnt, Tabelle für anon gesperrt, alte Funktion entfernt, Löschen mit alter Sitzung bzw. altem Code abgelehnt, frisch gelöscht inkl. Freigabe-Eintrag. Das Skript liegt nicht im Repo. Gleichzeitige Versuche (der Advisory Lock) sind nur im Code belegt.

### Einstellungen, die du selbst machst (neu durch die QA-Fixes)

| Einstellung | Wo | Wann | Wert | → Bug/AC |
| --- | --- | --- | --- | --- |
| Server-Schlüssel erzeugen und hinterlegen | eigener Rechner: `openssl rand -hex 32` (oder ein Passwortmanager, mindestens 32 Zeichen) → Supabase (Dev) → SQL Editor: `select vault.create_secret('<wert>', 'login_sperre_schluessel');` → derselbe Wert als `LOGIN_SPERRE_SCHLUESSEL` in `.env.local` | now | zufällig, nur Server | BUG-6, AC-22 |
| Aktuelles Passwort beim Passwortwechsel verlangen | Supabase (Dev) → Authentication → Sign In / Providers → Email → Option zum aktuellen Passwort; alternativ `supabase config push` (der Wert steht in `config.toml`) | now | an | BUG-3, AC-16 |
| Beides im Prod-Projekt wiederholen | Supabase (Prod), eigener Schlüssel; Vercel-Umgebungsvariable `LOGIN_SPERRE_SCHLUESSEL` | go-live (`/deploy`, gehört zu T35) | eigener Wert je Projekt | BUG-3, BUG-6 |

### Ausnahmen nach SEC-08 (freigegeben vom Nutzer am 2026-11-15)

Diese Restrisiken lassen sich im Free-Tarif nicht an der Supabase-Schnittstelle durchsetzen. Sie gelten als bewusste Ausnahmen, nicht als offene Bugs.

| ID | Kontrolle | Restrisiko | Warum hingenommen | Erneut prüfen, wenn … |
| --- | --- | --- | --- | --- |
| EX-1 (BUG-4) | SEC-04, AC-22, EC-9 | 2FA-Codes, die direkt an `/auth/v1/factors/{id}/verify` gehen, sieht der Fehlversuchszähler der App nicht; es bleibt nur das IP-Limit von Supabase. Voraussetzung ist das Passwort (Sitzung der Stufe 1 mit CAPTCHA). | Der „MFA Verification Attempt“-Hook gibt es nur in höheren Tarifen. Der Anon-Schlüssel wird derzeit nicht an den Browser ausgeliefert. | Wechsel auf Supabase Pro/Team oder ein Feature liefert den Browser-Client aus |
| EX-2 (BUG-3, Rest) | SEC-03, AC-14, AC-27 | Mit einer übernommenen Sitzung der Stufe 2 lässt sich 2FA direkt bei Supabase ausschalten (unenroll), ohne Code und ohne Sicherheitsmail. | Supabase verlangt für unenroll nur eine Sitzung der Stufe 2; eine Datenbankprüfung ist dort nicht möglich. | wie EX-1 |
| EX-3 (BUG-3, Rest) | AC-27 | Wer das Passwort kennt, kann es direkt bei Supabase ändern, ohne dass die Sicherheitsmail der App kommt. | Die Supabase-eigene Benachrichtigung braucht im Free-Tarif eigenen SMTP-Versand (kommt mit T34) und wäre doppelt. | Brevo-SMTP aktiv (T34) oder Wechsel auf Pro |
