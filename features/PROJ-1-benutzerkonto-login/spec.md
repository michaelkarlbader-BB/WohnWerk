# PROJ-1: Benutzerkonto & Login

<!-- This file (spec.md) is the stable CONTRACT — it defines WHAT, not HOW.
     Owner: /write-spec (creates), /refine (updates). During /build this file is READ-ONLY.
     Technical design lives in design.md, QA results in qa-report.md.
     No status or date fields here: the feature's status lives ONLY in features/INDEX.md,
     and git records when this file changed. -->

## Abhängigkeiten
- Keine. Grundlage für alle weiteren Features (Datentrennung je Nutzer).
- PROJ-2 (App-Rahmen & Navigation) stellt später das Fenster bereit, in dem die Kontoeinstellungen unter *Extras → Konto* liegen.

## User Stories
- Als Vermieter möchte ich mich mit E-Mail und Passwort registrieren und anmelden, damit nur ich an meine Wohnungs-, Mieter- und Finanzdaten komme.
- Als Vermieter möchte ich sicher sein, dass kein anderer Nutzer meine Daten sehen oder ändern kann – auch wenn später andere Vermieter WohnWerk nutzen.
- Als Vermieter möchte ich mein Passwort zurücksetzen können, wenn ich es nach Monaten ohne Nutzung vergessen habe.
- Als Vermieter möchte ich eine Zwei-Faktor-Anmeldung einschalten, damit ein geleaktes Passwort allein nicht reicht.
- Als Vermieter möchte ich E-Mail-Adresse, Passwort und Anzeigenamen selbst ändern und mein Konto vollständig löschen können.
- Als Betreiber möchte ich, dass sich nur von mir freigegebene E-Mail-Adressen registrieren können, damit WohnWerk nicht öffentlich nutzbar ist, bevor ich es will.

## Nicht im Umfang
- Admin-Bereich in WohnWerk, Oberfläche für die Freigabeliste, Rollen – die Freigabeliste wird im Supabase-Dashboard gepflegt
- Anmelde-Link per E-Mail ohne Passwort, „Mit Google anmelden“ (später möglich)
- Dauerhaft angemeldet bleiben / „Angemeldet bleiben“-Option
- Prüfung gegen geleakte Passwörter (kommt mit dem Wechsel auf Supabase Pro)
- Wiederherstellungscodes für 2FA (Ersatz: zweiter Authenticator oder Zurücksetzen im Supabase-Dashboard)
- Gnadenfrist bei der Kontolöschung
- Export vor dem Löschen (kommt mit PROJ-10)
- „Alle meine Daten löschen“ unter Erhalt des Logins (PROJ-10)
- Geräteliste / einzelne Sitzungen verwalten
- Öffnung der Registrierung für alle (PROJ-17)

## Akzeptanzkriterien

### Registrierung
- [ ] **AC-1** — Angenommen eine E-Mail-Adresse steht auf der Freigabeliste, wenn sich jemand damit und mit einem gültigen Passwort registriert, dann erhält er eine Bestätigungs-E-Mail und das Konto ist erst nach Klick auf den Link nutzbar
- [ ] **AC-2** — Angenommen eine E-Mail-Adresse steht nicht auf der Freigabeliste, wenn sich jemand damit registriert, dann wird kein Konto angelegt und er sieht „WohnWerk ist derzeit nur auf Einladung nutzbar.“
- [ ] **AC-3** — Angenommen ein Passwort hat weniger als 12 Zeichen, wenn der Nutzer sich registriert oder ein neues Passwort setzt, dann wird es abgelehnt und die Mindestlänge wird genannt
- [ ] **AC-4** — Angenommen ein Nutzer klickt auf einen gültigen Bestätigungslink, wenn die Seite lädt, dann ist sein Konto aktiv, sein Profil angelegt und er ist angemeldet im Bereich „Wohnungen“

