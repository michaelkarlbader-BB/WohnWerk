# QA-Ergebnis – PROJ-1 Benutzerkonto & Login

**Geprüft:** 2026-11-15 (Nachprüfung; Erstlauf ebenfalls 2026-11-15, Commit 464379f)
**App-URL:** http://localhost:3000 (Dev-Server, angebunden an das Supabase-Dev-Projekt mit Testdaten)
**Prüfer:** QA Engineer (KI) – drei unabhängige `qa-engineer`-Läufe (Abnahme, Security, Regression) ohne Kenntnis des Builds, zusammengeführt von dieser Sitzung
**Umfang:** Re-Verifikation nach `fix(PROJ-1)` 3e91291 – volle Breite (drei Lanes), weil der Diff Auth, Proxy und eine Migration berührt

> **Diff-Scope:** `git diff --stat 464379f..HEAD` → 24 Dateien. Produktionscode:
> - `next.config.ts`
> - `src/app/(abgemeldet)/passwort-neu/page.tsx`
> - `src/app/(angemeldet)/layout.tsx`
> - `src/features/konto/auth.actions.ts`
> - `src/features/konto/konto.actions.ts`
> - `src/features/konto/konto.data.ts`
> - `src/features/konto/konto.rules.ts`
> - `src/features/konto/konto.schema.ts`
> - `src/features/konto/components/abmelden-knopf.tsx` (neu)
> - `src/lib/supabase/client.ts`
> - `src/lib/supabase/proxy.ts`
> - `supabase/config.toml`
> - `supabase/migrations/20261115120000_konto_haertung.sql`
>
> Laut `npx supabase migration list --remote` sind alle drei Migrationen im Dev-Projekt eingespielt.
>
> Legende:
> - `[x]` in diesem Lauf geprüft (mit Beleg)
> - `[ ] BUG` fehlerhaft
> - `[!] NOT VERIFIED` nicht prüfbar (mit Grund)
> - „übernommen“ heißt: Ergebnis aus dem Erstlauf, unverändert, weil der Diff die Stelle nicht berührt. In diesem Lauf nicht neu geprüft und nicht neu abgehakt.
>
> **Wichtigste Einschränkung (wie im Erstlauf):** Turnstile (AC-23) lässt sich ohne Browser nicht lösen. Deshalb gab es **kein Testkonto und keine angemeldete Sitzung**. Erfolgspfade von Anmeldung, Registrierung, Passwort-Reset und Konto-Aktionen sind zur Laufzeit `[!] NOT VERIFIED`. Server Actions wurden per `curl`/`fetch` mit `Next-Action`-Header aufgerufen.

## Status der Bugs aus dem Erstlauf

