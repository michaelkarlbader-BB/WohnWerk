# QA-Bericht – PROJ-2: App-Rahmen & Navigation

## Nachprüfung 2026-11-16 (3. Lauf) · Branch `feat/PROJ-2-app-rahmen-navigation` @ `9889f65`

- **Umfang:** `git diff --stat bd84bed..HEAD` → 10 Dateien. Produktivdateien: `src/components/rahmen/ungespeichert-waechter.tsx`, `src/components/rahmen/verlauf.ts`, `src/features/konto/seite-schuetzen.ts` (neu), `src/app/(angemeldet)/{[...pfad],konto,wohnungen,rahmen-test}/page.tsx`, `rahmen-test/rahmen-test-seite.tsx` (neu). Der Diff berührt die Zugangsprüfung, deshalb wurde in voller Breite geprüft: drei unabhängige `qa-engineer`-Lanes ohne Kenntnis des Builds; Zusammenführung durch den Owner.
- **Testsuite (einmal, vor den Lanes):** `npm test` → 28 Dateien, **636 bestanden, 0 fehlgeschlagen**. Keine Prüfung abgeschwächt: Testdateien ohne entfernte `expect`/`it`; in neuen Zeilen kein `.skip`/`.only`/`eslint-disable`/`ts-ignore`. `npm run typecheck`, `eslint` auf die Diff-Dateien, `npm run check:structure` → 0 Fehler.
- **Nicht erneut geprüft:** alles aus Lauf 1/2, das der Diff nicht berührt (*unverändert seit 2026-11-16, in diesem Lauf nicht erneut geprüft*). Migrations-Roundtrip: übersprungen (keine Schema-Änderung). Produktions-Build: nicht ausgeführt; nur das vorhandene `.next/`-Artefakt (15:53) geprüft.

### Ergebnis 3. Lauf

| | |
|---|---|
| BUG-1 (High) | **geschlossen** – Gegenprobe `scratchpad/probe/qa3-zurueck.test.tsx` (echte jsdom-History): R1, R3, (a), (b), mehrfaches Hin und Her, Rückkehr auf alten Wächter-Eintrag, Schublade → grün; Kontrolllauf gegen `bd84bed` schlägt bei R1/R3 fehl. Wächter vergleicht jetzt eine Eintrags-Kennung (`ungespeichert-waechter.tsx:31,49-52,58,65`, `verlauf.ts:19-22`). Sweep `markeAnlegen(` → 4 Treffer, alle korrekt. |
| BUG-2 (Medium) | **geschlossen** – jede Seite prüft selbst (`seite-schuetzen.ts:12-24`, fail closed, `redirect` außerhalb `try`). Sweep `find "src/app/(angemeldet)" -name page.tsx \| xargs grep -L seiteSchuetzen` → **0** (vorher 3). RSC-Teilrendering ohne Sitzung auf 11 Pfaden (`/x.png`, `/konto.png`, `/wohnungen.svg`, `/rahmen-test.png`, `/x/y.jpg`, …) → `NEXT_REDIRECT;replace;/anmelden` aus `seiteSchuetzen`, kein Seiteninhalt. Mit echter Sitzung (beide QA-Nutzer): `ww-aktiv` frisch → Seite erreichbar; abgelaufen/fehlend/manipuliert/Zukunft → Redirect; E-Mail in keiner Antwort. |
| Neue Befunde | BUG-10 (Low), BUG-11 (Medium, bestand schon vor dem Fix), BUG-12 (Low, durch den Fix neu), BUG-13 (Low) – alle **Deferred** (Stoppregel der Nachprüfung) |
| Empfehlung | **READY** – kein offener Critical/High/Medium-Bug |

**Im Diff erneut geprüft:** AC-27 PASS (Probe, Wege oben), AC-28 PASS (Mechanismus; native Rückfrage [!] NOT VERIFIED), AC-29 PASS (Suite-Tests), AC-25 PASS (`schublade.test.tsx`, Probe), EC-3, EC-8 PASS (Code), AC-4/AC-8 abgemeldet PASS (`curl` → 307 mit `weiter`), AC-5, AC-10/EC-2, AC-14, AC-32, AC-36 PASS über Code und `zugang.test.tsx` (5 Seiten × 5 Fälle, 25/25).