### Anmelden und Sitzung
- [ ] **AC-5** — Angenommen ein bestätigtes Konto ohne 2FA, wenn der Nutzer korrekte Zugangsdaten eingibt, dann ist er angemeldet und sieht den Bereich „Wohnungen“
- [ ] **AC-6** — Angenommen falsche Zugangsdaten oder eine unbekannte E-Mail-Adresse, wenn der Nutzer sich anmelden will, dann erscheint in beiden Fällen dieselbe Meldung „E-Mail oder Passwort falsch.“
- [ ] **AC-7** — Angenommen ein angemeldeter Nutzer, wenn er den Browser schließt oder 30 Minuten lang nichts in WohnWerk tut, dann ist er abgemeldet und muss sich beim nächsten Aufruf mit E-Mail und Passwort (und ggf. 2FA-Code) neu anmelden
- [ ] **AC-8** — Angenommen ein nicht angemeldeter Besucher, wenn er eine Seite von WohnWerk aufruft, dann sieht er das Anmeldefenster und landet nach der Anmeldung auf der ursprünglich aufgerufenen Seite
- [ ] **AC-9** — Angenommen ein angemeldeter Nutzer, wenn er „Abmelden“ wählt, dann ist er abgemeldet und sieht das Anmeldefenster
- [ ] **AC-10** — Angenommen ein Nutzer ist auf mehreren Geräten angemeldet, wenn er „Auf allen Geräten abmelden“ wählt, dann ist jede Sitzung beendet und andere Geräte zeigen spätestens bei der nächsten Aktion das Anmeldefenster

### Passwort vergessen
- [ ] **AC-11** — Angenommen jemand fordert „Passwort vergessen“ an, wenn er eine E-Mail-Adresse eingibt, dann erscheint immer „Falls ein Konto existiert, haben wir eine E-Mail gesendet.“ und nur bei bestehendem Konto kommt ein Link, über den ein neues Passwort gesetzt werden kann

### Zwei-Faktor-Anmeldung
- [ ] **AC-12** — Angenommen ein angemeldeter Nutzer ohne 2FA, wenn er 2FA einschaltet, einen QR-Code mit einer Authenticator-App scannt und einen gültigen Code eingibt, dann ist 2FA aktiv; ohne gültigen Code wird sie nicht aktiviert
- [ ] **AC-13** — Angenommen 2FA ist aktiv, wenn der Nutzer korrekte Zugangsdaten eingibt, dann wird zusätzlich der 6-stellige Code verlangt und erst mit gültigem Code ist er angemeldet
- [ ] **AC-14** — Angenommen 2FA ist aktiv, wenn der Nutzer einen zweiten Authenticator hinzufügt oder 2FA ausschaltet, dann ist das nur nach Eingabe eines gültigen Codes möglich

### Kontoeinstellungen
- [ ] **AC-15** — Angenommen ein angemeldeter Nutzer, wenn er den Anzeigenamen ändert oder leert, dann wird er gespeichert und die Statusleiste zeigt den Anzeigenamen bzw. – wenn keiner gesetzt ist – die E-Mail-Adresse *(Datenschutzprüfung: Anzeigename optional, Art. 5 Abs. 1 lit. c DSGVO)*
- [ ] **AC-16** — Angenommen ein angemeldeter Nutzer, wenn er das Passwort ändern will, dann muss er das aktuelle Passwort und ein neues mit mindestens 12 Zeichen eingeben
- [ ] **AC-17** — Angenommen ein angemeldeter Nutzer ändert seine E-Mail-Adresse, wenn er speichert, dann erhält die neue Adresse einen Bestätigungslink und die alte eine Benachrichtigung; die neue Adresse gilt erst nach Bestätigung als Login, und die Freigabeliste wird dabei nicht geprüft
- [ ] **AC-18** — Angenommen ein angemeldeter Nutzer, wenn er die Kontoeinstellungen öffnet, dann sieht er alle zu seinem Konto gespeicherten Daten: E-Mail, Anzeigename, Konto angelegt am, 2FA-Status *(Datenschutzprüfung: Auskunft, Art. 15 DSGVO)*

### Konto löschen
- [ ] **AC-19** — Angenommen ein angemeldeter Nutzer, wenn er „Konto löschen“ wählt, sein Passwort (bei aktiver 2FA auch den Code) und „LÖSCHEN“ eingibt, dann werden Login, Profil und alle seine Daten aus allen Features sofort und endgültig gelöscht, er wird abgemeldet und sieht das Anmeldefenster
- [ ] **AC-20** — Angenommen ein falsches Passwort, ein falscher Code oder ein anderer Text als „LÖSCHEN“, wenn der Nutzer die Löschung bestätigt, dann wird nichts gelöscht und eine Fehlermeldung erscheint