| Bug | Ergebnis dieses Laufs | Beleg (Sweep neu ausgeführt) |
|---|---|---|
| BUG-1 (High) | **Geschlossen** | Seite und Action verlangen einen `amr`-Eintrag `recovery`/`otp` von höchstens 15 Min. (`konto.data.ts:153-161`, `konto.rules.ts:48-62`). Laufzeit: `/passwort-neu` ohne Sitzung → 307 `/link-ungueltig?art=recovery`; `passwortNeuSetzen` → `nicht_angemeldet`. Sweep `updateUser(` → 3 Treffer, alle geschützt bzw. laut Spec erlaubt. Rest: BUG-18 |
| BUG-2 | **Geschlossen** | `verraetKonto` an `auth.actions.ts:241, 283, 310`. Die Sweep-Treffer `:247/:284/:311` sind nur hinter `!verraetKonto` erreichbar. Nebenwirkung: BUG-20 |
| BUG-3 | **Geschlossen** (mit Ausnahmen) | `delete_own_account` verlangt eine Passwort-Anmeldung von höchstens 5 Min., bei 2FA zusätzlich TOTP von höchstens 5 Min. (`20261115120000_konto_haertung.sql:148-166`). `passwortAendern` sendet `current_password` (`konto.actions.ts:273-276`). „Aktuelles Passwort verlangen“ ist im Dev-Projekt eingeschaltet, laut Bestätigung des Nutzers vom 2026-11-15. Restrisiken: EX-2/EX-3 in `design.md`; dazu BUG-19 und BUG-22 |
| BUG-4 | **Akzeptiert als Ausnahme EX-1** (freigegeben 2026-11-15) | Kein Code-Fix. Die Voraussetzung von EX-1 ist belegt: der Anon-Key wird nicht ausgeliefert (29 Client-Chunks, `.next/static`, `.next/dev/static` → 0 Treffer für Supabase-URL/JWT/`sb_publishable_`). `lib/supabase/client` wird nirgends importiert. Prüfauslöser beachten: sobald ein Feature den Browser-Client ausliefert, wird daraus wieder ein High-Bug (SEC-04) |
| BUG-5 | **Geschlossen** | Laufzeit: X-Frame-Options DENY, CSP `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy und HSTS auf 200, 307, 404 und Action-Antworten; `X-Powered-By` fehlt. Nebenwirkung: BUG-17 |
| BUG-6 | **Geschlossen** (Direktweg) | Zählerfunktionen nur mit Vault-Schlüssel (`haertung.sql:20-34, 58-60, 96-98`); alte Funktionen gedroppt (`:39-40`). Laufzeit: `anmelden` mit falschem Token → `captcha`, nicht `dienst` → Schlüssel und Vault im Dev-Projekt verdrahtet. Gleiche Klasse auf neuem Weg: BUG-13 |
| BUG-7 | **Geschlossen** (Code + Einzeltest) | `mitSitzung` leitet bei `nicht_angemeldet` auf `/anmelden?weiter=…` (`konto.actions.ts:90-123`), für alle 7 Konto-Actions. `npx vitest run src/features/konto/konto.actions.test.ts` → 77 bestanden. Laufzeit NOT VERIFIED (Action-IDs ohne Sitzung nicht im Manifest) |
| BUG-8 | **Geschlossen** (Code) | `abmelden-knopf.tsx:10` mit `meldeAbmeldung()`, eingebunden in `layout.tsx:53`. Sweep → 3/3 mit Benachrichtigung. Zwei Tabs: NOT VERIFIED (kein Browser) |
| BUG-9 | **Geschlossen** (Code + Unit-Test) | `src/lib/supabase/proxy.ts:16-27`, `client.ts:39`; `proxy.test.ts:277-284` grün. Produktion zur Laufzeit NOT VERIFIED |
| BUG-10 | **Geschlossen** (Code + Laufzeit) | `login_versuch_beginnen` unter `pg_advisory_xact_lock` (`haertung.sql:45-86`). Laufzeit: 10 bzw. 12 parallele Anfragen ergaben höchstens 5 Reservierungen. Sweep → 0. Nebenwirkung: BUG-13 |
| BUG-11 | **Geschlossen** (Code) | Mail „bereits registriert“ über `after()` (`auth.actions.ts:256-258`). Sweep `await sende` → nur noch `:361` (nicht kontoabhängig). Zeitmessung NOT VERIFIED |
| BUG-12 | **Geschlossen** (Laufzeit) | 36×„ä“ (72 Bytes) angenommen, 37×„ä“ (74 Bytes) und 73×„a“ abgelehnt. Nebenwirkung: BUG-21 |

## Abnahmekriterien

### Registrierung
#### AC-1 – Registrierung mit freigegebener Adresse, Bestätigungsmail
- übernommen: (Code) `signUp` mit `emailRedirectTo`; `enable_confirmations = true`; T17 abgehakt
- [!] NOT VERIFIED zur Laufzeit: braucht CAPTCHA, freigegebene Adresse und Postfach
- Siehe BUG-20: Beim stündlichen Mail-Limit erscheint fälschlich die Erfolgsmeldung

#### AC-2 – Nicht freigegebene Adresse wird abgelehnt
- übernommen: (Code) Hook, Trigger und Meldung, Unit-Test. Laufzeit NOT VERIFIED

#### AC-3 – Passwort unter 12 Zeichen abgelehnt
- [x] Laufzeit (`registrieren`, `passwortNeuSetzen`):
  - 11 Zeichen → „Das Passwort muss mindestens 12 Zeichen haben.“
  - 12 Zeichen → angenommen
  - 6 bzw. 5 Emojis (12 bzw. 10 UTF-16-Einheiten) → ebenfalls Mindestlängen-Meldung, keine Umgehung über Surrogatpaare
- [x] Höchstgrenze in Bytes (BUG-12 geschlossen), Meldung „Das Passwort ist zu lang: höchstens 72 Zeichen, Umlaute und Sonderzeichen zählen dabei mehrfach.“ – `konto.schema.ts:23-37`
- [x] QA-Unit-Tests: Byte-Grenze mit Emoji (18/19 × 4 Bytes), genau 72/73 Bytes gemischt, 12 Zeichen statt 12 Bytes – `konto.schema.test.ts` „Passwort-Bytegrenze (QA)“

#### AC-4 – Bestätigungslink aktiviert Konto, Weiterleitung „Wohnungen“
- [x] Laufzeit, Fehlerpfad: `/auth/bestaetigen?type=email&token_hash=abc` → 307 `/link-ungueltig?art=email`
- übernommen: (Code) Erfolgspfad; [!] NOT VERIFIED (echter Token)

### Anmelden und Sitzung
#### AC-5 – Anmeldung ohne 2FA → „Wohnungen“
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit (CAPTCHA)

#### AC-6 – Gleiche Meldung bei falschem Passwort und unbekannter Adresse
- [x] (Code) Abbildung unverändert – `konto.rules.ts:141-143`
- Siehe BUG-21: Ein vorhandenes Passwort über 72 Bytes ergibt „Bitte gib dein Passwort ein.“
- [!] NOT VERIFIED zur Laufzeit; Antwortzeit nicht gemessen

#### AC-7 – Abmeldung beim Schließen des Browsers bzw. nach 30 Min. Inaktivität
- [x] (Code) Auth-Cookies weiter ohne `maxAge`/`expires`, auch mit Secure-Zusatz – `src/lib/supabase/proxy.ts:21-26`
- [ ] BUG-14: Server Actions sind über Pfade mit Bildendung aufrufbar, dort läuft der Proxy nicht und die Inaktivität wird nicht geprüft. Gegenprobe des Owners: `POST /x.png` mit `Next-Action: 606258ee…` → Status 404, Body mit Action-Ergebnis
- [!] NOT VERIFIED: echtes Schließen des Browsers, vorgestellte Uhr

#### AC-8 – Umleitung zum Anmeldefenster und zurück
- [x] Laufzeit: `/wohnungen` → 307 `/anmelden?weiter=%2Fwohnungen`; `/konto?tab=sicherheit` → `weiter=%2Fkonto%3Ftab%3Dsicherheit`; `/gibtsnicht` → 307 (fail closed)
- [x] Laufzeit, offene Weiterleitung über `weiter=`: `//evil.com`, `https://evil.com`, `/\evil.com`, `/%09/evil.com`, `javascript:alert(1)`, `%2F%2Fevil.com`, `/"><script>` → alle `/wohnungen` bzw. intern normalisiert. Echtes CRLF wird abgewiesen – `konto.schema.ts:61`
- [!] NOT VERIFIED: Rückkehr nach erfolgreicher Anmeldung; Referer-Ziel in `zurAnmeldung` (`konto.actions.ts:90-103`) nur im Code

#### AC-9 – Abmelden
- [x] Laufzeit: `abmelden` → `x-action-redirect: /anmelden;push`, `ww-aktiv` gelöscht; Statusleiste nutzt jetzt `AbmeldenKnopf` (`layout.tsx:53`)
- [!] NOT VERIFIED: Abmelden einer echten Sitzung

#### AC-10 – Auf allen Geräten abmelden
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit

### Passwort vergessen
#### AC-11 – Immer dieselbe Meldung, Link nur bei bestehendem Konto
- [x] Laufzeit: falsches bzw. fehlendes CAPTCHA → `code: captcha`
- [x] (Code) Frequenzlimit neutral (BUG-2 geschlossen); nur eine Sitzung aus dem Wiederherstellungslink darf ein neues Passwort setzen (BUG-1 geschlossen)
- [x] QA-Unit-Tests: Wiederherstellungsfenster genau 15 Min. bzw. 15 Min. + 1 s, Uhrenabweichung 60/61 s, NaN/Infinity, fremde Link-Methoden, `null`-Einträge – `konto.rules.test.ts` „istFrischeWiederherstellung – Grenzen (QA)“
- [!] NOT VERIFIED:
  - ob GoTrue nach `verifyOtp(recovery)` tatsächlich `recovery`/`otp` in `amr` schreibt (auch laut `design.md` noch nicht gegen ein echtes Konto geprüft)
  - der Erfolgspfad
  - bei 2FA-Konten, ob „aktuelles Passwort verlangen“ die Recovery-Sitzung nach dem TOTP-Schritt noch freistellt
