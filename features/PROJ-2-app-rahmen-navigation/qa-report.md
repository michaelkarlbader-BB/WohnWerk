# QA-Bericht – PROJ-2: App-Rahmen & Navigation

- **Datum:** 2026-11-16 · **Lauf:** erster `/qa` (keine Nachprüfung) · **Branch:** `feat/PROJ-2-app-rahmen-navigation` @ `bef57b2`
- **Vorgehen:** drei unabhängige `qa-engineer`-Lanes (Abnahme, Sicherheit, Regression) ohne Kenntnis des Builds; Zusammenführung durch den Owner.
- **App:** `npm run dev` auf http://localhost:3000, geprüft per `curl` und Quelltext. **Kein Browser, keine angemeldete Sitzung** (Login hat CAPTCHA; `tests/.auth/` nach SEC-01 nicht gelesen) – alles, was angemeldetes Laufzeit-HTML braucht, ist über Code und Komponententests belegt und zusätzlich unten als NOT VERIFIED geführt.
- **Testsuite (einmal, vor den Lanes):** `npm test` → 26 Dateien, **603 bestanden, 0 fehlgeschlagen** (Vitest 4.1.12).

## Ergebnis

| | |
|---|---|
| Abnahmekriterien | 36 – davon 32 bestanden (teils nur Code/Test), **2 fehlgeschlagen** (AC-27, AC-31), 2 nicht prüfbar (AC-26, AC-34; AC-35 nur Mechanismus) |
| Sonderfälle | 10 – alle bestanden (Code/Test) |
| Bugs | 1 High, 2 Medium, 4 Low |
| Sicherheit | 12 Prüfungen verifiziert, 2 Befunde, 7 NOT VERIFIED |
| Empfehlung | **NOT READY** – BUG-1 (High) ist offen |

## Abnahmekriterien

