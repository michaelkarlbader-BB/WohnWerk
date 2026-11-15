# QA-Ergebnis – PROJ-1 Benutzerkonto & Login

**Geprüft:** 2026-11-15
**App-URL:** http://localhost:3000 (Dev-Server, angebunden an das Supabase-Dev-Projekt mit Testdaten)
**Prüfer:** QA Engineer (KI) – drei unabhängige `qa-engineer`-Läufe (Abnahme, Security, Regression) ohne Kenntnis des Builds, zusammengeführt von dieser Sitzung
**Umfang:** `full` (erster `/qa`-Lauf)

> Legende: `[x]` in diesem Lauf geprüft (mit Beleg) · `[ ] BUG` als fehlerhaft festgestellt · `[!] NOT VERIFIED` in diesem Lauf nicht prüfbar (mit Grund)
>
> **Wichtigste Einschränkung dieses Laufs:** Supabase verlangt bei Anmeldung, Registrierung und „Passwort vergessen“ ein gültiges Turnstile-Token (das ist AC-23 und wirkt nachweislich). Ohne Browser lässt es sich nicht erzeugen. Deshalb gab es in diesem Lauf **kein Testkonto und keine angemeldete Sitzung**. Alles, was eine echte Anmeldung, einen Mail-Empfang oder einen Link-Klick braucht, ist unten „(Code)“ geprüft und zur Laufzeit `[!] NOT VERIFIED`.
>
> Server Actions wurden per `curl` direkt aufgerufen (`POST` mit `Next-Action`-Header, IDs aus `.next/dev/server/server-reference-manifest.json`).

## Abnahmekriterien

### Registrierung
#### AC-1 – Registrierung mit freigegebener Adresse, Bestätigungsmail
- [x] (Code) `signUp` mit `emailRedirectTo` – `src/features/konto/auth.actions.ts:240-244`; `enable_confirmations = true` – `supabase/config.toml:230`; `[user]` T17 abgehakt
- [!] NOT VERIFIED zur Laufzeit – braucht gelöstes CAPTCHA, freigegebene Adresse und Postfach

#### AC-2 – Nicht freigegebene Adresse wird abgelehnt
- [x] (Code) dreifach abgesichert: Hook `hook_before_user_created` – `supabase/migrations/20261114175034_konto_basis.sql:162-181`; Trigger `freigabe_erzwingen` – ebd. `:185-203`; Abbildung auf „WohnWerk ist derzeit nur auf Einladung nutzbar.“ – `konto.rules.ts:148`, `auth.actions.ts:247-253`; Unit-Test `auth.actions.test.ts:472`
- [!] NOT VERIFIED zur Laufzeit – Formularweg braucht CAPTCHA, Direktweg den Anon-Key (wird nicht ausgeliefert, `.env*` nicht gelesen)

#### AC-3 – Passwort unter 12 Zeichen abgelehnt
- [x] Laufzeit: `registrieren` mit 11 Zeichen → `feldFehler.passwort: "Das Passwort muss mindestens 12 Zeichen haben."`; `passwortNeuSetzen` mit 9 Zeichen → dieselbe Meldung; 73 Zeichen → „höchstens 72 Zeichen“ (curl auf die Server Actions)
- [x] Passwort ändern nutzt dasselbe Schema – `konto.schema.ts:95-101`; `minimum_password_length = 12` – `config.toml:185`
- Hinweis: siehe BUG-12 (Grenze 72 in Zeichen statt Bytes)

#### AC-4 – Bestätigungslink aktiviert Konto, Profil, Weiterleitung „Wohnungen“
- [x] (Code) `verifyOtp` → `/wohnungen` + Aktivitäts-Cookie – `src/app/auth/bestaetigen/route.ts:8-12, 43-58`; Profil-Trigger – Migration `:92-108`; Vorlage verlinkt `token_hash` + `type` – `supabase/templates/bestaetigen.html`
- [x] Laufzeit, Fehlerpfad: `curl /auth/bestaetigen?type=email&token_hash=abc` → 307 `/link-ungueltig?art=email`
- [!] NOT VERIFIED – Erfolgspfad braucht einen echten Token aus einer Mail

### Anmelden und Sitzung
#### AC-5 – Anmeldung ohne 2FA → „Wohnungen“
- [x] (Code) Fehlversuche löschen, Weiterleitung auf `weiter` bzw. `/wohnungen` – `auth.actions.ts:190-195`
- [!] NOT VERIFIED zur Laufzeit – CAPTCHA, kein Konto

#### AC-6 – Gleiche Meldung bei falschem Passwort und unbekannter Adresse
- [x] (Code) `invalid_credentials`, `user_not_found`, `user_banned` → „E-Mail oder Passwort falsch.“ – `konto.rules.ts:71, 103-106`; Unit-Test `auth.actions.test.ts:229`
- [!] NOT VERIFIED zur Laufzeit (CAPTCHA); Antwortzeit-Gleichheit nicht gemessen

#### AC-7 – Abmeldung beim Schließen des Browsers bzw. nach 30 Min. Inaktivität
- [x] (Code) Auth-Cookies ohne `maxAge`/`expires` – `src/lib/supabase/proxy.ts:15-22`, `server.ts:20-23`, `client.ts:31-43`; Aktivitäts-Cookie ohne Ablauf – `konto.rules.ts:53`; Proxy meldet nach > 30 Min. ab – `src/proxy.ts:67-75`; Sitzungswächter – `sitzungswaechter.tsx:57-64`
- [x] Neuer Unit-Test `src/lib/supabase/client.test.ts` (5 Tests): Browser-Client schreibt Sitzungs-Cookies ohne Max-Age/Expires, Löschungen behalten `Max-Age=0` – grün, Rot-Nachweis erbracht (siehe Unit-Tests)
- [!] NOT VERIFIED – echtes Schließen des Browsers und vorgestellte Uhr brauchen einen Browser (`/e2e-tests`)