**Sicherheit 3. Lauf (SEC-01, -02, -03, -05, -08):** 7 verifiziert – Auth-Bypass HTML (12 Pfade) und RSC (11 Pfade + Prefetch-Varianten), Inaktivität mit echter Sitzung, `x-middleware-subrequest` (6 Varianten) → 307, Secrets in `.next/static` → 0, `seiteSchuetzen` nicht im Client-Bundle (`server-only`), Open Redirect über `weiter` → `/wohnungen`, `prerender-manifest.json` ohne geschützte Seiten. 6 NOT VERIFIED (siehe unten).

**Regression 3. Lauf:** PROJ-1-Seiten → 200; geschützte Routen → 307 mit `weiter`; Assets 200; Kontoseite und Testseite im Code verhaltensgleich (`git show bd84bed:…`).

**[!] NOT VERIFIED in diesem Lauf:**
- AAL2 zur Laufzeit – beide QA-Konten ohne 2FA; nur Code (`zugang.ts:24-31,46`) und `zugang.test.tsx`.
- Echter Browser: Zurück/Vorwärts/Verlaufsmenü am echten App Router, native Rückfrage, Optik, Handy.
- Angemeldete Darstellung von Kontoseite, Auffangseite und `/wohnungen` (nur RSC-/HTML-Statuscodes mit Sitzung geprüft).
- Produktions-Server: Testseite als 404, Fehlerantworten ohne Stacktrace.
- E2E-Suite: nicht ausgeführt.
- Autorisierung X gegen Y, Rate-Limiting, Injection: der Diff hat weder Datenzugriff noch Endpunkte mit Eingabe.

**Unit-Tests aus diesem Lauf:** keine übernommen. Die Gegenprobe `qa3-zurueck.test.tsx` hat einen Red-Check durchlaufen (alter Wächter: 4 rot, neuer: 3 rot = BUG-11/BUG-12). Wegen dieser beiden offenen Fälle bleibt sie im Scratchpad und kommt beim Fix von BUG-11/12 als Regressionstest mit.

**Hinweis:** Die QA-Passwort-Variablen heißen in `.env.local` `QA_TEST_PASSWORT`/`QA_TEST2_PASSWORT`; `.env.local.example` enthält die QA-Variablen noch nicht (Thema für `scripts/qa-sitzung.mjs`).

---

## Nachprüfung 2026-11-16 (2. Lauf) · Branch `feat/PROJ-2-app-rahmen-navigation` @ `b1f59e3`

- **Umfang:** `git diff --stat e10eb37..HEAD` → Produktivdateien `src/proxy.ts`, `src/features/konto/zugang.ts` (neu), `src/app/(angemeldet)/layout.tsx`, `src/app/(angemeldet)/konto/page.tsx`, `src/app/globals.css` (Z. 271), `src/components/rahmen/ungespeichert-waechter.tsx`. Weil Proxy/Auth betroffen sind: volle Breite, drei unabhängige `qa-engineer`-Lanes ohne Kenntnis des Builds; Zusammenführung durch den Owner.
- **Testsuite (einmal, vor den Lanes):** `npm test` → 28 Dateien, **619 bestanden, 0 fehlgeschlagen**. Prüfdefinitionen nicht abgeschwächt (`git diff e10eb37..HEAD -- '*.test.*' …` → 0 entfernte Zeilen).
- **Neu: angemeldete Laufzeitprüfung.** Zwei QA-Testnutzer (Dev, Turnstile-Testschlüssel) per einmaligem Playwright-Skript im Scratchpad angemeldet; Zugangsdaten nur von Node aus `.env.local` geladen, nie angezeigt. Beide landeten auf `/wohnungen`.
- Ergebnisse aus dem 1. Lauf, die der Diff nicht berührt, gelten weiter (*unverändert seit 1. Lauf, nicht erneut geprüft*). Migrations-Roundtrip: übersprungen – Diff ohne Schema-Änderung. Produktions-Build: nicht in diesem Lauf.

### Ergebnis 2. Lauf