- [x] AC-1 — Aufbau `src/components/rahmen/programmfenster.tsx:70-106`, Titel `navigation.rules.ts:77-81`; Test `programmfenster.test.tsx` (AC-1). Optik [!] NOT VERIFIED.
- [x] AC-2 — nur `main` mit `overflow-auto` (`programmfenster.tsx:104`), außen `overflow-hidden`; Test `programmfenster.test.tsx` (AC-2). Echtes Scrollen [!] NOT VERIFIED.
- [x] AC-3 — Cookie `wohnwerk-fenster`, nur Wert `1` gilt (`rahmen.rules.ts:40-48`, `(angemeldet)/layout.tsx:36-42`); Tests `programmfenster.test.tsx`, `rahmen.rules.test.ts`.
- [x] AC-4 — `curl /anmelden`: 0 Treffer für Menü, Werkzeugleiste, Bereichsliste, „Angemeldet:“, Maximieren.
- [x] AC-5 — `src/app/page.tsx:5` → `/wohnungen`; Fallback nach Anmeldung `konto.schema.ts:65`, `auth.actions.ts:190`.
- [x] AC-6 — `navigation.rules.ts:68-81`, `bereichsliste.tsx` (`aria-current`); Tests `bereichsliste.test.tsx`, `navigation.rules.test.ts`.
- [x] AC-7 — Verzeichnis `navigation.rules.ts:22-30` (`gebaut: false`); Tests `bereichsliste`, `menueleiste`, `schublade`, `use-menues` (je AC-7).
- [x] AC-8 — abgemeldet: `/wohnungen/123?x=1` → 307 `/anmelden?weiter=%2Fwohnungen%2F123%3Fx%3D1`; Rücksprung `sichereRuecksprungadresse`. Angemeldetes Lesezeichen [!] NOT VERIFIED.
- [x] AC-9 — Ableitung aus `usePathname`, `rahmen-kontext.tsx:253-261`; Test `rahmen-kontext.test.tsx` (AC-9). Echter Browser-Verlauf [!] NOT VERIFIED.
- [x] AC-10 — `(angemeldet)/[...pfad]/page.tsx:10-12` → `notFound()` → `NichtGefunden`; Test `inhalt-meldungen.test.tsx`.
- [x] AC-11 — `navigation.rules.ts:141-167` wörtlich; Tests `navigation.rules.test.ts`, `menueleiste.test.tsx`.
- [x] AC-12 — Tests `menueleiste.test.tsx` (Auswahl, Esc). Klick außerhalb (Radix) [!] NOT VERIFIED.
- [x] AC-13 — gemeinsame `aktionAusfuehren` in `use-menues.ts`/`werkzeugleiste.tsx`; Tests `use-menues`, `werkzeugleiste`, `rahmen-kontext`.
- [x] AC-14 — `(angemeldet)/konto/page.tsx` (`variante="eingebettet"`); Test `menueleiste.test.tsx` (AC-14).
- [x] AC-15 — `auth.actions.ts:366-385`, `rahmen-kontext.tsx:325-338`; Tests `rahmen-kontext.test.tsx`, `menueleiste.test.tsx`. Laufzeit [!] NOT VERIFIED.
- [x] AC-16 — `ueber-dialog.tsx:34-51`, Version aus `package.json` (`layout.tsx:58`); `curl /datenschutz`, `/impressum` → 200.
- [x] AC-17 — `werkzeugleiste.tsx`; Tests `werkzeugleiste.test.tsx` (leer, genau die gemeldeten).
- [x] AC-18 — `darstellung-anbieter.tsx:16-18` (`defaultTheme="system"`); Test `use-menues.test.tsx`. Gerätewirkung [!] NOT VERIFIED.
- [x] AC-19 — Tests `menueleiste.test.tsx`, `schublade.test.tsx`; Skript mit `wohnwerk-darstellung` im HTML von `/anmelden`.
- [x] AC-20 — Mechanismus: blockierendes Skript vor `<main` im HTML von `/anmelden`. Kein Aufblitzen [!] NOT VERIFIED.
- [x] AC-21 — `statusleiste.tsx`, `layout.tsx:58`; Tests `statusleiste.test.tsx` (3 Fälle).
- [x] AC-22 — `rahmen.rules.ts:8` (10 000 ms), `rahmen-kontext.tsx:264-272`; Tests `rahmen-kontext`, `statusleiste`.
- [x] AC-23 — `rahmen.rules.ts:27`, `rahmen-kontext.tsx:282-292`; Tests `rahmen.rules`, `rahmen-kontext`, `statusleiste`.
- [x] AC-24 — `programmfenster.tsx:81,92`, `globals.css:420-440`, `statusleiste.tsx:42,47`; Tests `statusleiste`, `werkzeugleiste` (44 px), `programmfenster`. Darstellung [!] NOT VERIFIED.
- [x] AC-25 — `schublade.tsx`; Tests `schublade.test.tsx` (5 Fälle). Antippen daneben [!] NOT VERIFIED.
- [!] AC-26 — NOT VERIFIED: kein 360-px-Viewport. Code: Bedienelemente `min-h-11`/`size-11`; Test `schublade.test.tsx` „at least 44 px“.
- [ ] AC-27 — **FAIL → BUG-1**. Übrige Wege (Bereichswechsel, Menüziel, Abmelden, einfaches Zurück) bestehen: `rahmen-kontext.tsx:221-250, 325-338`; Tests `rahmen-kontext`, `ungespeichert-waechter`.
- [x] AC-28 — `ungespeichert-waechter.tsx:28-37`; Test „lets the browser ask only while changes are unsaved“. Native Rückfrage [!] NOT VERIFIED.
- [x] AC-29 — Tests `rahmen-kontext.test.tsx`, `ungespeichert-waechter.test.tsx` (AC-29).
- [x] AC-30 — Fokus-Stil `globals.css:339-344`; Esc-Tests in `menueleiste`, `schublade`, `ungespeichert-waechter`. Tab-Reihenfolge/sichtbarer Fokus [!] NOT VERIFIED.
- [ ] AC-31 — **FAIL → BUG-3** (Dunkel-Titelleiste); Nebenbefund BUG-7. Hellmodus ≥ 5,12; alle anderen Paare ≥ 4,88 (WCAG-Formel über Tokens).
- [x] AC-32 — `(angemeldet)/error.tsx`, keine Details; Test `inhalt-meldungen.test.tsx`. Nebenbefund BUG-6.
- [x] AC-33 — `rahmen-kontext.tsx:115-146`, `rahmen.rules.ts:27`; Tests `rahmen-kontext`, `statusleiste`.
- [!] AC-34 — NOT VERIFIED: Zeitmessung mit „Fast 4G“ nur in Browser-Werkzeugen. Mechanismus: Layout lädt keine Bereichsdaten, Schublade/Dialog per `dynamic`.
- [!] AC-35 — NOT VERIFIED (Messung). Mechanismus: Ziel wird sofort gesetzt; Test `rahmen-kontext.test.tsx` „shows the destination at once“.
- [x] AC-36 — Vorlage `src/app/layout.tsx:8`, `tabTitel` `navigation.rules.ts:88-90`; Test `navigation.rules.test.ts` (AC-36); `curl`: abgemeldete Tab-Titel ohne Details. Angemeldetes `document.title` [!] NOT VERIFIED.