#### AC-8 – Umleitung zum Anmeldefenster, danach zurück zur Ursprungsseite
- [x] Laufzeit: `curl /wohnungen` → 307 `/anmelden?weiter=%2Fwohnungen`; `/konto?tab=x` → `weiter=%2Fkonto%3Ftab%3Dx`, Hidden-Feld `value="/konto?tab=x"`
- [x] Laufzeit, offene Weiterleitung: `//evil.com`, `https://evil.com`, `/\evil.com`, `/%09/evil.com`, `javascript:alert(1)`, `/%2E%2E%2F%2Fevil.com` → alle zu `/wohnungen`; serverseitig erneut geprüft – `auth.actions.ts:195, 219` → `konto.schema.ts:59-68`
- [!] NOT VERIFIED – die tatsächliche Rückkehr nach erfolgreicher Anmeldung (CAPTCHA)

#### AC-9 – Abmelden
- [x] Laufzeit: `abmelden`-Action → `x-action-redirect: /anmelden;push`, Cookie `ww-aktiv` gelöscht; Code `signOut({scope:'local'})` – `auth.actions.ts:369-388`
- [!] NOT VERIFIED – Abmelden einer echten Sitzung

#### AC-10 – Auf allen Geräten abmelden
- [x] (Code) `signOut({scope:'global'})` – `auth.actions.ts:391-393`; Proxy prüft jede Anfrage per `getUser()` am Auth-Server – `src/proxy.ts:31-39`
- [!] NOT VERIFIED zur Laufzeit – zwei Geräte und ein Konto nötig

### Passwort vergessen
#### AC-11 – Immer dieselbe Meldung, Link nur bei bestehendem Konto
- [x] Laufzeit: ohne bzw. mit falschem CAPTCHA → „Die Sicherheitsprüfung ist fehlgeschlagen…“
- [ ] BUG-2: Bei bestehendem Konto meldet ein zweiter Versuch innerhalb von 60 s „Der Dienst ist gerade nicht erreichbar…“ statt der neutralen Meldung – verrät die Kontoexistenz
- [ ] BUG-1: Die Seite „Neues Passwort setzen“ akzeptiert jede angemeldete Sitzung, nicht nur die aus dem Link

### Zwei-Faktor-Anmeldung
#### AC-12 – 2FA einrichten nur mit gültigem Code
- [x] (Code) QR-Code + Secret – `konto.actions.ts:300-309`; aktiv erst nach `challengeAndVerify` – `:314-338`
- [!] NOT VERIFIED zur Laufzeit – Konto und Authenticator nötig

#### AC-13 – Bei 2FA zusätzlich der 6-stellige Code
- [x] (Code) aal1 → `schritt:'code'` – `auth.actions.ts:192`; Proxy lässt aal1 nicht auf geschützte Seiten – `src/proxy.ts:42-50, 77-83`; RLS verlangt aal2 – Migration `:14-32, 71-74`
- [x] Laufzeit: `zweiFaktorPruefen` ohne Sitzung → `nicht_angemeldet`; 5-stelliger Code → „Der Code besteht aus 6 Ziffern.“
- [!] NOT VERIFIED – Anmeldung mit echtem Code

#### AC-14 – Zweiter Authenticator / 2FA ausschalten nur mit Code
- [x] (Code, über die App) zweiter Faktor nur mit Code – `konto.actions.ts:287-292`; Ausschalten nur mit Code – `:347-351`; max. 2 – `:283-285`, `config.toml:323`
- [!] NOT VERIFIED zur Laufzeit; Direktweg über die Supabase-API siehe BUG-3

### Kontoeinstellungen
#### AC-15 – Anzeigename ändern/leeren, Statusleiste
- [x] (Code) leer → `null` – `konto.schema.ts:34-38`; nur eigenes Profil – `konto.data.ts:47-65`; Statusleiste Name sonst E-Mail – `src/app/(angemeldet)/layout.tsx:41, 47`
- [!] NOT VERIFIED zur Laufzeit – keine Sitzung

#### AC-16 – Passwort ändern mit aktuellem Passwort, neu ≥ 12 Zeichen
- [x] (Code, Konto-Fenster) aktuelles Passwort per Anmeldeprüfung, zählt als Versuch – `konto.actions.ts:122-154, 234-267`
- [ ] BUG-1: Über `/passwort-neu` lässt sich mit jeder angemeldeten Sitzung ein neues Passwort ohne das aktuelle setzen
- [ ] BUG-3: Über die Supabase-API direkt ebenfalls ohne aktuelles Passwort (`secure_password_change = false`)

#### AC-17 – E-Mail ändern: Link an neue, Hinweis an alte Adresse, ohne Freigabeliste
- [x] (Code) `updateUser({email})` + Brevo-Hinweis an alte Adresse – `konto.actions.ts:217-224`, `mail.integration.ts:107-116`; `double_confirm_changes = false` – `config.toml:228`; Hook greift nur beim Anlegen
- [!] NOT VERIFIED zur Laufzeit – Sitzung und Postfach nötig

#### AC-18 – Kontoeinstellungen zeigen alle gespeicherten Daten
- [x] (Code) E-Mail, Anzeigename, angelegt am, 2FA-Status – `src/app/(angemeldet)/konto/page.tsx:12-31`, `konto-allgemein.tsx:66-76`
- [!] NOT VERIFIED zur Laufzeit – keine Sitzung

### Konto löschen
#### AC-19 – Konto löschen mit Passwort (+ Code) und „LÖSCHEN“
- [x] (Code) Reihenfolge „LÖSCHEN“ → Passwort → Code → `delete_own_account` → `signOut` → `/anmelden` – `konto.actions.ts:370-403`; Funktion löscht `auth.users`, Profil folgt per CASCADE – Migration `:41, 208-236`
- [!] NOT VERIFIED zur Laufzeit – würde ein Konto löschen; kein Testkonto