| | |
|---|---|
| Offene Bugs aus Lauf 1 | BUG-3 **geschlossen**; BUG-1 **weiter offen** (neuer Weg, gleiche Klasse); BUG-2 **teilweise** geschlossen (HTML-Weg zu, RSC-Weg offen) |
| Neue Befunde | BUG-8 (Low), BUG-9 (Low) |
| Angemeldet geprüft | Rahmen rendert auf `/wohnungen`, `/mieter`, `/konto`, `/irgendwas` (200, Werkzeugleiste, Statuszeile „Angemeldet: QA Test 2 …“, Menü Datei/Bearbeiten/Ansicht/Hilfe, Bereichsliste); `/` und `/anmelden` → 307 `/wohnungen`; abgelaufenes bzw. fehlendes `ww-aktiv` → 307 `/anmelden`, auch auf `/konto.png`; die Sitzung wurde dabei serverseitig beendet (Folgeaufruf → 307) |
| Empfehlung | **NOT READY** – BUG-1 (High) ist offen |

---

## Erster Lauf 2026-11-16 @ `bef57b2` (Basis, soweit oben nicht aktualisiert)

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
- [x] AC-5 — 2. Lauf: angemeldet `/` und `/anmelden` → 307 `/wohnungen`; Login landete auf `/wohnungen`. — `src/app/page.tsx:5` → `/wohnungen`; Fallback nach Anmeldung `konto.schema.ts:65`, `auth.actions.ts:190`.
- [x] AC-6 — `navigation.rules.ts:68-81`, `bereichsliste.tsx` (`aria-current`); Tests `bereichsliste.test.tsx`, `navigation.rules.test.ts`.
- [x] AC-7 — Verzeichnis `navigation.rules.ts:22-30` (`gebaut: false`); Tests `bereichsliste`, `menueleiste`, `schublade`, `use-menues` (je AC-7).
- [x] AC-8 — abgemeldet: `/wohnungen/123?x=1` → 307 `/anmelden?weiter=%2Fwohnungen%2F123%3Fx%3D1`; Rücksprung `sichereRuecksprungadresse`. Angemeldetes Lesezeichen [!] NOT VERIFIED.
- [x] AC-9 — Ableitung aus `usePathname`, `rahmen-kontext.tsx:253-261`; Test `rahmen-kontext.test.tsx` (AC-9). Echter Browser-Verlauf [!] NOT VERIFIED.
- [x] AC-10 — 2. Lauf: angemeldet `curl /irgendwas` → 200 im Rahmen. — `(angemeldet)/[...pfad]/page.tsx:10-12` → `notFound()` → `NichtGefunden`; Test `inhalt-meldungen.test.tsx`.
- [x] AC-11 — `navigation.rules.ts:141-167` wörtlich; Tests `navigation.rules.test.ts`, `menueleiste.test.tsx`.
- [x] AC-12 — Tests `menueleiste.test.tsx` (Auswahl, Esc). Klick außerhalb (Radix) [!] NOT VERIFIED.
- [x] AC-13 — gemeinsame `aktionAusfuehren` in `use-menues.ts`/`werkzeugleiste.tsx`; Tests `use-menues`, `werkzeugleiste`, `rahmen-kontext`.
- [x] AC-14 — 2. Lauf: angemeldet `curl /konto` → 200 im Rahmen; `konto/page.tsx:17-22` nutzt `zugangPruefen`. — `(angemeldet)/konto/page.tsx` (`variante="eingebettet"`); Test `menueleiste.test.tsx` (AC-14).
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
- [ ] AC-27 — **FAIL → BUG-1** (2. Lauf: Wege a/b behoben, Rückkehr-Weg R1/R3 offen). Übrige Wege (Bereichswechsel, Menüziel, Abmelden, einfaches Zurück) bestehen: `rahmen-kontext.tsx:221-250, 325-338`; Tests `rahmen-kontext`, `ungespeichert-waechter`.
- [x] AC-28 — `ungespeichert-waechter.tsx:28-37`; Test „lets the browser ask only while changes are unsaved“. Native Rückfrage [!] NOT VERIFIED.
- [x] AC-29 — Tests `rahmen-kontext.test.tsx`, `ungespeichert-waechter.test.tsx` (AC-29).
- [x] AC-30 — Fokus-Stil `globals.css:339-344`; Esc-Tests in `menueleiste`, `schublade`, `ungespeichert-waechter`. Tab-Reihenfolge/sichtbarer Fokus [!] NOT VERIFIED.
- [x] AC-31 — 2. Lauf: BUG-3 geschlossen – `globals.css:271`, schlechtester Punkt 4,97:1 (dunkel), hell ≥ 5,12; Test `src/app/farben.test.ts`. BUG-7 (Hover 4,07) bleibt Deferred. 1. Lauf: FAIL. Hellmodus ≥ 5,12; alle anderen Paare ≥ 4,88 (WCAG-Formel über Tokens).
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
- **Severity:** High · **Status:** Closed (3. Lauf, Gegenprobe `qa3-zurueck.test.tsx`, Sweep 4 Treffer korrekt) · **AC:** AC-27
- **Repro:** (a) auf Seite A ändern → speichern → über Bereichsliste nach B → auf B ändern → Browser-Zurück: kein Dialog, Eingaben auf B weg. (b) auf A ändern → Bereichswechsel mit „Verwerfen“ → auf B ändern → Zurück: kein Dialog. Gegenprobe (jsdom-History) `scratchpad/probe/zurueck-nach-wechsel.test.tsx`: 2 failed, Kontrollfall passed.
- **Ursache:** `ungespeichert-waechter.tsx:43` legt keinen neuen Wächter-Eintrag an, solange `eintragAktiv.current` `true` ist; das Flag wird nur im popstate-Handler (`:52`) zurückgesetzt, nicht bei Pfadwechsel oder Speichern. Zurück landet auf dem veralteten Eintrag von A, `:51` bricht still ab.
- **Class:** Zustand eines Verlaufs-Wächters (Ref) überlebt Pfadwechsel/Speichern und deckt dann einen fremden Verlaufseintrag ab.
- **Sweep:** `grep -rn "markeAnlegen(" src --include=*.ts --include=*.tsx | grep -v "\.test\."` → 4 Treffer (`schublade.tsx:58`, `ungespeichert-waechter.tsx:44, 58`, Definition `verlauf.ts:10`).
- **2. Lauf:** Wege (a) und (b) behoben (Gegenprobe `zurueck-nach-wechsel.test.tsx` 3/3 grün). **Neuer Weg derselben Klasse:** `eintragPfad` (`ungespeichert-waechter.tsx:31`) merkt sich nur die Adresse, nicht den Verlaufseintrag, und wird nur im popstate-Handler (`:58`) zurückgesetzt. Bei A → B → A gilt `eintragPfad === pfad`, `:49` legt keinen neuen Eintrag an; Zurück verlässt A, landet auf B, die Eingaben auf A sind weg, der Dialog erscheint erst auf B.
  - R1: auf A ändern → speichern → nach B → per Bereichsliste zurück nach A → ändern → Browser-Zurück. R3: wie R1, Wechsel aber mit „Verwerfen“. Gegenproben `scratchpad/probe/rueckkehr.test.tsx`, `verwerfen-rueckkehr.test.tsx` → FAIL (`expected '/b' to be '/a'`); Kontrollfall grün.
  - Die neuen Unit-Tests prüfen nur A → B, nicht die Rückkehr.
  - Sweep 2. Lauf: 4 Treffer (`schublade.tsx:58`, `ungespeichert-waechter.tsx:50, 64`, `verlauf.ts:10`).