- Siehe BUG-18 (`otp` wird ebenfalls angenommen)

### Zwei-Faktor-Anmeldung
#### AC-12 – 2FA einrichten nur mit gültigem Code
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit

#### AC-13 – Bei 2FA zusätzlich der 6-stellige Code
- [x] Laufzeit: `zweiFaktorPruefen` ohne Sitzung → „Bitte melde dich erneut an.“; 5 Ziffern → „Der Code besteht aus 6 Ziffern.“
- [x] (Code) läuft jetzt über `alsVersuch` – `auth.actions.ts:131-158`
- [!] NOT VERIFIED: Anmeldung mit echtem Code

#### AC-14 – Zweiter Authenticator / 2FA ausschalten nur mit Code
- [x] (Code) `codePruefen` über `alsVersuch` – `konto.actions.ts:188-205`. Der direkte Weg über die API ist als EX-2 erfasst
- [!] NOT VERIFIED zur Laufzeit

### Kontoeinstellungen
#### AC-15 – Anzeigename ändern/leeren, Statusleiste
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit

#### AC-16 – Passwort ändern mit aktuellem Passwort
- [x] (Code) aktuelles Passwort über `frischAnmelden` (zählt als Versuch) plus `current_password` an Supabase – `konto.actions.ts:141-171, 266-276`
- [x] `/passwort-neu` mit normaler Sitzung gesperrt (BUG-1)
- „Aktuelles Passwort verlangen“ ist im Dev-Projekt eingeschaltet: laut Nutzer, 2026-11-15, für QA nicht einsehbar
- [!] NOT VERIFIED zur Laufzeit

#### AC-17 – E-Mail ändern
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit. Siehe BUG-14 (nach Inaktivität über den Umgehungspfad aufrufbar)

#### AC-18 – Kontoeinstellungen zeigen alle gespeicherten Daten
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit

### Konto löschen
#### AC-19 – Konto löschen mit Passwort (+ Code) und „LÖSCHEN“
- [x] (Code) Ablauf „LÖSCHEN“ → Passwort auf Einmal-Sitzung → Code auf derselben Sitzung → `delete_own_account(einmal)` → `signOut` → `/anmelden` – `konto.actions.ts:393-436`; Datenbank verlangt eine frische Passwort-Anmeldung und aal2 – `haertung.sql:148-166`
- [!] NOT VERIFIED zur Laufzeit. Echte GoTrue-`amr` mit Zeitstempel sind nur mit simulierten JWTs belegt; das Skript liegt nicht im Repo

#### AC-20 – Falsche Angabe → nichts gelöscht
- [x] (Code) Schema, Passwort- und Code-Prüfung brechen vor dem Löschen ab (`konto.actions.ts:398-418`). Ein direkter RPC-Aufruf mit alter Sitzung wird von der Datenbank abgelehnt (`haertung.sql:157-166`)
- Siehe BUG-19 (5-Minuten-Fenster nach der Anmeldung)

### Datentrennung
#### AC-21 – Kein Zugriff auf Daten anderer Nutzer
- übernommen: (Code) RLS unverändert
- [x] Neue Grants geprüft:
  - `login_versuch_*` nur mit Schlüssel (`haertung.sql:104-108`)
  - `delete_own_account` nur für authenticated (`:178-179`)
  - `private.*` revoke public; Schema `private` nicht über die API (`config.toml:14`)
- [!] NOT VERIFIED zur Laufzeit: zwei Konten, Anon-Key nicht verfügbar

### Schutz vor Missbrauch
#### AC-22 – Sperre nach 5 Fehlversuchen je E-Mail in 15 Min.
- [x] Laufzeit, Sperrmechanik: 10 parallele `anmelden`-Aufrufe → genau 5 reserviert, 5× „Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.“ (Lane 2); 12 parallele → höchstens 5 offen (Lane 1)
- [x] (Code) Prüfen und Zählen atomar (BUG-10), Zähler nur mit Server-Schlüssel (BUG-6)
- [ ] BUG-13: Die Sperre greift auch ohne einen einzigen echten Fehlversuch und ohne CAPTCHA, ausgelöst durch parallele, noch ungeprüfte Reservierungen
- Siehe BUG-15 (Supabase-IP-Limit wirkt global)

#### AC-23 – Ohne gültiges CAPTCHA keine Anfrage
- [x] Laufzeit: `anmelden`, `registrieren`, `passwortVergessen`, `bestaetigungErneutSenden` ohne Token → `code: captcha`; mit `XXXX` lehnt Supabase selbst ab (293–638 ms → Aufruf erreichte Supabase)

#### AC-24 – Bereits registrierte Adresse: gleiche Meldung + Mail an Inhaber
- [x] (Code) gleiche Erfolgsmeldung, Mail über `after()`, Frequenzlimit neutral – `auth.actions.ts:241, 252-259`
- [!] NOT VERIFIED: Mail-Empfang und Antwortzeit (CAPTCHA). Ein Restunterschied beim Versand auf Supabase-Seite ist möglich

### Datenschutz und E-Mails
#### AC-25 – Links zu Datenschutz und Impressum
- [x] Laufzeit: `/anmelden` enthält `href="/datenschutz"` und `href="/impressum"`, beide Seiten liefern 200
- [!] NOT VERIFIED: Menü „?“ gehört zu PROJ-2

#### AC-26 – Unbestätigte Registrierungen nach 7 Tagen gelöscht
- übernommen: (Code). [!] NOT VERIFIED (pg_cron im gehosteten Projekt nicht einsehbar)

#### AC-27 – Sicherheitsmail bei Passwortänderung und 2FA-Abschaltung
- [x] (Code) `konto.actions.ts:289`, `auth.actions.ts:361`. Der direkte Weg ohne Mail ist als EX-3 erfasst
- [!] NOT VERIFIED: Mail-Empfang

#### AC-28 – Mails auf Deutsch, als WohnWerk erkennbar
- übernommen: (Code). [!] NOT VERIFIED; Produktiv-SMTP ist go-live (T34/T35)

#### AC-29 – Kontolöschung entfernt Freigabe-Eintrag
- [x] (Code) Freigabe-Eintrag und Konto werden in derselben Funktion gelöscht – `haertung.sql:168-173`
- [!] NOT VERIFIED zur Laufzeit