#### AC-20 – Falsche Angabe → nichts gelöscht
- [x] (Code, über die App) `z.literal('LÖSCHEN')` – `konto.schema.ts:45`; Abbruch vor dem Löschen – `konto.actions.ts:382-391`; Suite `konto.actions.test.ts:729-782`
- [ ] BUG-3: `delete_own_account` selbst prüft weder Passwort noch Bestätigung und ist mit jeder Sitzung direkt per RPC aufrufbar

### Datentrennung
#### AC-21 – Kein Zugriff auf Daten anderer Nutzer
- [x] (Code) `profiles`: RLS nur eigene Zeile, restriktive aal2-Policy, nur `select` und `update(display_name)` – Migration `:53-74`; `registration_allowlist` und `login_attempts`: RLS ohne Policy, `revoke all` – Migration `:124-126`, `20261114175041_konto_sperre.sql:24-26`; App-Zugriffe ohne user-id-Parameter – `konto.data.ts:153-171`
- [!] NOT VERIFIED zur Laufzeit – zwei Testkonten (CAPTCHA) und Anon-Key nicht verfügbar. Die in `design.md` genannten 33 SQL-Prüfungen liegen nicht im Repo und sind daher nicht wiederholbar

### Schutz vor Missbrauch
#### AC-22 – Sperre nach 5 Fehlversuchen je E-Mail in 15 Min.
- [x] (Code) Sperrprüfung vor jeder Zugangsdatenprüfung – `auth.actions.ts:137, 174-176`, `konto.actions.ts:130, 170`; Zählung bei Passwort und Code – `auth.actions.ts:155, 186`; SQL-Regel – Sperre-Migration `:29-42`
- [x] Laufzeit indirekt: `anmelden` mit falschem CAPTCHA erreichte Supabase, d. h. `login_sperre_pruefen` lief als anon fehlerfrei gegen das Dev-Projekt
- [!] NOT VERIFIED – Auslösen der Sperre (jeder gezählte Versuch braucht ein gültiges CAPTCHA; 25 Versuche scheiterten alle am CAPTCHA)
- [ ] BUG-10: Prüfen und Zählen nicht atomar · BUG-6: Zähler von außen ohne CAPTCHA schreibbar

#### AC-23 – Ohne gültiges CAPTCHA keine Anfrage
- [x] Laufzeit: `anmelden`, `registrieren`, `passwortVergessen`, `bestaetigungErneutSenden` ohne `captchaToken` → `code: captcha`; mit `captchaToken=XXXX` antwortet Supabase selbst mit `captcha_failed` → Supabase-Prüfung im Dev-Projekt aktiv (`[user]` T16 wirkt); Turnstile-Widget im Markup von `/anmelden`

#### AC-24 – Bereits registrierte Adresse: gleiche Meldung + Mail an Inhaber
- [x] (Code) bestätigtes Konto: `identities.length === 0` → gleiche Erfolgsmeldung + „bereits registriert“-Mail – `auth.actions.ts:256-262`; Unit-Test `auth.actions.test.ts:463`
- [ ] BUG-2: unbestätigtes bestehendes Konto innerhalb von 60 s → „Dienst nicht erreichbar“ statt Erfolgsmeldung
- [ ] BUG-11: messbar längere Antwort bei bestehender Adresse (Brevo-Aufruf wird abgewartet)

### Datenschutz und E-Mails
#### AC-25 – Links zu Datenschutz und Impressum vor der Registrierung
- [x] Laufzeit: `/anmelden`, `/registrieren`, `/passwort-vergessen`, `/link-ungueltig` enthalten `href="/datenschutz"` und `href="/impressum"`; beide Seiten ohne Login 200
- [!] NOT VERIFIED – Menü „?“ gehört zum App-Rahmen (PROJ-2, Status Tasked) und existiert noch nicht; kein Bug von PROJ-1

#### AC-26 – Unbestätigte Registrierungen nach 7 Tagen gelöscht
- [x] (Code) pg_cron `17 3 * * *` löscht unbestätigte `auth.users` älter als 7 Tage – Migration `:243-260`
- [!] NOT VERIFIED zur Laufzeit – Job im gehosteten Projekt ohne DB-Zugang nicht einsehbar

#### AC-27 – Sicherheitsmail bei Passwortänderung und 2FA-Abschaltung
- [x] (Code) `konto.actions.ts:265, 360`, `auth.actions.ts:363`
- [!] NOT VERIFIED – Mail-Empfang; Direktweg ohne Mail siehe BUG-3

#### AC-28 – Mails auf Deutsch, als WohnWerk erkennbar
- [x] (Code) deutsche Vorlagen mit WohnWerk-Kopf – `supabase/templates/*.html`, aktiviert in `config.toml:253-265`; App-Mails mit Absendername „WohnWerk“ – `mail.integration.ts:69`
- [!] NOT VERIFIED – Zustellung; Produktiv-SMTP: go-live (T34/T35), wird in `/deploy` eingerichtet und geprüft

#### AC-29 – Kontolöschung entfernt Freigabe-Eintrag
- [x] (Code) Eintrag zur aktuellen E-Mail und Konto werden in derselben Funktion (= einer Transaktion) gelöscht – Migration `:226-231`
- [!] NOT VERIFIED zur Laufzeit – kein Testkonto

## Sonderfälle

#### EC-1 – Unbestätigtes Konto: Hinweis + „erneut senden“
- [x] (Code) `email_not_confirmed` → „Bitte bestätige zuerst deine E-Mail-Adresse“ + Button – `konto.rules.ts:72, 108`, `anmelden-form.tsx`
- [!] NOT VERIFIED zur Laufzeit (CAPTCHA); die Resend-Action hat dieselbe Lücke wie BUG-2 (`auth.actions.ts:286`)