## Sonderfälle

- [x] EC-1 — `navigation.rules.ts:93-95`, `rahmen-kontext.tsx:238`; Tests `bereichsliste`, `rahmen-kontext`.
- [x] EC-2 — keine Routenordner für ungebaute Bereiche; Test `navigation.rules.test.ts`.
- [x] EC-3 — `sitzungswaechter.tsx:57`; Tests `ungespeichert-waechter`, `rahmen-kontext`.
- [x] EC-4 — `schublade.tsx:45`; Tests `programmfenster`, `schublade`. Echtes Größenändern [!] NOT VERIFIED.
- [x] EC-5 — `truncate` in `retro/window.tsx:58`, `statusleiste.tsx:28,42,47`; Test „cuts long texts“.
- [x] EC-6 — `enableSystem` (next-themes hört auf matchMedia). Laufzeit [!] NOT VERIFIED.
- [x] EC-7 — `programmfenster.tsx:64` try/catch; Test (EC-7); next-themes kapselt localStorage.
- [x] EC-8 — „ungespeichert“ ist React-Zustand je Tab; next-themes `storage`-Ereignis.
- [x] EC-9 — Sperren `rahmen-kontext.tsx:240, 307, 327`; Tests in 5 Dateien (EC-9).
- [x] EC-10 — `rahmen-kontext.tsx:295-302, 356`; Test (EC-10).

## Bugs

### BUG-1 — Browser-Zurück nach Seitenwechsel oder Speichern verwirft Eingaben ohne Rückfrage
- **Severity:** High · **Status:** Open · **AC:** AC-27
- **Repro:** (a) auf Seite A ändern → speichern → über Bereichsliste nach B → auf B ändern → Browser-Zurück: kein Dialog, Eingaben auf B weg. (b) auf A ändern → Bereichswechsel mit „Verwerfen“ → auf B ändern → Zurück: kein Dialog. Gegenprobe (jsdom-History) `scratchpad/probe/zurueck-nach-wechsel.test.tsx`: 2 failed, Kontrollfall passed.
- **Ursache:** `ungespeichert-waechter.tsx:43` legt keinen neuen Wächter-Eintrag an, solange `eintragAktiv.current` `true` ist; das Flag wird nur im popstate-Handler (`:52`) zurückgesetzt, nicht bei Pfadwechsel oder Speichern. Zurück landet auf dem veralteten Eintrag von A, `:51` bricht still ab.
- **Class:** Zustand eines Verlaufs-Wächters (Ref) überlebt Pfadwechsel/Speichern und deckt dann einen fremden Verlaufseintrag ab.
- **Sweep:** `grep -rn "markeAnlegen(" src --include=*.ts --include=*.tsx | grep -v "\.test\."` → 4 Treffer (`schublade.tsx:58`, `ungespeichert-waechter.tsx:44, 58`, Definition `verlauf.ts:10`).