## Sonderfälle

#### EC-1 – Unbestätigtes Konto: Hinweis + „erneut senden“
- [x] (Code) Resend bei Frequenzlimit neutral – `auth.actions.ts:283`
- [x] Laufzeit: falsches Token → `captcha`
- [!] NOT VERIFIED: Erfolgspfad

#### EC-2 – Abgelaufener/benutzter Link
- [x] Laufzeit: `/auth/bestaetigen?type=recovery&token_hash=abc` → 307 `/link-ungueltig?art=recovery`, `Cache-Control: no-store`
- [ ] BUG-17: `Referrer-Policy: no-referrer` der Route wird von der globalen Policy überschrieben

#### EC-3 – Sitzung während der Arbeit abgelaufen → Anmeldefenster
- [x] (Code + Einzeltest) BUG-7 geschlossen. Laufzeit NOT VERIFIED

#### EC-4 – Abmeldung in einem Tab → anderer Tab zeigt Anmeldefenster
- [x] (Code) BUG-8 geschlossen
- [!] NOT VERIFIED (kein Browser). Hinweis aus Lane 1: `meldeAbmeldung()` läuft vor dem Abschluss von `signOut`. Navigiert der andere Tab zu früh, landet er auf `/wohnungen`, und erst der nächste Klick führt zum Anmeldefenster. Das Muster ist schon älter (`konto-sicherheit.tsx`) und nicht belegt

#### EC-5 – Neuregistrierung nach Löschung braucht neue Freigabe
- [x] (Code) siehe AC-29. Laufzeit NOT VERIFIED

#### EC-6 – Mehrfachklick führt Aktion nur einmal aus
- [x] (Code, Garantie) Ein zweites `kontoLoeschen` findet keine Sitzung (`mitSitzung` leitet weiter) oder scheitert an `frischAnmelden`, gelöscht wird also höchstens einmal
- [!] NOT VERIFIED: Doppelklick im Browser

#### EC-7 – Beide Authenticatoren verloren
- [x] (Code) `passwortNeuSetzen` verlangt nach der Recovery-Prüfung weiter den zweiten Faktor

#### EC-8 – Neue E-Mail gehört einem anderen Konto
- übernommen: (Code). [!] NOT VERIFIED zur Laufzeit

#### EC-9 – Sperre an die E-Mail gebunden, nicht an die IP
- [x] (Code) Schlüssel allein `lower(btrim(email))` – `haertung.sql:53, 67`
- Der direkte TOTP-Weg ist als EX-1 akzeptiert (BUG-4)

## Security-Audit

Angewendete Kontrollen aus `docs/kit/guides/security.md`: SEC-01 bis SEC-06, SEC-08.

- [x] Authentifizierung umgehen:
  - `/`, `/wohnungen`, `/konto`, `/konto?tab=sicherheit`, `/api/foo`, `/robots.txt`, `/_next/static/../../konto` → 307 `/anmelden?weiter=…`
  - gefälschtes `sb-…-auth-token` → 307
  - `POST /konto` mit `Next-Action` → 307
  - `//evil.example` → 308 intern
- [ ] BUG-14: Server Actions über Pfade mit Bildendung, am Proxy vorbei (Gegenprobe des Owners, siehe AC-7)
- [x] CSRF: POST mit `Origin: https://evil.example` → 500 (Next lehnt ab)
- [!] Autorisierung über Nutzergrenzen: NOT VERIFIED zur Laufzeit (AC-21); RLS unverändert, neue Grants geprüft
- [x] Migration `20261115120000_konto_haertung.sql`, kritisch gelesen:
  - SECURITY DEFINER durchgehend mit `set search_path = ''` (`:20-25, 45-50, 89-93, 138-142`)
  - Vault-Prüfung fail closed (`konto.data.ts:72-76`), Mindestlänge 32
  - `auth.jwt()` ist durch PostgREST signaturgeprüft
  - unerwartete `amr`-Formen gelten als nicht frisch (`:124-132`)
- [x] Eingabe-Injection: `x' OR 1=1--@example.com`, `<script>alert(1)</script>@x.de`, `a@b.de'; drop table login_attempts;--` → von Zod abgelehnt; `o'brien@example.com` erreicht die RPC ohne Fehler (parametrisiert); 0× `dangerouslySetInnerHTML`/`innerHTML`/`eval(` in `src`
- [!] Rate Limiting auf gewöhnlichen Endpunkten: NOT VERIFIED, nicht implementiert (für das MVP optional); `grep -rniE "ratelimit|upstash" src package.json` → 0
- [x] Brute Force (App-Weg): Die Sperre greift zur Laufzeit bei 5 (Race-Test). Password Spraying: nur CAPTCHA und Freigabeliste. Direkter TOTP-Weg: EX-1
- [ ] BUG-13: Sperre ohne CAPTCHA auslösbar
- [ ] BUG-15: Per-IP-Limit von Supabase wirkt hinter dem Server global
- [x] Kontenausspähung über Meldungen (Code): AC-6, `verraetKonto` (AC-11/AC-24/EC-1), EC-8. Zeitverhalten NOT VERIFIED. Kleines Orakel: `gesperrt` kommt vor der CAPTCHA-Prüfung (Teil von BUG-13)
- [x] Keine Secrets im Client:
  - 28/29 Client-Chunks, `.next/static`, `.next/dev/static` → 0 Treffer für Supabase-URL, JWT, `sb_publishable_`/`sb_secret_`, `LOGIN_SPERRE`, `BREVO`/`xkeysib`, `TURNSTILE_SECRET`
  - einziger Treffer ist der öffentliche Turnstile-Site-Key