#### EC-2 – Abgelaufener/benutzter Link
- [x] Laufzeit: `/auth/bestaetigen?type=recovery|email|email_change&token_hash=…` → 307 `/link-ungueltig?art=…`; Seite zeigt „Dieser Link ist abgelaufen oder wurde schon benutzt.“, bei `recovery` mit „Neuen Link anfordern“; `Cache-Control: no-store`, `Referrer-Policy: no-referrer`
- [!] NOT VERIFIED – echter abgelaufener Token (gleicher Codepfad, `route.ts:45-46`)

#### EC-3 – Sitzung während der Arbeit abgelaufen → Anmeldefenster
- [x] (Code) Ablauf durch Inaktivität: Sitzungswächter navigiert zu `/anmelden?weiter=…` – `sitzungswaechter.tsx:44-54, 62-64`
- [ ] BUG-7: Bei serverseitig beendeter Sitzung zeigt „Speichern“ nur „Bitte melde dich erneut an.“ statt des Anmeldefensters

#### EC-4 – Abmeldung in einem Tab → anderer Tab zeigt Anmeldefenster
- [x] (Code) Abmelde-Buttons im Konto-Fenster benachrichtigen andere Tabs – `konto-sicherheit.tsx:171-177`; Unit-Test `sitzungswaechter.test.tsx`
- [ ] BUG-8: „Abmelden“ in der Statusleiste benachrichtigt andere Tabs nicht

#### EC-5 – Neuregistrierung nach Löschung braucht neue Freigabe
- [x] (Code) Eintrag wird beim Löschen entfernt – Migration `:229`; Hook und Trigger lehnen danach ab
- [!] NOT VERIFIED zur Laufzeit

#### EC-6 – Mehrfachklick führt Aktion nur einmal aus
- [x] (Code, Garantie) Buttons während der Anfrage gesperrt (`registrieren-form.tsx`, `konto-loeschen.tsx`, `konto-allgemein.tsx`); Registrieren: CAPTCHA-Token einmalig, E-Mail in `auth.users` eindeutig; Löschen: zweiter Aufruf findet keine Sitzung; Anzeigename idempotent
- [!] NOT VERIFIED – echter Doppelklick im Browser

#### EC-7 – Beide Authenticatoren verloren
- [x] (Code) keine Umgehung über WohnWerk: `/passwort-neu` verlangt bei 2FA einen Code – `auth.actions.ts:337-347`; Proxy verlangt aal2 – `src/proxy.ts:77-80`

#### EC-8 – Neue E-Mail gehört einem anderen Konto
- [x] (Code) `email_exists`, `user_already_exists` u. a. → „Diese Adresse kann nicht verwendet werden.“ – `konto.rules.ts:76, 112-115`, `konto.actions.ts:214, 221-222`; Suite `konto.actions.test.ts:326`
- [!] NOT VERIFIED zur Laufzeit – keine Sitzung

#### EC-9 – Sperre an die E-Mail gebunden, nicht an die IP
- [x] (Code, über die App) Schlüssel ist allein `lower(btrim(email))` – Sperre-Migration `:9-11, 29-42, 52`
- [ ] BUG-4: Direkte 2FA-Code-Prüfung über die Supabase-API wird vom Zähler nicht erfasst; einziger Schutz ist das Per-IP-Limit von Supabase

### Weitere, nicht dokumentierte Sonderfälle
- [ ] BUG-12: Passwort-Höchstlänge 72 in Zeichen statt Bytes
- Hinweis (kein Bug): „LÖSCHEN“ wird ohne Unicode-Normalisierung verglichen (`konto.schema.ts:45`); eine NFD-Eingabe würde abgelehnt – sehr selten, NOT VERIFIED

## Security-Audit

Angewendete Kontrollen aus `docs/kit/guides/security.md`: SEC-01 bis SEC-06, SEC-08.