### BUG-2 — Adressen mit Bildendung umgehen den Proxy (2FA- und Inaktivitätsprüfung)
- **Severity:** Medium · **Status:** Closed (3. Lauf; Sweep jetzt `… | xargs grep -L seiteSchuetzen` → 0) · **Sicherheit:** SEC-03
- **Repro:** `curl -i localhost:3000/konto.png` → 307 `/anmelden` **ohne** `weiter` (Layout-Redirect, Proxy lief nicht); `curl -i localhost:3000/konto` → 307 `/anmelden?weiter=%2Fkonto` (Proxy). Gleich für `/wohnungen.svg`, `/x/y.jpg`.
- **Ursache:** Matcher `src/proxy.ts:106` nimmt `.svg|png|jpg|jpeg|gif|webp` aus; solche Pfade landen in `(angemeldet)/[...pfad]`. Das Layout (`layout.tsx:15-24, 53`) prüft nur `getUser()` – weder AAL2 (`proxy.ts:42-50`) noch Aktivitäts-Cookie (`proxy.ts:67`). Eine Sitzung mit offenem zweitem Faktor oder abgelaufener Inaktivität sieht den Rahmen samt E-Mail. Datensätze heute geschützt durch restriktive RLS (`20261114175034_konto_basis.sql:71`); jede künftige dynamische Route erbt die Lücke. Widerspricht `design.md` („alle Routen … durch die Anfrage-Grenze geschützt“).
- **Class:** Geschützte Route an der Anfrage-Grenze vorbei erreichbar (Matcher-Ausnahme nach Dateiendung) und Rückfallprüfung im Layout schwächer als der Proxy.
- **Sweep:** `find "src/app/(angemeldet)" -path "*[*" -name page.tsx` → 1; `grep -rln "auth.getUser()" src/app | xargs grep -L "getAuthenticatorAssuranceLevel\|aal2"` → 2 (`(angemeldet)/layout.tsx`, `konto/page.tsx`).
- **2. Lauf – geschlossen (HTML-Weg):** Layout und Kontoseite nutzen `zugangPruefen` (`zugang.ts:38-48`: Sitzung → Inaktivität → AAL, schlägt geschlossen fehl). Abgemeldet: `/konto.png`, `/x.svg`, `/x/y.jpg`, `/x.webp`, `/konto/x.png` → 307 `/anmelden`. Angemeldet mit abgelaufenem bzw. fehlendem `ww-aktiv`: `/konto.png` → 307 `/anmelden` (Owner-Probe mit echter Sitzung). Alter Sweep 2 → 0.
- **2. Lauf – noch offen (RSC-Weg):** RSC-Teilrendering überspringt das Layout. `curl -H "RSC: 1" -H "Next-Router-State-Tree: <Baum, (angemeldet) schon gerendert>" "localhost:3000/y.png?_rsc=…"` ohne Sitzung → **200** `text/x-component`; `layout.tsx` lief nicht (kein `NEXT_REDIRECT`), gerendert wurde `[...pfad]/page.tsx` → `notFound()`. Heute keine Daten erreichbar; jede künftige dynamische Seite (z. B. `/wohnungen/[id]` mit id `abc.png`) liefe ohne Proxy und ohne Layoutprüfung, und RLS kennt keine Inaktivität. Widerspricht dem neuen `design.md`-Eintrag. Belege `scratchpad/rsc3.txt`, `rsc4.txt`.
- **Class (geschärft):** Zugangsprüfung nur in Proxy/Layout statt an Seite bzw. Datenzugriff; Layouts werden bei RSC-Teilrendering übersprungen, der Matcher lässt Pfade nach Dateiendung aus.
- **Sweep (2. Lauf):** `find "src/app/(angemeldet)" -name page.tsx | xargs grep -L zugangPruefen` → 3 (`rahmen-test`, `wohnungen`, `[...pfad]`).