- [x] Keine Secrets in der Git-Historie des Diffs: `git log -p 464379f..HEAD` nach JWT-, `sb_secret`-, `xkeysib`- und 64-hex-Mustern → 0; getrackt nur `.env.local.example`
- [x] Sensible Daten in Antworten (unangemeldet): `anmelden`-Antwort ohne `supabase.co`, `eyJhbGci`, `sb_*`, `LOGIN_SPERRE`, kein `Set-Cookie`. Angemeldete Antworten: NOT VERIFIED
- [x] Zugangsdaten nie in der URL: SSR-Markup `method="POST"` mit `$ACTION_REF`; `grep -rn "<form" src --include=*.tsx` → 15, alle Server Actions
- [x] Sicherheits-Header (BUG-5 geschlossen); CSP ohne `script-src` stört Turnstile und Supabase nicht (kein `default-src`/`connect-src`/`frame-src`)
- [ ] BUG-17: route-eigene Referrer-Policy wird überschrieben
- [x] Cookies (Code): Secure in Produktion (BUG-9), `ww-aktiv` httpOnly, SameSite `lax`. Laufzeit in Produktion NOT VERIFIED
- [x] `[user]`-Aufgaben auf Zugangsdaten-Pfaden: T8–T11 und T16–T22 abgehakt
  - Neu aus `design.md:248-249`, ohne eigene Zeile in `tasks.md`:
    - Server-Schlüssel: zur Laufzeit als wirksam belegt
    - „aktuelles Passwort verlangen“: vom Nutzer am 2026-11-15 als eingeschaltet bestätigt
  - Fehlende Nachverfolgung → BUG-16
- [!] T34/T35: NOT VERIFIED, go-live, wird in `/deploy` gemacht und geprüft
- [x] SEC-08-Ausnahmen EX-1 bis EX-3 (`design.md:252-260`): Kontroll-ID, Restrisiko, Grund, Freigabe und Prüfauslöser vorhanden
- [ ] BUG-22: Ausgleichsmaßnahme fehlt, und EX-3 beschreibt das Risiko zu klein (siehe dort)

## Regression

- [x] Testsuite einmal vor den Lanes: `npm test` → 12 Dateien, 449 Tests bestanden, 0 fehlgeschlagen (Vitest 4.1.12; Log `…/scratchpad/suite-run.log`)
- [x] Keine abgeschwächten Prüfungen:
  - `git diff 464379f..HEAD -- vitest.config.* eslint.config.* tsconfig.json package.json` ist leer
  - 0× `.skip/.only/.todo` in den Test-Diffs
  - 0× `eslint-disable`/`@ts-ignore`/`as any` im Produktions-Diff
  - Entfernte Assertions sind Umbenennungen (`sperreLesen`/`fehlversuchZaehlen` → `alsVersuch`) bzw. strengere Prüfungen (Redirect statt Meldung)
  - Inhaltlich umgedreht wurde nur `over_email_send_rate_limit` → neutral, gewollt durch BUG-2
- [x] `npm run typecheck` → Exit 0
- [x] `npm run lint` → 0 Fehler, 2 Warnungen wie im Erstlauf
- [x] `npm run check:structure` → „117 modules scanned, 0 errors“
- [x] Produktions-Build: `npm run build` → Exit 0, 12 Routen plus Proxy (Log `…/scratchpad/build.log`)
- [x] Laufzeit-Routen:
  - Alle öffentlichen Seiten liefern 200 mit korrektem Titel und Überschrift
  - geschützte Seiten → 307 mit `weiter`
  - `/passwort-neu` ohne Sitzung → 307 `/link-ungueltig?art=recovery`
  - Formulare ohne JavaScript absendbar (multipart-POST → Meldung `role="alert"`)
- [x] Geteilte Bausteine:
  - Browser-Client wird nicht importiert (einziger Import `client.test.ts:19`)
  - `AbmeldenKnopf` ist eine Server-Action-Form
  - öffentliche Pfade im Proxy decken sich mit `docs/app-shell.md:91`
  - gedroppte Funktionen werden nirgends mehr aufgerufen
- [x] Keine Feature-Regression möglich: kein Feature hat Status „Deployed“
- [!] Migrations-Round-Trip (lokal zurücksetzen und neu einspielen): NOT VERIFIED, weil Docker nicht läuft. Belegt ist nur das Einspielen im Dev-Projekt (`supabase migration list --remote`)
- [!] Angemeldete Seiten (`/wohnungen`, `/konto`, Statusleiste) rendern: NOT VERIFIED, keine Sitzung

## Unit-Tests (von `/qa` ergänzt)

- `src/features/konto/konto.rules.test.ts` → neuer Block „istFrischeWiederherstellung – Grenzen (QA)“, 11 Tests:
  - genau 15 Min. bzw. 15 Min. + 1 s
  - Uhrenabweichung 60/61 s
  - NaN/Infinity
  - die Methoden `magiclink`, `email/signup`, `invite`, `email_change`, `oauth`, `RECOVERY` werden abgelehnt
  - `null`-Einträge
- `src/features/konto/konto.schema.test.ts` → neuer Block „Passwort-Bytegrenze (QA)“, 3 Tests: Emoji zählt 4 Bytes, genau 72/73 Bytes für neues und vorhandenes Passwort, Mindestlänge in Zeichen
- `npx vitest run src/features/konto/konto.rules.test.ts src/features/konto/konto.schema.test.ts` → 194 bestanden
- Rot-Nachweis je Datei: Alle Erwartungen der neuen Blöcke wurden in temporären Kopien umgekehrt (`toBe(true)` ↔ `toBe(false)`). Ergebnis: 14 von 14 Tests rot, Kopien gelöscht, Originale grün. Der Quellcode wurde nicht verändert, weil die Lanes parallel gegen den laufenden Server prüften.

## E2E-Tests
_Optionale Ebene – schreibt `/e2e-tests` für kritische Kernabläufe._

- Status: **nicht ausgeführt** (keine Suite vorhanden, `tests/` existiert nicht)

## Nicht geprüft in diesem Lauf

- [!] **Alles mit echter Anmeldung, Registrierung, Passwort-Reset oder Sitzung:** AC-1, AC-4, AC-5, AC-10 bis AC-22 zur Laufzeit, EC-1, EC-3, EC-5, EC-8. Grund: Turnstile ohne Browser nicht lösbar, keine echten Konten im gehosteten Projekt
- [!] **`amr`-Inhalt echter Tokens** (Recovery für BUG-1/AC-11; Passwort/TOTP für AC-19/AC-20). Die 11 SQL-Prüfungen aus `design.md` liegen nicht im Repo
- [!] **AC-21 mit zwei Konten** und direkte Supabase-Aufrufe (REST, RPC, GoTrue), darunter „alte Funktionen weg“, „ohne Schlüssel abgewiesen“ und BUG-19. Grund: kein Anon-Key, `.env*` nicht gelesen
- [!] **Mail-Empfang und -Sprache** (AC-1, AC-17, AC-24, AC-27, AC-28)
- [!] **AC-26:** pg_cron nicht einsehbar
- [!] **Browser-Verhalten:** AC-7, AC-10, EC-3, EC-4, EC-6 (Schließen, Uhr, zwei Tabs, Doppelklick); Turnstile-Widget rendert; Cross-Browser; Responsive (375/768/1440 px); Konsole/CSP-Verstöße
- [!] **Antwortzeit-Gleichheit** (AC-6, AC-11, AC-24, BUG-11)
- [!] **Provider-Einstellungen (Dev), nicht einsehbar:**
  - Authentication → Sign In / Providers → Email: „aktuelles Passwort verlangen“ (vom Nutzer bestätigt) und Mindestlänge 12
  - Authentication → Rate Limits („Sign-ups and sign-ins“, „Token verifications“, „Token refreshes“)
  - Authentication → Hooks → Before User Created
  - Logs → Postgres: landet der Server-Schlüssel als RPC-Parameter im Log?