- [x] Authentifizierung: geschützte Routen ohne Login gesperrt – Laufzeit: `/`, `/wohnungen`, `/konto`, `/api/foo`, `/robots.txt`, unbekannte Pfade → 307 `/anmelden?weiter=…`; gefälschtes `sb-…-auth-token`-Cookie → 307; `POST /konto` mit `Next-Action` → 307; Proxy fail closed – `src/proxy.ts:14-29, 80-83`; Layout prüft zusätzlich – `(angemeldet)/layout.tsx:35-37`
- [x] Server Actions ohne Sitzung: `zweiFaktorPruefen` → „Bitte melde dich erneut an.“; `passwortNeuSetzen` → „Der Link ist abgelaufen…“; Konto-Actions laufen über `mitSitzung` – `konto.actions.ts:78-107`, Suite `konto.actions.test.ts:213-242`
- [x] CSRF auf Server Actions: POST mit `Origin: https://evil.example` → 500 „Invalid Server Actions request“
- [!] Autorisierung über Nutzergrenzen – NOT VERIFIED zur Laufzeit (siehe AC-21); RLS im Code geprüft
- [x] Eingabe-Injection: `' OR 1=1--@x.de`, `a@b.de'; drop table profiles;--`, `<script>alert(1)</script>@x.de` → von Zod abgelehnt, nichts roh im HTML; 0× `dangerouslySetInnerHTML` in `src`; Mail-HTML escaped – `mail.integration.ts:29-35`; `<script>` in `weiter` wird HTML-escaped
- [!] Rate Limiting auf gewöhnlichen Endpunkten – NOT VERIFIED: nicht implementiert (für das MVP optional); 30× `GET /datenschutz` ungebremst; `grep -rniE "ratelimit|upstash" src package.json` → 0
- [x] Brute Force (App-Weg): Sperre je E-Mail im Code vor jeder Prüfung (AC-22); zur Laufzeit wurden 25 Login-Versuche alle am CAPTCHA abgewiesen. **Restschutz bei Password Spraying** (ein Passwort gegen viele Konten): nur CAPTCHA, Per-IP-Limit von Supabase und die Freigabeliste. **Direktweg:** siehe BUG-4 (TOTP) und BUG-6
- [x] Keine Kontenausspähung über die Login-Meldung (AC-6, Code) – aber siehe BUG-2 (Passwort vergessen / Registrierung) und BUG-11 (Antwortzeit)
- [x] Zugangsdaten nie in der URL: SSR-Markup `method="POST"` für `/anmelden`, `/registrieren`, `/passwort-vergessen`; `grep -n "<form" src/features/konto/components/*.tsx` → 12 Treffer, alle Server Actions, kein GET
- [x] Keine Secrets im Client-Bundle: 27 Chunks + `.next/static` + `.next/dev/static` nach `BREVO`, `xkeysib`, `service_role`, `sb_secret_`, `MAIL_FROM`, `TURNSTILE_SECRET`, `SUPABASE_SERVICE` gegrept → 0 Treffer; einziger Wert ist der öffentliche Turnstile-Site-Key
- [x] Keine Secrets in der Git-Historie: `git log --all -p` nach JWT-, `sb_secret`-, `xkeysib`-, `sk_`- und PEM-Mustern → nur der Platzhalter in `.env.local.example`; `.gitignore:32-35` schließt `.env*` aus
- [x] Sensible Daten in Antworten (unangemeldet): Action-Antworten enthalten nur `ok`, `code`, `meldung`, `feldFehler`; 0× `supabase.co`, 0× `eyJhbGci` im HTML. Angemeldete Antworten (`/konto`, 2FA-Enroll): NOT VERIFIED
- [x] `[user]`-Aufgaben auf Zugangsdaten-Pfaden: T8–T11, T16–T22 abgehakt; T16 (CAPTCHA) zur Laufzeit wirksam (AC-23)
- [x] Massenhafte Registrierung: Freigabeliste (Hook + Trigger) plus CAPTCHA
- [ ] BUG-5: Keine Sicherheits-Header (SEC-06)
- [ ] BUG-9: Auth-Cookies ohne `Secure`-Flag

## Regression

- [x] Testsuite: `npm test` einmal vor den Lanes – 9 Dateien, 405 Tests bestanden, 0 fehlgeschlagen (Vitest 4.1.12)
- [x] `npm run lint` – 0 Fehler, 2 Warnungen (`sitzungswaechter.tsx:53`, `zwei-faktor.tsx:127`), beide in `design.md` als bewusst begründet
- [x] `npm run typecheck` – Exit 0
- [x] `npm run check:structure` – „116 modules scanned, 0 errors“
- [x] Keine Feature-Regression möglich: kein Feature hat Status „Deployed“, keine Git-Tags
- [x] Geteilte Bausteine für PROJ-2: `src/components/retro/window.tsx` exportiert `Window`, `GroupBox`, `MessageBox` (`:21-55`); kein zweiter Rahmen und keine zweite Navigation (`src/components/rahmen/` existiert nicht); angemeldetes Layout nur mit kleiner Übergangs-Statuszeile, wie PROJ-2 `design.md:86` vorsieht; öffentliche Pfade im Proxy decken sich mit `docs/app-shell.md:91`
- [x] Alle abgemeldeten Seiten liefern 200 mit korrektem Titel und Fenster-Überschrift (curl)
- [!] Produktions-Build (`npm run build`) – NOT VERIFIED: nicht ausgeführt, weil der laufende Dev-Server `.next` belegt
- [!] Angemeldete Kernabläufe (`/wohnungen`, `/konto` rendern) – NOT VERIFIED: keine Sitzung

## Unit-Tests (von `/qa` ergänzt)

- `src/lib/supabase/client.test.ts` – neu, 5 Tests: Browser-Client schreibt Auth-Cookies ohne Max-Age/Expires (AC-7), Löschungen behalten `Max-Age=0` (leerer Wert und `maxAge: 0`), Domain/Secure/SameSite werden übernommen und der Wert kodiert, Lesen dekodiert und überspringt Doppelte. `npx vitest run src/lib/supabase/client.test.ts` → 5 bestanden.
  - Rot-Nachweis erbracht: Guards in `client.ts` zurückgebaut (Max-Age übernommen, `maxAge 0` nicht als Löschung, Secure entfernt, Dedupe und Dekodierung entfernt, Löschen abgeschaltet) → jeder Test schlug mit dem erwarteten Fehler fehl; danach `git checkout -- src/lib/supabase/client.ts`, erneut grün. Ein sechster Test („leere Liste“) blieb bei allen Mutationen grün und wurde gestrichen.
- Alle übrigen Logikmodule (`konto.schema`, `konto.rules`, `konto.data`, `mail.integration`, `auth.actions`, `konto.actions`, `proxy`, `bestaetigen/route`, `sitzungswaechter`) haben bereits Tests aus `/build`.

## E2E-Tests
_Optionale Ebene – schreibt `/e2e-tests` für kritische Kernabläufe._

- Status: **nicht ausgeführt** (keine Suite vorhanden; `/e2e-tests` für die kritischen Abläufe)

## Nicht geprüft in diesem Lauf

