# PROJ-1 Aufgaben – Benutzerkonto & Login

> Erzeugt von `/tasks` aus `spec.md` + `design.md`. Der geordnete, nachvollziehbare Bauplan – die Brücke zwischen Vertrag (WAS) und Umsetzung (WIE).
> `[P]` = parallelisierbar: Die Dateien der Aufgabe sind disjunkt zu allen anderen `[P]`-Aufgaben derselben Ebene, `/build` kann sie an einen eigenen Subagenten geben.
> Ebenen laufen **nacheinander** (jede ist eine Schranke). Aufgaben **innerhalb** einer Ebene laufen parallel, wo `[P]` steht. Jede Aufgabe verweist auf die AC-IDs aus `spec.md` – die Kette AC → Aufgabe → Test.
> `[user]` = eine Einstellung, die nur du im Dashboard eines Anbieters machen kannst: `where:` statt `files:`, nie `[P]`, von dir abgehakt – `/build` übergibt sie, `/deploy` liefert nicht aus, solange sie offen ist.
> `[user go-live]` = dasselbe, braucht aber die Produktiv-URL bzw. das Prod-Projekt: niemand kann sie vor `/deploy` machen, sie blockiert weder `/qa` noch Approved – `/deploy` erledigt sie in Schritt 2 und hakt sie in Schritt 4 ab, sobald sie nachweislich wirkt.
> Owner: `/tasks` erstellt diese Datei; `/build` hakt die Kästchen ab – außer `[user]`-Aufgaben, die hakst du ab.
> Kein Statusfeld hier – der Status des Features steht AUSSCHLIESSLICH in `features/INDEX.md`.

Pfade ohne Präfix unter `components/` bedeuten `src/features/konto/components/`; Module ohne Pfad liegen in `src/features/konto/`. Routen in `(abgemeldet)` / `(angemeldet)` liegen unter `src/app/`.

## Ebene 1 — Fundament (Daten, Regeln, Theme)

- [x] T1 [P]  `supabase init` + Basis-Migration: `profiles` (RLS nur eigene Zeilen, bei eingerichteter 2FA nur mit zweiter Stufe), `registration_allowlist` (nur E-Mail + Anlagedatum, kein Notizfeld; kein Zugriff aus der App), Funktion für den Before-User-Created-Hook (Fallback: Trigger beim Anlegen, falls der Hook im Free-Tarif fehlt), Trigger „Profil anlegen“, `delete_own_account()` (entfernt auch den Freigabelisten-Eintrag zur E-Mail des Kontos), 2FA-Stufen-Helfer, pg_cron-Job „unbestätigte Registrierungen > 7 Tage löschen“  · files: supabase/config.toml, supabase/migrations/<ts>_konto_basis.sql  · → AC-1, AC-2, AC-4, AC-19, AC-21, AC-26, AC-29, EC-5
- [x] T2 [P]  Migration Sperre: `login_attempts` (kein Direktzugriff), Funktionen „ist gesperrt?“, „Fehlversuch zählen“ (nur wenn nicht gesperrt), „Fehlversuche löschen“ (nur eigene E-Mail nach Anmeldung), pg_cron-Job „älter als 24 h löschen“  · files: supabase/migrations/<ts>_konto_sperre.sql  · → AC-22, EC-9
- [x] T3 [P]  Eingaberegeln (E-Mail, Passwort 12–72, Anzeigename, 2FA-Code, „LÖSCHEN“, interne Rücksprungadresse) + Test  · files: src/features/konto/konto.schema.ts, src/features/konto/konto.schema.test.ts  · → AC-3, AC-8, AC-15, AC-16, AC-20
- [x] T4 [P]  Reine Regeln (Sperrentscheidung, Inaktivität 30 Min., Supabase-Fehlercodes → neutrale Meldungen) + Test  · files: src/features/konto/konto.rules.ts, src/features/konto/konto.rules.test.ts  · → AC-6, AC-7, AC-11, AC-22, EC-1, EC-8, EC-9
- [x] T5 [P]  Theme (Design-System-Werte hell/dunkel, Systemschrift, `lang="de"`) + geteilter Fenster-Baustein  · files: src/app/globals.css, src/app/layout.tsx, src/components/retro/window.tsx  · → AC-5, AC-18, AC-25
- [x] T6 [P]  Deutsche Supabase-Mailvorlagen (Bestätigung, Passwort zurücksetzen, E-Mail-Wechsel), Links auf `/auth/bestaetigen`  · files: supabase/templates/bestaetigen.html, supabase/templates/passwort-zuruecksetzen.html, supabase/templates/email-aendern.html  · → AC-1, AC-11, AC-17, AC-28
- [x] T7 [P]  Paket `@marsidev/react-turnstile`, CAPTCHA-Feld, Variablennamen mit Dummy-Werten  · files: package.json, package-lock.json, .env.local.example, src/features/konto/components/captcha-feld.tsx  · → AC-23
- [x] T8 [user]  Supabase-Dev-Projekt anlegen (falls noch nicht geschehen) und URL + Anon-Key in `.env.local` eintragen  · where: supabase.com → New project, Region eu-central-1 (Frankfurt); Project Settings → API → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`  · → AC-21
- [x] T9 [user]  Turnstile-Widget anlegen  · where: Cloudflare Dashboard → Turnstile → Add widget; Hostnamen `localhost` und `test.wohnwerk-mb.de`, Modus „Managed“; Site Key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local`  · → AC-23
- [x] T10 [user]  Brevo-Konto und API-Schlüssel  · where: brevo.com → kostenloses Konto → SMTP & API → API Keys; Absender unter Senders verifizieren; `BREVO_API_KEY`, `MAIL_FROM_ADDRESS` in `.env.local`  · → AC-17, AC-24, AC-27
- [x] T11 [user]  AVV abschließen  · where: Supabase → Organization Settings → Legal Documents; Brevo → Konto → DPA; Cloudflare → DPA; jeweils annehmen  · → kein AC (Datenschutz, `docs/privacy.md`)