### BUG-2 — Adressen mit Bildendung umgehen den Proxy (2FA- und Inaktivitätsprüfung)
- **Severity:** Medium · **Status:** Open · **Sicherheit:** SEC-03
- **Repro:** `curl -i localhost:3000/konto.png` → 307 `/anmelden` **ohne** `weiter` (Layout-Redirect, Proxy lief nicht); `curl -i localhost:3000/konto` → 307 `/anmelden?weiter=%2Fkonto` (Proxy). Gleich für `/wohnungen.svg`, `/x/y.jpg`.
- **Ursache:** Matcher `src/proxy.ts:106` nimmt `.svg|png|jpg|jpeg|gif|webp` aus; solche Pfade landen in `(angemeldet)/[...pfad]`. Das Layout (`layout.tsx:15-24, 53`) prüft nur `getUser()` – weder AAL2 (`proxy.ts:42-50`) noch Aktivitäts-Cookie (`proxy.ts:67`). Eine Sitzung mit offenem zweitem Faktor oder abgelaufener Inaktivität sieht den Rahmen samt E-Mail. Datensätze heute geschützt durch restriktive RLS (`20261114175034_konto_basis.sql:71`); jede künftige dynamische Route erbt die Lücke. Widerspricht `design.md` („alle Routen … durch die Anfrage-Grenze geschützt“).
- **Class:** Geschützte Route an der Anfrage-Grenze vorbei erreichbar (Matcher-Ausnahme nach Dateiendung) und Rückfallprüfung im Layout schwächer als der Proxy.
- **Sweep:** `find "src/app/(angemeldet)" -path "*[*" -name page.tsx` → 1; `grep -rln "auth.getUser()" src/app | xargs grep -L "getAuthenticatorAssuranceLevel\|aal2"` → 2 (`(angemeldet)/layout.tsx`, `konto/page.tsx`).

### BUG-3 — Titelleiste im Dunkelmodus unter 4,5:1 Kontrast
- **Severity:** Medium · **Status:** Open · **AC:** AC-31
- **Repro/Messung:** Text `#E6E4DF` auf Verlauf `#2F5597`→`#4A78B8` (`globals.css:270-271`): 5,76 (0 %), 4,46 (50 %), 4,06 (70 %), 3,54 (100 %). Betrifft lange Titel (Dialog „Nicht gespeicherte Änderungen verwerfen?“, Handy-Titel, Detailtitel). Der axe-Test `tests/rahmen-bedienbarkeit.spec.ts:149` wertet nur `violations` aus – Verläufe landen unter `incomplete`. Die Vorgabe selbst ist widersprüchlich (`docs/design-system.md:15` vs. `:23`).
- **Class:** Textkontrast auf Verlaufs-/Hover-Hintergründen ungeprüft.
- **Sweep:** `grep -rn "titlebar" src --include=*.tsx | grep -v "\.test\."` → 5 Treffer.

### BUG-4 — Fehlende statische Dateien (z. B. `/favicon.ico`) landen in der Auffang-Route
- **Severity:** Low · **Status:** Deferred
- **Repro:** `curl -i localhost:3000/favicon.ico` → 307 `/anmelden` (`text/html`) statt 404; angemeldet rendert jeder Favicon-Abruf den ganzen Rahmen mit zwei Supabase-Abfragen. Es gibt kein Favicon im Projekt. Gleiche Ursache wie BUG-2 – wird mit dessen Fix wahrscheinlich mit erledigt.
- **Class:** Auffang-Route unter dem geschützten Layout schluckt Pfade, die der Proxy-Matcher bewusst ausnimmt.
- **Sweep:** `for p in /favicon.ico /x.png /x.svg /x.jpg; do curl -s -o /dev/null -w "%{http_code}\n" localhost:3000$p; done` → 307 statt 404.

### BUG-5 — Testseite `/rahmen-test` im Produktions-Bundle
- **Severity:** Low · **Status:** Deferred
- **Befund:** `(angemeldet)/rahmen-test/page.tsx` nur per `NODE_ENV==='production' → notFound()` (Z. 18) abgeschaltet; `.next/app-path-routes-manifest.json` enthält `/rahmen-test`, ein Chunk enthält „Testseite des Rahmens“. `design.md` sagt „nur in Tests vorhanden“. Nicht ausführbar in Produktion.
- **Class:** Test-Fixture im ausgelieferten App-Baum.
- **Sweep:** `grep -rln "NODE_ENV === 'production') notFound" src/app` → 1.

### BUG-6 — „Zu den Wohnungen“ wirkungslos, wenn die Startseite selbst abstürzt
- **Severity:** Low · **Status:** Deferred · **AC:** AC-32
- **Repro:** Fehler auf `/wohnungen` → Knopf „Zu den Wohnungen“ tut nichts (EC-1-Sperre `rahmen-kontext.tsx:238`). Gegenprobe `scratchpad/probe/fehler-startseite.test.tsx`: `/konto` passed, `/wohnungen` failed (0 Push-Aufrufe).
- **Class:** Fester Rahmen-Link auf den aktuellen Pfad wird durch die EC-1-Sperre wirkungslos.
- **Sweep:** `grep -rn "<RahmenLink" src --include=*.tsx | grep -v "\.test\."` → 5 Treffer, betroffen nur `inhalt-meldungen.tsx:12`.

