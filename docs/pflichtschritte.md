# Pflichtschritte – was vor dem nächsten Schritt erledigt sein muss

> Die Schritte, die **du selbst** außerhalb des Codes erledigst (Konten, Verträge, Einstellungen, Texte), geordnet nach dem Zeitpunkt, an dem sie fällig werden.
>
> - **PFLICHT** = rechtlich bindend oder technisch erforderlich. Solange ein PFLICHT-Punkt einer Stufe offen ist, blockiert `scripts/pflichtschritte.mjs` (über Hooks in `.claude/settings.json`) den Schritt, der diese Stufe voraussetzt.
> - **Empfohlen** = wird zum passenden Zeitpunkt erinnert, blockiert aber nicht.
> - Abhaken (`[x]`) nur, wenn der Schritt wirklich erledigt ist – mit Datum. Claude hakt nur ab, nachdem du es bestätigt hast.
> - Aufgaben mit `[user]` in den `tasks.md` der Features führt `/build` selbst an seinen Prüfpunkten durch; hier stehen nur die Schritte, die über ein Feature hinausgehen.
> - Quellen: `docs/privacy.md` (Offene Punkte), `docs/PRD.md` (Rahmenbedingungen), PROJ-1 `design.md` (Einstellungen).

## Stufe 1 – vor `/build` <!-- gate:build -->

- [x] **PFLICHT** · technisch — Supabase-Dev-Projekt anlegen. → erledigt 2026-11-14: Region **eu-west-2 (London)** statt Frankfurt, bewusst so entschieden – UK hat einen EU-Angemessenheitsbeschluss, im Dev-Projekt liegen nur Testdaten. Prod bleibt Frankfurt (Stufe 3).
- [x] **PFLICHT** · technisch — Test-Schlüssel des Dev-Projekts (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) selbst in `.env.local` eintragen – nie Live-Schlüssel. → erledigt 2026-11-14 (URL und Publishable Key, Format geprüft)
- [ ] Empfohlen — AVV mit Supabase: gilt automatisch über die Nutzungsbedingungen (Abschn. 7(b)); aktuelle Fassung von https://supabase.com/legal/dpa als PDF ablegen; spätestens in Stufe 2 Pflicht.

## Stufe 2 – vor der Testumgebung test.wohnwerk-mb.de (erstes `/deploy`) <!-- gate:test -->

Ab hier ist WohnWerk öffentlich erreichbar: Jeder Aufruf verarbeitet IP-Adressen, und das CAPTCHA lädt.

- [ ] **PFLICHT** · rechtlich (Art. 28 DSGVO) — AVV mit **Supabase**: gilt über die Nutzungsbedingungen; erledigt, sobald die aktuelle DPA-Fassung als PDF abgelegt ist.
- [ ] **PFLICHT** · rechtlich (Art. 28 DSGVO) — **Hosting mit AVV:** Vercel Hobby ist nicht abgedeckt (DPA gilt nur für Pro/Enterprise, Hobby nur nicht-kommerziell). Entscheidung nötig: Vercel Pro, anderer Anbieter mit AVV im kostenlosen Tarif, oder schriftliche Klärung mit Vercel. Danach AVV-Fassung als PDF ablegen.
- [ ] **PFLICHT** · rechtlich (Art. 28 DSGVO) — AVV mit **Cloudflare**: gilt über die Self-Serve-Bedingungen (§6.1); erledigt, sobald die aktuelle DPA-Fassung als PDF abgelegt ist.
- [ ] **PFLICHT** · rechtlich (Art. 28 DSGVO) — AVV mit **Brevo**: im Brevo-Konto bzw. auf brevo.com/legal prüfen, ob er Teil der Nutzungsbedingungen ist oder aktiv abgeschlossen werden muss; Fassung als PDF ablegen.
- [ ] **PFLICHT** · rechtlich (Art. 13 DSGVO) — Inhalt der **Datenschutzerklärung** liefern (Generator oder Anwalt) – nennt Supabase, Vercel, Cloudflare, Brevo und die Tabelle „Gerätespeicher“ aus `docs/privacy.md`. Ohne Inhalt keine öffentlich erreichbare Seite.
- [ ] **PFLICHT** · technisch/Datenschutz — Vercel-Funktionsregion auf **Frankfurt (fra1)** festlegen.
- [ ] **PFLICHT** · technisch — Testumgebung nur mit dem **Supabase-Dev-Projekt** verbinden, nie mit Live-Schlüsseln; Turnstile-Hostname und Supabase-Redirect für `test.wohnwerk-mb.de` eingetragen (PROJ-1 T9, T19).
- [ ] Empfohlen — Testumgebung von Suchmaschinen ausschließen (noindex).
- [ ] Empfohlen — Anwaltsfrage klären: CAPTCHA, Fenster-Cookie und Darstellungs-Speicher ohne Einwilligung zulässig? (`docs/privacy.md` → Für einen Anwalt)