- [!] **Secure-Flag zur Laufzeit:** Der Dev-Server läuft mit `NODE_ENV=development`
- [!] **BUG-15** wurde bewusst nicht provoziert, weil das das geteilte Dev-Projekt sperren würde
- [!] **Migrations-Round-Trip:** Docker läuft nicht
- [!] **Go-live:** T34 und T35 (inklusive Schlüssel und „aktuelles Passwort verlangen“ im Prod-Projekt) werden in `/deploy` gemacht; HSTS und Header des Hosts (`stack.deploy: null`)

## Gefundene Bugs

_BUG-1 bis BUG-12 aus dem Erstlauf: Status siehe Tabelle oben. Neue Befunde dieses Laufs folgen. Nach dem Erstlauf hat der Nutzer entschieden, alle neuen, nicht blockierenden Befunde zu sammeln und später zu beheben (2026-11-15)._

#### BUG-13: Sperre ohne CAPTCHA und ohne Fehlversuch auslösbar
- **Severity:** Medium
- **Status:** Deferred (Entscheidung Nutzer 2026-11-15)
- **Class:** Sicherheitszähler wird von noch ungeprüften Anfragen belegt (Reservierung vor CAPTCHA- und Zugangsdatenprüfung); laufende Reservierungen zählen als Fehlversuche
- **Control / AC:** SEC-04; AC-22 (gleiche Klasse wie BUG-6, eingeführt durch den Fix von BUG-10)
- **Sweep:** `grep -rn "alsVersuch(" src --include=*.ts | grep -v "\.test\."` — 4 Treffer. Anonym und mit frei wählbarer E-Mail erreichbar ist nur `auth.actions.ts:173` (`anmelden`); die übrigen nehmen die E-Mail aus der Sitzung
- **Schritte:**
  1. 10 parallele `anmelden`-Aufrufe mit `captchaToken=XXXX` an dieselbe Adresse
  2. Erwartet: nur `captcha`; gesperrt wird erst nach 5 echten Fehlversuchen
  3. Tatsächlich: 5× `captcha`, 5× „Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.“ Ein Einzelaufruf direkt danach liefert wieder `captcha`
- **Folge:**
  - Solange die Flut läuft, wird auch das richtige Passwort abgewiesen. Der Angreifer braucht dafür kein CAPTCHA und keinen Anon-Key
  - Die Meldung „15 Minuten“ stimmt nicht
  - `gesperrt` vor der CAPTCHA-Prüfung verrät, ob eine Adresse gerade gesperrt ist
- Nachweis: Laufzeit (Lane 1 und Lane 2 unabhängig). Testdaten: nur Zählereinträge für fiktive `@example.com`-Adressen, nach 24 h gelöscht

#### BUG-14: Server Actions umgehen den Proxy über Pfade mit Bildendung, die Inaktivität wird nicht geprüft
- **Severity:** Medium
- **Status:** Deferred (Entscheidung Nutzer 2026-11-15)
- **Class:** Sicherheitskontrolle sitzt nur im Proxy. Dessen Matcher lässt Pfade mit Dateiendung aus, Server Actions sind aber über jeden Pfad aufrufbar
- **Control / AC:** SEC-03; AC-7, AC-17
- **Sweep:**
  - `grep -n matcher src/proxy.ts` — 1 Treffer (`:106`, schließt `.*\.(svg|png|jpg|jpeg|gif|webp)$` aus)
  - `grep -c istInaktiv src/features/konto/konto.actions.ts` — 0
- **Schritte:**
  1. `POST /x.png` mit `Next-Action: 606258ee…` (`zweiFaktorPruefen`) und `Origin: http://localhost:3000`
  2. Erwartet: Proxy prüft Sitzung und Inaktivität bzw. die Action läuft nicht
  3. Tatsächlich: Status 404, aber der Body enthält das Action-Ergebnis. Die Action lief, der Proxy nicht (Gegenprobe des Owners)
- **Folge:** Wer die Cookies einer Sitzung hat, die über 30 Min. inaktiv war (unbeaufsichtigtes Gerät), kann `emailAendern` (ohne Passwort), `anzeigenameSpeichern` und `zweiFaktorStarten` weiter ausführen. Über die E-Mail-Änderung und danach einen Passwort-Reset ist eine Kontoübernahme möglich. Mit echter inaktiver Sitzung NOT VERIFIED

#### BUG-15: Supabase sieht nur die Server-IP, sein Per-IP-Limit wirkt global
- **Severity:** Medium
- **Status:** Deferred (Entscheidung Nutzer 2026-11-15)
- **Class:** Provider-Limits pro Quelle werden hinter einem Server zu einem globalen Limit
- **Control / AC:** SEC-04; AC-22, AC-23
- **Sweep:** `grep -rniE "x-forwarded-for|forwarded" src --include=*.ts | grep -v test` — 0
- **Schritte:**
  - Alle Auth-Aufrufe laufen serverseitig (`auth.actions.ts:174, 235, 277, 305`, `konto.actions.ts:146-156`)
  - `design.md:205` begründet das Restrisiko mit „Supabase begrenzt je IP“
  - Auf dem App-Weg teilen sich aber alle Nutzer eine IP. Zählen fehlgeschlagene CAPTCHA-Anfragen mit (unbestätigt), kann ein Angreifer ohne CAPTCHA das Anmelde-Limit für alle erschöpfen
- Nachweis: Code und Plattformverhalten; bewusst nicht provoziert. Dashboard: Supabase (Dev) → Authentication → Rate Limits