### BUG-3 — Titelleiste im Dunkelmodus unter 4,5:1 Kontrast
- **Severity:** Medium · **Status:** Closed (2. Lauf: 4,97:1 am schlechtesten Punkt; Sweep 5 Treffer, alle über die Utility `titlebar`) · **AC:** AC-31
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

### BUG-8 — Proxy-Matcher-Ausnahmen ohne Schrägstrich (neu, 2. Lauf)
- **Severity:** Low · **Status:** Deferred
- **Befund:** `src/proxy.ts:84` nimmt `_next/static`, `_next/image`, `favicon.ico` als Präfix ohne `/` aus. `curl -i /_next/staticx`, `/favicon.icox` → 307 `/anmelden` ohne `weiter`, also ohne Proxy. Folgen heute wie BUG-2 (nur Auffangseite).
- **Class:** wie BUG-2/BUG-4 (Matcher-Ausnahmen). **Sweep:** `grep -n "matcher" src/proxy.ts` → 1.

### BUG-9 — `zweiFaktorPruefen` belebt abgelaufene Sitzung ohne Inaktivitätsprüfung (neu, 2. Lauf)
- **Severity:** Low · **Status:** Deferred · **Sicherheit:** SEC-03
- **Befund:** Auf vom Proxy ausgelassenen Pfaden laufen Actions aus `auth.actions.ts` ohne Proxy. `zweiFaktorPruefen` (`auth.actions.ts:194-215`) setzt das Aktivitäts-Cookie, ohne Inaktivität zu prüfen; mit gültigem TOTP-Code ließe sich eine abgelaufene aal1-Sitzung wiederbeleben. `konto.actions.ts:73-83` prüft aal2, aber keine Inaktivität. Nicht mit echter Sitzung nachgestellt (Einschätzung aus Code).
- **Class:** Server-Actions ohne eigene Zugangsprüfung (verlassen sich auf den Proxy). **Sweep:** `grep -L "istInaktiv\|zugangPruefen" src/features/*/*.actions.ts` → 1 (`konto.actions.ts`), dazu `zweiFaktorPruefen` in `auth.actions.ts`.