## Stufe 3 – vor dem Go-live auf wohnwerk-mb.de (Merge nach `main`) <!-- gate:live -->

Ab hier liegen echte Daten in WohnWerk, auch Daten deiner Mieter.

- [x] **PFLICHT** · technisch/Datenschutz — Supabase-**Prod**-Projekt „WohnWerk Prod“ in **eu-central-1 (Frankfurt)** anlegen (beim Anlegen über „need a specific region“ wählen – die Auswahl „Europe“ legt die Region nicht fest); Sicherheitseinstellungen wie beim Dev-Projekt. → erledigt 2026-11-14 (Frankfurt über „need a specific region“)
- [ ] **PFLICHT** · technisch — Prod-Schlüssel (URL, Publishable Key) nur im Hosting-Dashboard (Production) eintragen, nie in `.env.local`; erst nach der Hosting-Entscheidung (Stufe 2).
- [ ] **PFLICHT** · technisch — Alle Auth-Einstellungen im Prod-Projekt wiederholen: Site URL `https://wohnwerk-mb.de`, Redirect, CAPTCHA, Freigabe-Hook, Mailvorlagen, Mindestlänge (PROJ-1 T35).
- [ ] **PFLICHT** · technisch — Domain `wohnwerk-mb.de` bei Brevo verifizieren (SPF, DKIM, DMARC) und Brevo-SMTP im Supabase-Prod-Projekt eintragen (PROJ-1 T34). Ohne sie kommen Bestätigungs- und Passwort-Mails nicht zuverlässig an.
- [ ] **PFLICHT** · rechtlich (DDG) — **Impressum**-Inhalt liefern. (Ob es als Privatperson zwingend ist, ist eine offene Anwaltsfrage – bis zur Klärung gilt die vorsichtige Annahme.)
- [ ] **PFLICHT** · technisch — **Wachhalter (PROJ-11)** ist live. Supabase Free pausiert ein Projekt nach rund einer Woche Inaktivität; bei monatlicher Nutzung wäre die App sonst regelmäßig nicht erreichbar, und die Aufräum-Jobs (z. B. 7-Tage-Löschung, Art. 5 DSGVO) liefen nicht.
- [ ] Empfohlen — Aufbewahrungsdauern von Supabase-Auth-Protokoll, Vercel-Logs und Brevo-Versandprotokollen ermitteln und in `docs/privacy.md` und in der Datenschutzerklärung nennen (Art. 13 Abs. 2 lit. a DSGVO).
- [ ] Empfohlen — Bevor echte Wohnungs- und Darlehensdaten erfasst werden: **Datenexport (PROJ-10)** live, weil Supabase Free keine Backups hat (PRD: Datenverlust kaum tolerierbar).

## Stufe 4 – bevor andere Vermieter WohnWerk nutzen <!-- gate:dritte -->

Gilt schon, wenn du die erste fremde E-Mail-Adresse auf die Freigabeliste setzt.

- [ ] **PFLICHT** · rechtlich — Rollen bei Mieterdaten mit einem Anwalt klären (WohnWerk als Auftragsverarbeiter der Vermieter?) und den dazu passenden AVV bzw. die AGB für Nutzer bereitstellen.
- [ ] **PFLICHT** · rechtlich — Verantwortlichen, Impressum und Datenschutzerklärung auf den Betreiber des Angebots umstellen (Privatperson → ggf. Gewerbe/Unternehmen).
- [ ] **PFLICHT** · vertraglich — **Vercel Pro** statt Hobby (Hobby ist nur für nicht-kommerzielle Nutzung erlaubt).
- [ ] **PFLICHT** · technisch (PRD-Entscheidung) — **Supabase Pro** (Backups, kein Pausieren).