#### BUG-16: Neue „now“-Einstellungen nicht als `[user]`-Aufgabe in `tasks.md`
- **Severity:** Low. Die Einstufung als High entfällt: Der Server-Schlüssel ist zur Laufzeit belegt, „aktuelles Passwort verlangen“ hat der Nutzer am 2026-11-15 bestätigt
- **Status:** Deferred
- **Class:** Anbieter-Einstellung nur in `design.md`, nicht als `[user]`-Aufgabe nachverfolgt
- **Control / AC:** SEC-08; AC-16, AC-22
- **Sweep:** `grep -n "require_current_password\|LOGIN_SPERRE" features/PROJ-1-benutzerkonto-login/tasks.md` — 0 (`design.md:248-250` nennt 2× „now“ und 1× go-live)
- **Schritte:** `tasks.md` hat keine Zeile für Server-Schlüssel und „aktuelles Passwort verlangen“ (Dev). T35 nennt den Prod-Teil nicht. Ohne Zeile kann `/deploy` beides im Prod-Projekt übersehen

#### BUG-17: Globale Header überschreiben `Referrer-Policy: no-referrer` der Bestätigungsroute
- **Severity:** Low
- **Status:** Deferred
- **Class:** Globale Header-Konfiguration überschreibt strengere Header einzelner Routen
- **Control / AC:** SEC-05, SEC-06; EC-2
- **Sweep:** `grep -rnE "headers\.set\('(Referrer-Policy|X-Frame-Options|Content-Security-Policy|X-Content-Type-Options|Permissions-Policy|Strict-Transport-Security)'" src` — 1 Treffer (`src/app/auth/bestaetigen/route.ts:28`)
- **Schritte:** `curl -sD - "/auth/bestaetigen?type=recovery&token_hash=abc"` liefert nur `Referrer-Policy: strict-origin-when-cross-origin`; im Erstlauf war es `no-referrer`. Die Wirkung ist gering (sofortiger 307), aber die zugesagte Absicherung ist stillschweigend weg

#### BUG-18: `/passwort-neu` akzeptiert neben `recovery` auch jede `otp`-Sitzung
- **Severity:** Low
- **Status:** Deferred
- **Class:** Sicherheitsaktion prüft nicht genau die geforderte Sitzungsart
- **Control / AC:** SEC-03; AC-16 (Rest der BUG-1-Klasse)
- **Sweep:** `grep -n "WIEDERHERSTELLUNG_METHODEN" src/features/konto/konto.rules.ts` — 2 Treffer (`:48`, `:60`)
- **Schritte:** Schreibt GoTrue nach der Registrierungsbestätigung (`/auth/bestaetigen?type=email`) `otp` in `amr`, darf diese Sitzung 15 Min. lang ohne aktuelles Passwort ein neues setzen. Das setzt Zugriff auf das Postfach voraus. Nicht zur Laufzeit belegt, hängt vom echten `amr` ab

#### BUG-19: `delete_own_account` akzeptiert jede Passwort-Sitzung in den ersten 5 Minuten
- **Severity:** Low
- **Status:** Deferred
- **Class:** Re-Authentifizierung hängt am Alter der Anmeldung statt an einem eigens ausgestellten Nachweis
- **Control / AC:** SEC-03; AC-20
- **Sweep:** `grep -n "frisch_bestaetigt(array" supabase/migrations/*.sql` — 2 Treffer (`20261115120000_konto_haertung.sql:157`, `:164`)
- **Schritte:** Eine Sitzung, die in den ersten 5 Min. nach der Anmeldung (bei 2FA nach dem Code) übernommen wird, kann `rpc/delete_own_account` direkt aufrufen, ohne Passwort und ohne „LÖSCHEN“. Voraussetzung ist der Anon-Key. In keiner Ausnahme erfasst (`design.md:236` nennt nur ältere Sitzungen). Zur Laufzeit NOT VERIFIED

#### BUG-20: Maskierung von `over_email_send_rate_limit` verschluckt auch das kontounabhängige Stundenlimit
- **Severity:** Low
- **Status:** Deferred
- **Class:** Fehlercode-Maskierung trifft auch kontounabhängige Ausfälle
- **Control / AC:** AC-1, EC-1
- **Sweep:** `grep -rn "verraetKonto(" src --include=*.ts | grep -v test` — 3 Treffer (`auth.actions.ts:241, 283, 310`)
- **Schritte:** Supabase meldet das projektweite Mail-Kontingent mit demselben Code. Eine neue, freigegebene Adresse bekommt dann die Erfolgsmeldung, aber weder Konto noch Mail, und keinen Hinweis. Nicht provoziert (CAPTCHA)

#### BUG-21: Vorhandenes Passwort über 72 Bytes ergibt „Bitte gib dein Passwort ein.“
- **Severity:** Low
- **Status:** Deferred
- **Class:** Eingabelimit liefert eine andere Meldung als die Spec
- **Control / AC:** AC-6
- **Sweep:** `grep -n "refine(passt72Bytes, { error: PASSWORT_FEHLT })" src/features/konto/konto.schema.ts` — 1 Treffer (`:37`)
- **Schritte:** `anmelden` mit 37×„ä“ → `feldFehler.passwort: "Bitte gib dein Passwort ein."` statt „E-Mail oder Passwort falsch.“. Die Konten werden dadurch nicht ausgespäht, die Meldung ist aber falsch. Nebenbei: Das Formularfeld `maxLength=72` zählt Zeichen, das Schema Bytes

#### BUG-22: SEC-08-Ausnahmen ohne Ausgleichsmaßnahme; EX-3 beschreibt das Risiko zu klein
- **Severity:** Low
- **Status:** Deferred
- **Class:** Ausnahme-Eintrag formal unvollständig
- **Control / AC:** SEC-08; AC-14, AC-16, AC-27
- **Sweep:** `grep -n "^| EX-" features/PROJ-1-benutzerkonto-login/design.md` — 3 Treffer, keine Spalte für die Ausgleichsmaßnahme
- **Schritte:**
  - SEC-08 verlangt eine Ausgleichsmaßnahme. EX-1 nennt sie nur implizit, EX-2 und EX-3 gar nicht
  - EX-3 spricht von „wer das Passwort kennt“; mit „aktuelles Passwort verlangen“ stimmt das jetzt nur, solange die Einstellung in jedem Projekt an ist (siehe BUG-16)
  - Der Prüfauslöser von EX-1 („Feature liefert den Browser-Client aus“) wird nicht automatisch überwacht