### BUG-7 — „Verwerfen“ beim Überfahren im Dunkelmodus 4,07:1
- **Severity:** Low · **Status:** Deferred · **AC:** AC-31
- **Messung:** `#F07A7A` auf Hover-Mischung `#3A3C43` → 4,07.
- **Class/Sweep:** wie BUG-3 (Hover-Hintergründe) – `grep -rn "hover:" src/components/rahmen --include=*.tsx | grep -v "\.test\."`.

## Sicherheit (Red Team)

Kontrollen: SEC-01, -02, -03, -05, -06 (SEC-04/-07 nicht zutreffend). **12 verifiziert, 7 NOT VERIFIED, 2 Befunde (BUG-2, BUG-5).**

- [x] Auth-Bypass ohne Sitzung — `curl` auf `/`, `/wohnungen`, `/mieter`, `/mietvertraege`, `/darlehen`, `/export-import`, `/konto`, `/rahmen-test`, `/wohnungen/123`, `/irgendwas` → je 307 `/anmelden?weiter=…`; `src/proxy.ts:14-29` (fail closed). Ausnahme: BUG-2.
- [x] Header-Tricks — `x-middleware-subrequest`, `RSC: 1` + Prefetch auf `/konto` → 307.
- [x] Abmelden nur per Server-Action — GET `/abmelden`, `/logout`, `/auth/abmelden`, `/signout` → 307; Cross-Origin-POST mit `Next-Action` → 500 „Invalid Server Actions request.“
- [x] Open Redirect — `//evil.com`, `/\evil.com` → 308 auf gleichen Host; `weiter=` mit `//evil.com`, `https://…`, `javascript:` → `/wohnungen` (`konto.schema.ts:65-73`).
- [x] Injection über Pfad/Parameter — Script-Payload escaped; 0 Treffer `dangerouslySetInnerHTML|innerHTML|eval(|new Function|document.title` außerhalb `components/ui`.
- [x] Darstellungs-Skript/localStorage — Argumente fest, Wert nur in `classList.add` mit try/catch; Whitelist `use-menues.ts:54, 62`.
- [x] Cookie `wohnwerk-fenster` — nur `1` gilt, Wert wird nie ausgegeben (`rahmen.rules.ts:40-42`).
- [x] Secrets im Client-Bundle — 0 Treffer für Brevo-/Supabase-Secret-Muster, `service_role`, JWT in `.next/static` und `.next/dev/static`.
- [x] Secrets in Git-Historie — `git log -p --all` mit Key-Mustern → 0; nur `.env.local.example` getrackt.
- [x] Security-Header (Dev) — XFO DENY, CSP `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, HSTS (`next.config.ts:6-20`).
- [x] Zugangsdaten in der URL — Rahmen ohne Formulare; Konto-Formulare `method="POST"` mit Server-Action.
- [x] Fehlerseiten ohne Details — `(angemeldet)/error.tsx:8-15`, `global-error.tsx:9-30`.
- [!] Autorisierung Nutzer X gegen Y — NOT VERIFIED: keine Sitzungen. Code: RLS `(select auth.uid()) = id` (`konto_basis.sql:60-63`).
- [!] Sensible Daten in angemeldeten Antworten — NOT VERIFIED: keine Sitzung. Code: nur Name/E-Mail und Version (`layout.tsx:58`).
- [!] BUG-2 mit echter Teil-Sitzung — NOT VERIFIED: nur über Code und Proxy-Umgehung belegt.
- [!] Rate-Limiting — NOT VERIFIED: nicht implementiert (optional für MVP), Rahmen hat keine eigenen Endpunkte.
- [!] Brute Force / Kontoaufzählung — NOT VERIFIED: nicht Teil dieses Features (PROJ-1, Approved); keine `[user]`-Aufgaben in `tasks.md`.
- [!] Produktions-Server (prod-404 `/rahmen-test`, keine Stacktraces, Header auf Vercel) — NOT VERIFIED: nur Dev-Server lief.
- [!] Skript-CSP mit Nonce — NOT VERIFIED: bewusst auf `/deploy` verschoben (`design.md`).

## Regression

- [x] Keine Features im Status „Deployed“ (`features/INDEX.md`).
- [x] PROJ-1 öffentliche Seiten `/anmelden`, `/registrieren`, `/passwort-vergessen`, `/link-ungueltig`, `/datenschutz`, `/impressum` → 200 mit korrekten Tab-Titeln.
- [x] PROJ-1 Formulare POST + Turnstile; ohne Token → „Die Sicherheitsprüfung ist fehlgeschlagen.“
- [x] PROJ-1 `weiter`-Bereinigung, `/auth/bestaetigen`, `/passwort-neu` ohne Sitzung → wie spezifiziert.
- [x] Sicherheits-Header unverändert (`next.config.ts` im Diff `9618717..HEAD` unverändert).
- [x] Keine abgeschwächten Prüfungen: 0 `.skip/.only`, 0 `eslint-disable/@ts-ignore/as any` in neuen Zeilen; 0 entfernte `expect(` in PROJ-1-Tests.
- [!] Kontoseite im Rahmen, Abmelden, Statusleiste mit Name zur Laufzeit — NOT VERIFIED: keine Sitzung; Code und Tests `sitzungswaechter`, `auth.actions`, `konto.actions`, `proxy` grün.

## Automatisierte Tests

- [x] Unit/Integration — `npm test`: 26 Dateien, 603 bestanden, 0 fehlgeschlagen.
- [!] Layer-Suiten — entfällt (`layers: []`).

## Unit-Tests aus diesem QA-Lauf

Keine neuen Unit-Tests übernommen. Die Rahmen-Logik (`rahmen.rules`, `navigation.rules`, `rahmen-kontext`, `ungespeichert-waechter`, `use-menues`) ist bereits mit Komponententests abgedeckt. Die beiden Gegenproben (`zurueck-nach-wechsel.test.tsx`, `fehler-startseite.test.tsx`, im Scratchpad) schlagen heute wegen BUG-1 bzw. BUG-6 fehl. Sie belegen die Bugs und gehören als Regressionstests zu deren Fix in `/build`, nicht als grüne Tests in diesen Bericht.

## E2E-Tests

Nicht ausgeführt. Eine Playwright-Suite existiert (`tests/rahmen-*.spec.ts`), braucht aber Browser-Engines und eine menschliche Anmeldung über CDP. `test-results/.last-run.json` („passed“, 16.11. 09:29) ist kein Beleg dieses Laufs.

## Nicht geprüft in diesem Lauf

- **Angemeldete Laufzeit** (keine Sitzung, CAPTCHA, SEC-01): AC-6, 8, 9, 10, 14, 15, 32, 36 (`document.title`), EC-2, Kontoseite und Abmelden im Rahmen, Autorisierung X/Y, BUG-2 mit Teil-Sitzung.
- **Kein Browser/Viewport:** Optik (AC-1), Scrollen (AC-2), Vollbild (AC-3), Hell/Dunkel-Wirkung und Aufblitzen (AC-18, 20, EC-6, EC-8), Klick außerhalb (AC-12, 25), Handy-Ansicht (AC-24, AC-26), native Rückfrage (AC-28), Fokus und Tab-Reihenfolge (AC-30), Größenänderung (EC-4), Cross-Browser.
- **Zeitmessung:** AC-34, AC-35.
- **AC-31:** nur über Farb-Tokens gemessen; Textlage auf dem Verlauf geschätzt.
- **Produktions-Server:** prod-404 der Testseite, Fehlerantworten, Header nach Vercel-Auslieferung.
- **E2E-Suite:** nicht ausgeführt.

## Auch bemerkt (kein Bug dieses Features)

- `features/INDEX.md` → Deployments enthält noch die Beispielzeile `v1.0.0 · … app.example.com`; widerspricht den Status – Thema für `/deploy` bzw. `/audit`.
- `AbmeldenKnopf` (PROJ-1) ungenutzt – laut `design.md:257` bewusst, Thema für `/cleanup`.
- Kontoseite behält ihre eigene Statuszeile (zwei Statuszeilen unter `/konto`) – laut `design.md:255` bewusst.

## Entscheidung

**NOT READY** – BUG-1 (High, AC-27) ist offen. Status bleibt **In Review**.