### Datentrennung
- [ ] **AC-21** — Angenommen zwei Nutzer A und B, wenn A versucht, Daten von B zu lesen, zu ändern oder zu löschen – auch über einen direkten Aufruf der Schnittstelle unter Umgehung der Oberfläche –, dann scheitert das und A sieht ausschließlich seine eigenen Daten; das gilt für alle Daten aller Features

### Schutz vor Missbrauch
- [ ] **AC-22** — Angenommen es gab 5 fehlgeschlagene Anmeldeversuche (Passwort oder 2FA-Code) für dieselbe E-Mail-Adresse innerhalb von 15 Minuten, wenn ein weiterer Versuch erfolgt, dann wird er – auch mit korrekten Zugangsdaten – abgelehnt und der Nutzer sieht, dass er es in 15 Minuten erneut versuchen kann
- [ ] **AC-23** — Angenommen Registrierung, Anmeldung oder „Passwort vergessen“ wird abgeschickt, wenn die CAPTCHA-Prüfung fehlschlägt oder fehlt, dann wird die Anfrage abgelehnt
- [ ] **AC-24** — Angenommen ein Registrierungsversuch mit einer bereits registrierten Adresse, wenn er abgeschickt wird, dann sieht der Absender dieselbe Meldung wie bei einer neuen Registrierung und der Kontoinhaber erhält eine E-Mail, dass er bereits registriert ist

### Datenschutz und E-Mails
- [ ] **AC-25** — Angenommen ein beliebiger Besucher, wenn er das Anmeldefenster oder das Menü „?“ öffnet, dann findet er Links zu Datenschutzerklärung und Impressum – bereits vor der Registrierung *(Datenschutzprüfung: Art. 13 DSGVO, DDG)*
- [ ] **AC-26** — Angenommen eine Registrierung wurde nicht innerhalb von 7 Tagen bestätigt, wenn die Frist abläuft, dann werden die Registrierungsdaten automatisch gelöscht *(Datenschutzprüfung: Speicherbegrenzung, Art. 5 Abs. 1 lit. e DSGVO)*
- [ ] **AC-27** — Angenommen ein Nutzer ändert sein Passwort oder schaltet 2FA aus, wenn die Änderung gespeichert ist, dann erhält er eine Benachrichtigung per E-Mail *(Datenschutzprüfung: Sicherheit, Art. 32 DSGVO)*
- [ ] **AC-28** — Angenommen WohnWerk versendet eine E-Mail zum Konto, wenn sie ankommt, dann ist sie auf Deutsch und als WohnWerk erkennbar

## Sonderfälle
- **EC-1** — Angenommen ein Konto ist noch nicht bestätigt, wenn der Nutzer sich anmelden will, dann sieht er „Bitte bestätige zuerst deine E-Mail-Adresse“ und einen Button „Bestätigungs-E-Mail erneut senden“
- **EC-2** — Angenommen ein Link (Bestätigung, Passwort zurücksetzen, E-Mail-Wechsel) ist abgelaufen oder schon benutzt, wenn der Nutzer ihn öffnet, dann sieht er eine verständliche Meldung und kann einen neuen Link anfordern
- **EC-3** — Angenommen die Sitzung ist während der Arbeit abgelaufen, wenn der Nutzer speichert, dann erscheint das Anmeldefenster, nach der Anmeldung geht es zurück auf dieselbe Seite; nicht gespeicherte Eingaben gehen verloren
- **EC-4** — Angenommen der Nutzer meldet sich in einem Tab ab, wenn er in einem anderen offenen Tab klickt, dann sieht er dort das Anmeldefenster
- **EC-5** — Angenommen ein Konto wurde gelöscht, wenn sich dieselbe Adresse erneut registriert und auf der Freigabeliste steht, dann entsteht ein neues, leeres Konto
- **EC-6** — Angenommen der Nutzer klickt schnell mehrfach auf „Registrieren“, „Speichern“ oder „Konto löschen“, wenn die Anfragen eintreffen, dann wird die Aktion nur einmal ausgeführt
- **EC-7** — Angenommen beide Authenticator-Geräte sind verloren, wenn der Nutzer sich anmelden will, dann ist über WohnWerk kein Zugang möglich; der Betreiber setzt 2FA im Supabase-Dashboard zurück
- **EC-8** — Angenommen ein Nutzer ändert seine E-Mail auf eine Adresse, die bereits zu einem anderen Konto gehört, wenn er speichert, dann sieht er „Diese Adresse kann nicht verwendet werden.“ ohne Angabe des Grundes
- **EC-9** — Angenommen ein Angreifer verteilt Anmeldeversuche für dieselbe E-Mail-Adresse auf verschiedene Geräte bzw. IP-Adressen, wenn die Grenze von 5 Fehlversuchen in 15 Minuten erreicht ist, dann greift die Sperre trotzdem, weil sie an die E-Mail-Adresse gebunden ist