- [!] **Alles mit echter Anmeldung, Registrierung, Passwort-Reset oder Sitzung** (AC-1, AC-4, AC-5, AC-6, AC-9 bis AC-22 zur Laufzeit, EC-1, EC-5, EC-8) – Turnstile-CAPTCHA ohne Browser nicht lösbar; laut Vorgabe keine echten Konten im gehosteten Projekt
- [!] **AC-21 mit zwei Konten** und direkte Supabase-Proben (REST, RPC, GoTrue) – Anon-Key wird nicht ausgeliefert, `.env*` nicht gelesen
- [!] **Mail-Empfang und -Sprache** (AC-1, AC-17, AC-24, AC-27, AC-28) – kein Postfach
- [!] **AC-26** – pg_cron im gehosteten Projekt nicht einsehbar
- [!] **AC-7, AC-10, EC-3, EC-4, EC-6 im Browser** (Schließen, Uhr vorstellen, zwei Tabs/Geräte, Doppelklick) – kein Browser
- [!] **AC-25 Menü „?“** – gehört zu PROJ-2 (noch nicht gebaut)
- [!] **Antwortzeit-Gleichheit** (AC-6, AC-11, AC-24) – nicht gemessen
- [!] **Provider-Einstellungen im Supabase-Dashboard (Dev)**, die nicht einsehbar waren: Authentication → Rate Limits („Sign-ups and sign-ins“, „Token verifications“, MFA); Authentication → Sign In / Providers → Email → „Secure password change“ und Mindestlänge 12 (T18); Authentication → Hooks → Before User Created aktiv (T21)
- [!] **Produktions-Build** – Dev-Server belegt `.next`
- [!] Cross-Browser (Chrome / Firefox / Safari), Responsive (375 / 768 / 1440 px), Konsole/Netzwerk-Tab – kein Browser
- [!] **Go-live:** T34 (Domain + Brevo-SMTP Prod) und T35 (Auth-Einstellungen Prod) – werden in `/deploy` eingerichtet und geprüft; kein Bug
- [!] **HSTS und tatsächliche Header des Hosts** – Deploy-Ziel noch nicht festgelegt (`stack.deploy: null`)

## Gefundene Bugs

#### BUG-1: „Neues Passwort setzen“ akzeptiert jede angemeldete Sitzung
- **Severity:** High
- **Status:** Open
- **Class:** Sicherheitsaktion prüft nur „irgendeine Sitzung“ statt der geforderten Sitzungsart (Recovery) bzw. einer erneuten Anmeldung
- **Control / AC:** SEC-03, SEC-04; AC-16, AC-11
- **Sweep:** `grep -rn "updateUser(" src --include=*.ts | grep -v .test.` — 3 Treffer · erlaubt: `konto.actions.ts:253` (durch `passwortPruefen` geschützt), `konto.actions.ts:217` (E-Mail, laut Spec ohne Passwort) · Bug: `auth.actions.ts:349`
- **Schritte:**
  1. Normal anmelden (ohne 2FA, oder mit 2FA vollständig)
  2. `http://localhost:3000/passwort-neu` direkt aufrufen (öffentlicher Pfad, `src/proxy.ts:18`, nicht in `NUR_ABGEMELDET`)
  3. Erwartet: nur die Sitzung aus dem Wiederherstellungslink darf ein neues Passwort setzen; sonst Weiterleitung/Ablehnung
  4. Tatsächlich: Seite (`passwort-neu/page.tsx:11-15`) und Action (`auth.actions.ts:330-349`) prüfen nur `getUser()` – neues Passwort wird ohne das aktuelle gesetzt. Wer ein unbeaufsichtigtes Gerät nutzt, übernimmt so das Konto. Der Test `auth.actions.test.ts:673-683` prüft nur den Fall ohne Sitzung.
- Nachweis: Code (eindeutig, von der Owner-Sitzung gegengelesen); zur Laufzeit nicht ausgeführt (keine Sitzung)

#### BUG-2: Frequenzlimit von Supabase verrät, ob ein Konto existiert
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Provider-Fehler, die nur bei existierendem Konto auftreten, werden unterscheidbar gemeldet
- **Control / AC:** SEC-04; AC-11, AC-24, EC-1
- **Sweep:** `grep -nE "kategorie === 'dienst_nicht_erreichbar'|^\s+'dienst_nicht_erreichbar',$" src/features/konto/auth.actions.ts` — 3 Treffer (`:251` registrieren, `:286` Bestätigung erneut senden, `:312` Passwort vergessen) · plus `grep -rn over_email_send_rate_limit src --include=*.ts | grep -v test` — 1 Treffer (`konto.rules.ts:135`)
- **Schritte:**
  1. `/passwort-vergessen`: registrierte Adresse zweimal innerhalb von 60 s absenden
  2. Dasselbe mit einer unbekannten Adresse
  3. Erwartet: immer „Falls ein Konto existiert, haben wir eine E-Mail gesendet.“
  4. Tatsächlich: bei bestehender Adresse „Der Dienst ist gerade nicht erreichbar…“ (`over_email_send_rate_limit` → `dienst_nicht_erreichbar`, `konto.rules.ts:135`, `auth.actions.ts:311-312`). Gleiches Muster beim Registrieren einer unbestätigten Adresse und bei „Bestätigung erneut senden“.
- Nachweis: Code + dokumentiertes Supabase-Auth-Verhalten (`max_frequency = "1m0s"`, `config.toml:238`); zur Laufzeit nicht provoziert (CAPTCHA)

#### BUG-3: Erneute Anmeldung nur in den Server Actions, nicht an der Supabase-Schnittstelle
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Re-Authentifizierung nur in der Server Action, nicht an der vom Browser erreichbaren Schnittstelle
- **Control / AC:** SEC-03, SEC-08; AC-16, AC-20, AC-27, AC-14
- **Sweep:** `grep -n "grant execute" supabase/migrations/*.sql | grep -E "anon|authenticated"` — 5 Treffer (`delete_own_account`, `login_sperre_pruefen`, `login_fehlversuch_zaehlen`, `login_fehlversuche_loeschen`, `private.zweite_stufe_erfuellt`) · plus `grep -n secure_password_change supabase/config.toml` — 1 Treffer (`:232`, `false`)
- **Schritte:**
  1. Mit einer übernommenen Sitzung (Auth-Cookies sind per JavaScript lesbar) und dem Anon-Key
  2. `POST /rest/v1/rpc/delete_own_account` bzw. `PUT /auth/v1/user {password}` aufrufen
  3. Erwartet: Löschen nur mit Passwort (+ Code) und „LÖSCHEN“; Passwortwechsel nur mit aktuellem Passwort und mit Sicherheitsmail
  4. Tatsächlich: Konto wird ohne Passwort gelöscht bzw. Passwort ohne aktuelles Passwort und ohne Sicherheitsmail geändert