## Ebene 2 — Server-Bausteine

<!-- Zu Beginn dieser Ebene spielt /build die Migrationen aus T1/T2 ins Dev-Projekt ein (supabase link + db push). -->

- [x] T12 [P]  Serverseitiger Datenzugriff: Profil lesen/ändern, Fehlversuche prüfen/zählen/löschen, eigenes Konto löschen + Test  · files: src/features/konto/konto.data.ts, src/features/konto/konto.data.test.ts  · → AC-15, AC-18, AC-19, AC-21, AC-22, AC-29
- [x] T13 [P]  App-eigene Mails über Brevo (Hinweis an alte Adresse, „bereits registriert“, Sicherheitshinweis), deutsche Texte + Test  · files: src/features/konto/mail.integration.ts, src/features/konto/mail.integration.test.ts  · → AC-17, AC-24, AC-27, AC-28
- [x] T14 [P]  Proxy: Sitzung am Auth-Server prüfen, Inaktivität (30 Min.) über Aktivitäts-Cookie, Umleitung auf `/anmelden?weiter=…`; Sitzungs-Cookies ohne Ablaufdatum in allen Supabase-Clients + Test  · files: src/proxy.ts, src/proxy.test.ts, src/lib/supabase/proxy.ts, src/lib/supabase/server.ts, src/lib/supabase/client.ts  · → AC-7, AC-8, AC-10, EC-3, EC-4
- [x] T15 [P]  Route für Links aus Mails (Bestätigung, Passwort, E-Mail-Wechsel); ungültig/abgelaufen → Weiterleitung auf `/link-ungueltig` + Test  · files: src/app/auth/bestaetigen/route.ts, src/app/auth/bestaetigen/route.test.ts  · → AC-4, AC-11, AC-17, EC-2
- [x] T16 [user]  CAPTCHA in Supabase einschalten  · where: Supabase (Dev) → Authentication → Attack Protection → Enable Captcha protection; Anbieter Turnstile, Secret Key aus Cloudflare  · → AC-23
- [x] T17 [user]  E-Mail-Bestätigung  · where: Authentication → Sign In / Providers → Email; „Confirm email“ an, „Secure email change“ aus  · → AC-1, AC-17
- [x] T18 [user]  Mindestlänge Passwort  · where: Authentication → Sign In / Providers → Email; 12 Zeichen  · → AC-3
- [x] T19 [user]  Site URL und Weiterleitungen  · where: Authentication → URL Configuration; Site URL `http://localhost:3000`, Redirects `http://localhost:3000/auth/bestaetigen` und `https://test.wohnwerk-mb.de/auth/bestaetigen`  · → AC-4, AC-11
- [x] T20 [user]  Deutsche Mailvorlagen einfügen (aus T6)  · where: Authentication → Emails → Templates (Confirm signup, Reset password, Change email address); Inhalt aus `supabase/templates/`  · → AC-28
- [x] T21 [user]  Freigabe-Hook aktivieren (nach Einspielen von T1)  · where: Authentication → Hooks → „Before User Created“ → Postgres-Funktion aus der Migration; eingeschaltet  · → AC-2
- [x] T22 [user]  Eigene Adresse freigeben  · where: Table Editor → `registration_allowlist` → Insert row; deine E-Mail-Adresse (+ ggf. Testadresse)  · → AC-1