### BUG-10 — `crypto.randomUUID()` ohne Rückfallweg im Verlaufs-Wächter (neu, 3. Lauf)
- **Severity:** Low · **Status:** Deferred
- **Repro (aus dem Code):** Dev-Server über `http://<LAN-IP>:3000` am Handy öffnen, auf einer Seite mit `ungespeichert` tippen → `crypto.randomUUID is not a function`, Rahmen stürzt ab. HTTPS und localhost sind nicht betroffen. Im Browser [!] NOT VERIFIED.
- **Class:** Browser-API, die einen sicheren Kontext verlangt, ohne Rückfallweg in gemeinsam genutztem Rahmen-Code.
- **Sweep:** `grep -rn "randomUUID\|crypto.subtle" src --include=*.ts --include=*.tsx | grep -v "\.test\."` → 1 (`verlauf.ts:20`).

### BUG-11 — Sprung über mehrere Verlaufseinträge oder Vorwärts verlässt die Seite vor der Rückfrage (neu, 3. Lauf)
- **Severity:** Medium · **Status:** Deferred (in einer Nachprüfung neu gefunden, nicht blockierend; bestand schon vor dem Fix) · **AC:** AC-27
- **Repro:** (1) A → B → A (Bereichsliste) → ändern → `history.go(-2)` (Verlaufsmenü am Zurück-Knopf) → landet auf `/b`, Dialog erst dort, Eingaben auf A weg. (2) A ändern → B mit „Verwerfen“ → Zurück → A ändern → Vorwärts → `/b`. Probe `qa3-zurueck.test.tsx`: `expected '/b' to be '/a'`; Kontrollfall mit `bd84bed` ebenfalls rot. Workaround: einzelnes Zurück fragt korrekt.
- **Class:** Der Zurück-Wächter fängt nur den einen Schritt auf den Eintrag direkt darunter ab (Konzept „ein Zusatzeintrag“, `design.md:233`).
- **Sweep:** `grep -rn "addEventListener('popstate'" src --include=*.ts --include=*.tsx | grep -v "\.test\."` → 3 (`schublade.tsx:62, 90`, `ungespeichert-waechter.tsx:69`).

### BUG-12 — Speichern mit Revalidierung löscht die Kennung des Wächter-Eintrags (neu, 3. Lauf, durch den Fix entstanden)
- **Severity:** Low · **Status:** Deferred · **AC:** AC-27
- **Repro (Probe):** A → B → A, ändern, Next ersetzt `history.state` (`replaceState({__NA:true})`, wie bei Server-Action mit `revalidatePath`/`router.refresh`), speichern, ändern, Zurück, „Verwerfen“ → bleibt auf `/a`, erst ein zweites Zurück verlässt die Seite. Kein Datenverlust. Ursache: Next 16 schreibt `history.state` ohne eigene Felder neu (`app-router.js:95-110`, `app-router-state.js:433-438`). Heute latent (nur die Testseite meldet `ungespeichert`), ab PROJ-3 der Normalfall.
- **Class:** Die Identität des Wächters liegt in `history.state`, das Next.js bei Revalidierung überschreibt.
- **Sweep:** `grep -rn "revalidatePath\|router.refresh" src --include=*.ts --include=*.tsx | grep -v "\.test\."` → 3 (alle `konto.actions.ts`, keine Seite mit `ungespeichert`).