- Hinweis: Der Anon-Key wird derzeit nicht ausgeliefert (`src/lib/supabase/client.ts` wird nirgends importiert) – das erhöht die Schwelle, ist aber kein Schutz. Dashboard-Einstellung zum Prüfen: Supabase (Dev) → Authentication → Sign In / Providers → Email → „Secure password change“
- Nachweis: Code und Konfiguration; zur Laufzeit nicht ausgeführt

#### BUG-4: Direkte 2FA-Code-Prüfung umgeht den Fehlversuchszähler
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Zähler je Konto nur in der App-Schicht, Provider-Endpunkt direkt erreichbar
- **Control / AC:** SEC-04, SEC-08; EC-9, AC-22
- **Sweep:** `grep -rn "fehlversuchZaehlen(" src/features/konto/*.ts | grep -v test` — 4 Treffer, alle in Server Actions; datenbank- oder hookseitig: none
- **Schritte:**
  1. Mit bekanntem Passwort eine aal1-Sitzung holen (ein CAPTCHA)
  2. `/auth/v1/factors/{id}/verify` direkt mit vielen Codes aufrufen, verteilt über IPs
  3. Erwartet: Sperre nach 5 Fehlversuchen je E-Mail, unabhängig von der IP (EC-9)
  4. Tatsächlich: Der Zähler der App sieht diese Versuche nicht; einziger Schutz ist das Per-IP-Limit von Supabase. Das Restrisiko in `design.md` (Technische Entscheidungen, „Restrisiko direkter Aufrufe“) deckt nur Passwortversuche ab (dort mit CAPTCHA), nicht TOTP, und ist keine formale SEC-08-Ausnahme
- Würde High, sobald ein Feature den Browser-Client (und damit den Anon-Key) ausliefert. Dashboard-Einstellung zum Prüfen: Supabase (Dev) → Authentication → Rate Limits („Token verifications“, MFA)

#### BUG-5: Keine Sicherheits-Header
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Keine Sicherheits-Header konfiguriert
- **Control / AC:** SEC-06
- **Sweep:** `grep -c "headers" next.config.ts` — 0 · `curl -sD - -o /dev/null http://localhost:3000/anmelden | grep -ciE "x-frame|content-security|nosniff|referrer-policy"` — 0
- **Schritte:**
  1. `curl -D - http://localhost:3000/anmelden`
  2. Erwartet: mindestens `X-Frame-Options`/CSP `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`
  3. Tatsächlich: keiner davon; dafür `X-Powered-By: Next.js`. Login und „Konto löschen“ lassen sich in fremde Seiten einbetten (Clickjacking). `next.config.ts` ist leer, eine Host-Konfiguration gibt es noch nicht
- Hinweis: `docs/production/security-headers.md` beschreibt die Umsetzung; HSTS ist Sache des Hosts bei `/deploy`

#### BUG-6: Fehlversuchszähler ohne CAPTCHA von außen schreibbar
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Sicherheitszähler für anonyme Aufrufer ohne Missbrauchsschutz schreibbar
- **Control / AC:** SEC-04, SEC-08; AC-22
- **Sweep:** `grep -n "to anon" supabase/migrations/*.sql` — 2 Treffer (`konto_sperre.sql:90-91`)
- **Schritte:**
  1. Mit dem Anon-Key `login_fehlversuch_zaehlen` für eine fremde Adresse 5× aufrufen
  2. Erwartet: keine Sperre ohne echten Anmeldeversuch
  3. Tatsächlich: Die Adresse ist 15 Min. gesperrt, auch für das richtige Passwort – beliebig wiederholbar. Außerdem unbegrenzte Einträge für erfundene Adressen; `login_sperre_pruefen` verrät, ob eine Adresse kürzlich Fehlversuche hatte
- Hinweis: in `design.md` (Umsetzungsnotizen) als bekannt beschrieben, aber nicht als formale Ausnahme nach SEC-08 (Kontroll-ID, Freigabe, Prüfauslöser) erfasst. Zur Laufzeit nicht ausgeführt (kein Anon-Key)

#### BUG-7: Serverseitig beendete Sitzung zeigt beim Speichern kein Anmeldefenster
- **Severity:** Medium
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Server-Action-Ergebnis „nicht angemeldet“ führt nicht zum Anmeldefenster
- **Control / AC:** EC-3
- **Sweep:** `for f in $(grep -l useActionState src/features/konto/components/*.tsx); do grep -q nicht_angemeldet $f || echo $f; done` — 7 Treffer, davon 4 angemeldete Komponenten: `konto-allgemein.tsx`, `konto-loeschen.tsx`, `konto-sicherheit.tsx`, `zwei-faktor.tsx`
- **Schritte:**
  1. Zwei Tabs auf `/konto`
  2. In Tab A „Abmelden“ in der Statusleiste (oder auf einem anderen Gerät „Auf allen Geräten abmelden“)
  3. In Tab B Anzeigenamen ändern, „Speichern“
  4. Erwartet: Anmeldefenster, danach zurück auf `/konto`
  5. Tatsächlich: nur „Bitte melde dich erneut an.“ im Formular. Laufzeit-Beleg: Die Action gibt ohne Sitzung kein `x-action-redirect` zurück; der Next-Client navigiert nur bei diesem Header