## Ebene 3 — Server Actions

- [x] T23 [P]  Auth-Actions: anmelden, 2FA-Code prüfen, registrieren, Bestätigung erneut senden, Passwort vergessen, neues Passwort setzen, abmelden, überall abmelden, Aktivität melden + Test  · files: src/features/konto/auth.actions.ts, src/features/konto/auth.actions.test.ts  · → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-22, AC-23, AC-24, AC-27, EC-1, EC-6, EC-9
- [x] T24 [P]  Konto-Actions: Anzeigename, E-Mail, Passwort ändern; 2FA einrichten/bestätigen/zweiten Faktor hinzufügen/ausschalten; Konto löschen + Test  · files: src/features/konto/konto.actions.ts, src/features/konto/konto.actions.test.ts  · → AC-12, AC-14, AC-15, AC-16, AC-17, AC-19, AC-20, AC-27, EC-6, EC-8

## Ebene 4 — Oberfläche

- [x] T25 [P]  Fenster „Anmelden“ inkl. 2FA-Schritt, „Bestätigungs-E-Mail erneut senden“, Fußzeile Datenschutz/Impressum; Layout der abgemeldeten Arbeitsfläche  · files: src/features/konto/components/anmelden-form.tsx, src/app/(abgemeldet)/layout.tsx, src/app/(abgemeldet)/anmelden/page.tsx  · → AC-5, AC-6, AC-8, AC-13, AC-22, AC-23, AC-25, EC-1, EC-6
- [x] T26 [P]  Fenster „Registrieren“  · files: src/features/konto/components/registrieren-form.tsx, src/app/(abgemeldet)/registrieren/page.tsx  · → AC-1, AC-2, AC-3, AC-23, AC-24, EC-6
- [x] T27 [P]  Fenster „Passwort vergessen“, „Neues Passwort setzen“ und Meldungsfenster für Link-Fehler  · files: src/features/konto/components/passwort-vergessen-form.tsx, src/features/konto/components/passwort-neu-form.tsx, src/app/(abgemeldet)/passwort-vergessen/page.tsx, src/app/(abgemeldet)/passwort-neu/page.tsx, src/app/(abgemeldet)/link-ungueltig/page.tsx  · → AC-3, AC-11, AC-23, EC-2
- [x] T28 [P]  Angemeldeter Bereich: Layout mit kleiner Statuszeile (Anzeigename bzw. E-Mail), Sitzungswächter (Inaktivität, Abmeldung in anderen Tabs), Platzhalter „Wohnungen“, Weiterleitung von `/`  · files: src/app/(angemeldet)/layout.tsx, src/features/konto/components/sitzungswaechter.tsx, src/app/(angemeldet)/wohnungen/page.tsx, src/app/page.tsx  · → AC-4, AC-5, AC-7, AC-15, EC-3, EC-4
- [x] T29 [P]  Registerkarte „Allgemein“ (E-Mail, Anzeigename, angelegt am, 2FA-Status; Anzeigename/E-Mail ändern)  · files: src/features/konto/components/konto-allgemein.tsx  · → AC-15, AC-17, AC-18, EC-8
- [x] T30 [P]  Registerkarte „Sicherheit“ (Passwort ändern, 2FA einrichten/zweiter Authenticator/ausschalten, Abmelden, überall abmelden)  · files: src/features/konto/components/konto-sicherheit.tsx, src/features/konto/components/zwei-faktor.tsx  · → AC-9, AC-10, AC-12, AC-14, AC-16, AC-27
- [x] T31 [P]  Registerkarte „Konto löschen“  · files: src/features/konto/components/konto-loeschen.tsx  · → AC-19, AC-20, EC-6
- [x] T32 [P]  Seiten Datenschutz und Impressum (Platzhaltertext)  · files: src/app/datenschutz/page.tsx, src/app/impressum/page.tsx  · → AC-25