## Technische Anforderungen
- Daten in der EU (Supabase eu-central-1, Frankfurt) – `docs/PRD.md` → Rahmenbedingungen.
- Auf dem Handy bedienbar; Anmeldefenster und Kontoeinstellungen folgen `docs/design-system.md` und `docs/app-shell.md` (Abgemeldet: nur Anmeldefenster auf der Arbeitsfläche).
- Sicherheitsrelevante Kriterien: AC-6, AC-7, AC-11, AC-21 bis AC-24, EC-8, EC-9.

## Offene Fragen
- [ ] Welcher Dienst versendet die E-Mails? Der Supabase-Standardversand ist nicht für den Produktivbetrieb gedacht. → `/architecture`
- [ ] Welcher CAPTCHA-Anbieter (Vorschlag: Cloudflare Turnstile)? → `/architecture`; Anwaltsfrage zur Einwilligung in `docs/privacy.md`
- [ ] Wie wird die Abmeldung nach 30 Minuten Inaktivität umgesetzt (Supabase-Einstellung nur im Pro-Tarif)? → `/architecture`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Geschlossene Registrierung über eine Freigabeliste | WohnWerk ist zunächst privat; keine Fremddaten und keine Bot-Konten, bevor das Angebot an Dritte steht | 2026-11-08 |
| Freigabeliste und 2FA-Reset im Supabase-Dashboard, kein Admin-Bereich | spart ein Feature mit Rollen; nur wenige Fälle im Jahr; Kontenübersicht ebenfalls im Dashboard | 2026-11-08 |
| Anmeldung mit E-Mail und Passwort, mit Bestätigungslink | einfach, ohne Abhängigkeit von Google; funktioniert auch am Handy ohne Postfach | 2026-11-08 |
| Keine dauerhafte Anmeldung: Abmeldung beim Schließen des Browsers und nach 30 Minuten Inaktivität | Sicherheit vor Bequemlichkeit; bei Nutzung etwa einmal im Monat kein spürbarer Nachteil; Sitzungs-Cookie ist unbedingt erforderlich, kein Cookie-Banner nötig | 2026-11-08 |
| Optionale 2FA mit Authenticator-App, zweiter Authenticator statt Wiederherstellungscodes | Finanz- und Mieterdaten; bei Supabase kostenlos; Supabase bietet keine Wiederherstellungscodes | 2026-11-08 |
| Missbrauchsschutz: 5 Fehlversuche je E-Mail in 15 Minuten → 15 Minuten Sperre; mindestens 12 Zeichen; CAPTCHA bei Registrierung, Anmeldung, Passwort vergessen; neutrale Fehlermeldungen | Schutz gegen automatisiertes Raten und Kontenausspähung | 2026-11-08 |
| Prüfung gegen geleakte Passwörter erst mit Supabase Pro | im kostenlosen Tarif nicht verfügbar | 2026-11-08 |
| Kontolöschung sofort und endgültig, bestätigt mit Passwort (ggf. 2FA) und „LÖSCHEN“ | einfacher als eine Gnadenfrist; Export vor dem Löschen kommt mit PROJ-10 | 2026-11-08 |
| E-Mail-Änderung ohne Prüfung gegen die Freigabeliste | es kommt keine neue Person hinzu; abgesichert durch Bestätigungslink und Benachrichtigung der alten Adresse | 2026-11-08 |
| Profil nur mit optionalem Anzeigenamen | Datensparsamkeit (Datenschutzprüfung) | 2026-11-08 |
| Unbestätigte Registrierungen nach 7 Tagen löschen; Sicherheits-E-Mail bei Passwortänderung und 2FA-Deaktivierung | Ergebnis der Datenschutzprüfung (Speicherbegrenzung, Sicherheit) | 2026-11-08 |