#### BUG-8: „Abmelden“ in der Statusleiste benachrichtigt andere Tabs nicht
- **Severity:** Low
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Abmelde-Einstieg ohne Tab-Benachrichtigung
- **Control / AC:** EC-4
- **Sweep:** `grep -rnE "action=\{(abmelden|ueberallAbmelden)\}" src` — 3 Treffer, 1 ohne Benachrichtigung (`src/app/(angemeldet)/layout.tsx:54`)
- **Schritte:** Zwei Tabs offen; in Tab A über die Statusleiste abmelden; in Tab B klicken → erst bei der nächsten Navigation erscheint das Anmeldefenster, „Speichern“ zeigt nur eine Meldung (siehe BUG-7)

#### BUG-9: Auth-Cookies ohne `Secure`-Flag
- **Severity:** Low
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Cookie-Optionen der Bibliothek nicht gehärtet
- **Control / AC:** SEC-05; AC-7
- **Sweep:** `grep -rn "secure:" src --include=*.ts | grep -v test` — 3 Treffer, alle nur für das Aktivitäts-Cookie
- **Schritte:** `sb-…-auth-token` wird mit den `@supabase/ssr`-Standardwerten gesetzt (`httpOnly: false`, kein `secure`); `sitzungsCookieOptionen` entfernt nur `maxAge`/`expires` (`src/lib/supabase/proxy.ts:15-22`). In Produktion fehlt das Secure-Flag. (`httpOnly: false` ist für den Browser-Client der Bibliothek nötig.)

#### BUG-10: Sperrprüfung und Zählung nicht atomar
- **Severity:** Low
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Prüfen-dann-Handeln ohne Serialisierung
- **Control / AC:** AC-22
- **Sweep:** `grep -rn "sperrePruefen(email)\|gesperrt(email)" src/features/konto/*.ts | grep -v test` — 4 Treffer
- **Schritte:** Mehrere Fehlversuche (je mit gelöstem CAPTCHA) gleichzeitig senden → alle passieren `login_sperre_pruefen`, bevor gezählt wird; mehr als 5 Versuche je Fenster möglich

#### BUG-11: Längere Antwortzeit bei bereits registrierter Adresse
- **Severity:** Low
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Zeitverhalten hängt von der Kontoexistenz ab
- **Control / AC:** SEC-04; AC-24
- **Sweep:** `grep -n "await sende" src/features/konto/auth.actions.ts` — 2 Treffer · relevant: `:260`
- **Schritte:** Registrierung mit bestehender Adresse → `sendeBereitsRegistriert` (Brevo-HTTP-Aufruf) wird abgewartet, die Antwort ist messbar länger als bei einer neuen Adresse. Nicht gemessen

#### BUG-12: Passwort-Höchstlänge in Zeichen statt Bytes
- **Severity:** Low
- **Status:** Open (Entscheidung Nutzer 2026-11-15)
- **Class:** Längenprüfung in Zeichen statt Bytes
- **Control / AC:** AC-3
- **Sweep:** `grep -rn "PASSWORT_MAX" src --include=*.ts` — Definition `konto.schema.ts:4` und alle Nutzer
- **Schritte:** Passwort mit vielen Umlauten (< 72 Zeichen, > 72 Bytes) → App lässt es durch, Supabase lehnt ab (`validation_failed`) → „Das hat nicht geklappt. Bitte versuche es erneut.“ ohne Ursache. Nicht zur Laufzeit provoziert

## Auch bemerkt (kein Bug, zur Entscheidung)
- AC-29: Nach einem E-Mail-Wechsel bleibt der Freigabe-Eintrag der *ursprünglichen* Adresse beim Löschen bestehen – spec-konform („aktuelle Adresse“), aber ein Datenschutz-Rest (`/dsgvo` bzw. `/refine`)
- E-Mail ändern ohne Passwort (laut Spec) plus „Secure email change“ aus: Eine übernommene Sitzung kann die Login-Adresse übernehmen; einzige Bremse ist der Hinweis an die alte Adresse
- Ist der Before-User-Created-Hook ausgeschaltet, greift nur der Trigger; Supabase meldet dann `unexpected_failure` → „Dienst nicht erreichbar“ statt der Einladungs-Meldung (`konto.rules.ts:133`)
- `design.md` nennt 33 bestandene SQL-Prüfungen; sie liegen nicht im Repo und sind für `/qa` nicht wiederholbar
- `features/INDEX.md` → Deployments enthält noch die kursive Vorlagen-Zeile mit `https://app.example.com` und PROJ-1/PROJ-2
- `/robots.txt` fehlt und leitet auf `/anmelden` um; für `test.wohnwerk-mb.de` ist „ohne Indexierung“ verlangt (Thema für `/deploy`); kein Favicon

## Zusammenfassung
- **Abnahmekriterien:** 29 AC. Zur Laufzeit bestanden: AC-3, AC-23, (teilweise AC-8, AC-9, AC-25, EC-2). Im Code bestätigt, zur Laufzeit NOT VERIFIED: die übrigen. Mit Bug: AC-11, AC-16, AC-20, AC-24 (+ EC-3, EC-4, EC-9)
- **Bugs:** 12 gesamt (0 Critical, 1 High, 6 Medium, 5 Low) – Open: 12, Deferred: 0 (Nutzer: alle jetzt beheben)
- **Security:** 12 Prüfungen belegt, 3 NOT VERIFIED (Autorisierung zur Laufzeit, Rate Limiting – nicht implementiert, angemeldete API-Antworten); 5 Bugs aus dem Audit (BUG-1, -3, -4, -5, -6)
- **Production Ready:** NEIN
- **Empfehlung:** alle 12 Bugs (Class + Sweep) mit `/build PROJ-1` beheben; danach `/qa` als Nachprüfung. Zusätzlich braucht es vor der Freigabe einen **aufgezeichneten Test durch den Nutzer** für die Laufzeit-ACs, die hier am CAPTCHA scheiterten, oder `/e2e-tests`

> „Production Ready: JA“ hieße nur *keine Critical/High-Bugs* – nicht, dass alles geprüft wurde. Jedes NOT VERIFIED oben bleibt offen.