### BUG-13 — Seitenschutz nur als Konvention: nicht dokumentiert, nicht erzwungen (neu, 3. Lauf)
- **Severity:** Low · **Status:** Deferred · **Sicherheit:** SEC-03
- **Befund:** `design.md:262` nennt die Prüfung nur für Proxy, Layout und Kontoseite; `docs/app-shell.md:89` nur `src/proxy.ts`. Die Regel „jede `page.tsx` unter `(angemeldet)` ruft `seiteSchuetzen` auf, weil RSC das Layout überspringt“ steht nirgends. `zugang.test.tsx:54-71` zählt die Seiten von Hand auf; eine neue Seite (z. B. `/wohnungen/[id]` in PROJ-3) ohne Aufruf öffnet den BUG-2-Weg wieder, ohne dass ein Test anschlägt.
- **Class:** Sicherheitskonvention nur im Code, ohne Doku und ohne automatische Prüfung.
- **Sweep:** `grep -rn "seiteSchuetzen" features/PROJ-2-app-rahmen-navigation/design.md docs/app-shell.md` → 0; `find "src/app/(angemeldet)" -name page.tsx | xargs grep -L seiteSchuetzen` → 0 (heute alle geschützt).

## Sicherheit (Red Team)

**2. Lauf:** SEC-01, -03, -05. Verifiziert: kodierte/verbogene Pfade (`/konto%2Epng`, `/konto.png%00`, `/KONTO`, `/konto;.png` …) → 307; Header-Tricks (`x-middleware-subrequest` ×3, Prefetch, `x-nextjs-data`, `x-invoke-path`, `x-matched-path`) → 307; Proxy-Logik nach Umstellung ohne Abschwächung; Secrets im Bundle → 0 (nur öffentlicher Turnstile-Site-Key); 15/15 Formulare per Server-Action/POST; Inaktivität mit echter Sitzung erzwungen, inkl. serverseitiger Abmeldung. Befunde: BUG-2 (Rest), BUG-8, BUG-9. [!] NOT VERIFIED: Autorisierung X gegen Y (PROJ-2 hat keine eigenen Datensätze zum Vergleichen), Produktions-Build.

**1. Lauf:**

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

**2. Lauf:** PROJ-1-Seiten (`/anmelden`, `/registrieren`, `/passwort-vergessen`, `/link-ungueltig`, `/datenschutz`, `/impressum`) → 200; geschützte Routen → 307 mit `weiter`; statische Assets 200; PROJ-1 AC-5/7/9/10/12–15/18/19 im Code unverändert bzw. über `zugangPruefen` gleichwertig; angemeldet Login → `/wohnungen`, Kontoseite 200. E2E-Suite [!] NOT VERIFIED – `tests/anmelden.setup.ts:50` erwartet eine CDP-Sitzung; das geplante `scripts/qa-sitzung.mjs` fehlt noch.

**1. Lauf:**

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

**3. Lauf: READY** – BUG-1 und BUG-2 geschlossen, kein offener Critical/High/Medium-Bug. Deferred: BUG-4 bis BUG-13 (außer dem geschlossenen BUG-3). Status → **Approved**. Nicht geprüft und bewusst offen: Browser-Verhalten, angemeldete Darstellung, AAL2 zur Laufzeit, Produktions-Server (siehe oben).

**2. Lauf: NOT READY** – BUG-1 (High, AC-27) ist weiter offen (Rückkehr-Weg). BUG-2 (Medium) bleibt Open für den RSC-Weg. BUG-3 geschlossen. BUG-4 bis BUG-9 Deferred. Status bleibt **In Review**.

1. Lauf: NOT READY – BUG-1 (High, AC-27) offen.