## Ebene 5 — Zusammenbau und Go-live

- [x] T33  Konto-Fenster mit drei Registerkarten + Seite `/konto`  · files: src/features/konto/components/konto-fenster.tsx, src/app/(angemeldet)/konto/page.tsx  · → AC-15, AC-16, AC-17, AC-18, AC-19, AC-20
- [ ] T34 [user go-live]  Eigene Domain + SMTP über Brevo  · where: Domain `wohnwerk-mb.de` (vorhanden); Brevo → Domain verifizieren (DNS: SPF, DKIM, DMARC); Supabase (Prod) → Authentication → Emails → SMTP Settings mit Brevo-SMTP; Absender z. B. `noreply@<domain>`  · → AC-28
- [ ] T35 [user go-live]  Alle Auth-Einstellungen (T16–T22) im Prod-Projekt wiederholen  · where: Supabase (Prod), gleiche Pfade; Site URL `https://wohnwerk-mb.de`, Redirect `https://wohnwerk-mb.de/auth/bestaetigen`; eigenes Turnstile-Widget bzw. Hostname `wohnwerk-mb.de`  · → alle

## Abdeckung

- Alle AC-1 bis AC-29 sind mindestens einer Aufgabe zugeordnet (AC-29 ergänzt 2026-11-14: T1, T12).
- EC-7 (beide Authenticatoren verloren) braucht keinen Code: Der Betreiber setzt 2FA im Supabase-Dashboard zurück.
- Die Datenbank-Prüfungen aus `design.md` → Qualität (AC-2 direkter Aufruf, AC-21 zwei Testkonten, AC-23 ohne Token, AC-26 vordatiertes Konto) brauchen echte, bestätigte Testkonten im Dev-Projekt. Sie laufen beim Abschluss der Ebenen 2 und 3 gegen das Dev-Projekt und in `/qa` – nicht als eigene Aufgabe.

## Parallelisierung

- **Ebenen sind Schranken.** Eine Ebene startet erst, wenn die vorige integriert und gegen ihre AC-IDs geprüft ist: Daten/Regeln (E1) → Server-Bausteine (E2) → Actions (E3) → Oberfläche (E4) → Zusammenbau (E5).
- **`[P]` verlangt disjunkte Dateien.** Geprüft: Keine zwei `[P]`-Aufgaben einer Ebene teilen einen Pfad. Das Konto-Fenster (T33) liegt bewusst in Ebene 5, weil es die Registerkarten aus T29–T31 importiert; das CAPTCHA-Feld (T7) liegt in Ebene 1, weil T25–T27 es nutzen.
- **Vereinbarte Namen über Aufgaben hinweg:** T15 leitet bei ungültigen Links auf `/link-ungueltig` um (Seite aus T27); T14 und T28 teilen sich das Aktivitäts-Cookie aus `konto.rules.ts` (T4).
- **`[user]`-Aufgaben laufen nie parallel und werden nie gebaut.** T16–T22 setzen voraus, dass T1/T2 eingespielt und T6 geschrieben ist. `/build` gibt sie beim Erreichen der Ebene weiter; das Kästchen bleibt offen, bis du es abhakst. `[user go-live]` bleibt offen, bis `/deploy` die Einstellung gemacht und ihre Wirkung gesehen hat.
- Während `/build` läuft jede `[P]`-Aufgabe der aktiven Ebene in einem eigenen Subagenten; der Hauptagent integriert, prüft gegen die AC-IDs der Ebene und hakt hier ab.