## Auch bemerkt (kein Bug, zur Entscheidung)
- Aus dem Erstlauf, weiter offen:
  - AC-29: Freigabe-Eintrag der *ursprünglichen* Adresse bleibt nach E-Mail-Wechsel bestehen
  - E-Mail ändern ohne Passwort bei ausgeschaltetem „Secure email change“ (BUG-14 verstärkt das)
  - Hook aus → „Dienst nicht erreichbar“ statt Einladungsmeldung
  - Platzhalter-Zeile unter INDEX → Deployments
  - `/robots.txt` fehlt (Thema für `/deploy`)
- Die SQL-Prüfungen aus `design.md` (jetzt 11) liegen weiter nicht im Repo und sind nicht wiederholbar
- `Strict-Transport-Security` mit `includeSubDomains` gilt bei `wohnwerk-mb.de` für alle Subdomains, bei `/deploy` bewusst entscheiden
- `passwortVergessen`/`bestaetigungErneutSenden` setzen ein überflüssiges PKCE-Cookie `…-code-verifier`
- Token-Refreshes zählen ebenfalls gegen die Server-IP (siehe BUG-15). Mit mehreren Nutzern kann das eng werden
- CSP ohne `script-src` und per JavaScript lesbare Auth-Cookies (Bibliotheksvorgabe): Eine XSS würde die Sitzung kosten. Gefunden wurden 0 XSS-Senken
- Im Arbeitsbaum liegen unabhängig von diesem Feature `docs/privacy.md` (geändert) und `AGENTS.md` (ungetrackt), nicht committet

## Aufgezeichneter Nutzertest (2026-11-15)

Der Nutzer hat die folgenden neun Schritte selbst ausgeführt und mit „PASST ALLES“ bestätigt. Gerät und Browser hat er nicht angegeben. Diese Punkte ersetzen die NOT VERIFIED-Laufzeitvermerke für die genannten Kriterien. Sie gelten nur für den getesteten Ablauf, nicht für Randfälle.

- [x] Registrieren mit freigegebener Adresse, deutsche Bestätigungsmail, Link führt zu „Wohnungen“ – AC-1, AC-4, AC-28: vom Nutzer bestätigt, Gerät nicht angegeben, 2026-11-15
- [x] Nicht freigegebene Adresse → „nur auf Einladung“ – AC-2: vom Nutzer bestätigt, 2026-11-15
- [x] Falsches Passwort → „E-Mail oder Passwort falsch.“, nach 5 Fehlversuchen Sperrmeldung; Abmelden – AC-6, AC-22, AC-9: vom Nutzer bestätigt, 2026-11-15
- [x] Normal anmelden, `/konto` zeigt Anzeigename, E-Mail und 2FA-Status, Anzeigename änderbar – AC-5, AC-15, AC-18: vom Nutzer bestätigt, 2026-11-15
- [x] „Passwort vergessen“: Mail, neues Passwort über den Link, Sicherheitshinweis; `/passwort-neu` ohne Link mit normaler Sitzung abgewiesen – AC-11, AC-27, BUG-1: vom Nutzer bestätigt, 2026-11-15
- [x] 2FA einrichten, beim erneuten Anmelden wird der Code verlangt – AC-12, AC-13: vom Nutzer bestätigt, 2026-11-15
- [x] Passwort im Konto ändern nur mit richtigem aktuellem Passwort – AC-16: vom Nutzer bestätigt, 2026-11-15
- [x] Zwei Tabs, Abmelden über die Statusleiste, anderer Tab zeigt beim nächsten Klick das Anmeldefenster – EC-4, BUG-8: vom Nutzer bestätigt, 2026-11-15
- [x] Testkonto löschen (Passwort, Code, „LÖSCHEN“), Weiterleitung zur Anmeldung, Neuregistrierung ohne neue Freigabe gesperrt – AC-19, AC-29, EC-5: vom Nutzer bestätigt, 2026-11-15

Weiterhin nicht vom Nutzer getestet, also NOT VERIFIED:
- AC-7 (Inaktivität und Schließen des Browsers)
- AC-10 (auf allen Geräten abmelden)
- AC-14 (zweiter Authenticator bzw. 2FA ausschalten)
- AC-17 (E-Mail ändern)
- AC-20 (Löschen mit falschen Angaben)
- AC-21 mit zwei Konten
- AC-24 (bereits registrierte Adresse)
- AC-26
- EC-1, EC-3, EC-6, EC-8
- Darstellung am Handy und Cross-Browser

## Zusammenfassung
- **Abnahmekriterien:** 29 AC, 9 EC
  - In diesem Lauf zur Laufzeit belegt: AC-3, AC-8, AC-9 (ohne echte Sitzung), AC-13 (Fehlerpfade), AC-22 (Sperrmechanik), AC-23, AC-25 (Links), EC-2
  - Im Code bestätigt, zur Laufzeit NOT VERIFIED: die übrigen
  - Mit offenem Befund: AC-7 (BUG-14), AC-22 (BUG-13), EC-2 (BUG-17)
- **Bugs aus dem Erstlauf:** 11 von 12 geschlossen, BUG-4 als Ausnahme EX-1 akzeptiert
- **Neue Bugs:** 10 (0 Critical, 0 High, 3 Medium, 7 Low), Open: 0, Deferred: 10 (Entscheidung Nutzer)
- **Security:** 15 Prüfungen belegt, 3 NOT VERIFIED (Autorisierung zur Laufzeit, Rate Limiting – nicht implementiert, angemeldete API-Antworten); neue Befunde BUG-13, -14, -15, -17, -19, -22
- **Production Ready:** **JA** – keine Open-Bugs, keine Critical/High; die Kernabläufe hat der Nutzer am 2026-11-15 getestet (Abschnitt oben). Die NOT VERIFIED-Punkte oben bleiben offen, ebenso die 10 Deferred-Bugs
- **Empfehlung:** `/e2e-tests` für Anmelden und Registrieren als dauerhaftes Sicherheitsnetz; die Deferred-Bugs gesammelt mit `/build PROJ-1 deferred` beheben, zuerst BUG-13 und BUG-14. Beides blockiert `/deploy` nicht

> „Production Ready: JA“ hieße nur *keine Critical/High-Bugs*, nicht, dass alles geprüft wurde. Jedes NOT VERIFIED oben bleibt offen.
