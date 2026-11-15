-- PROJ-1 Benutzerkonto & Login — Härtung nach /qa (BUG-3, BUG-6, BUG-10)
--
-- BUG-6:  Der Fehlversuchszähler war mit dem öffentlichen Schlüssel ohne CAPTCHA aufrufbar.
--         Jetzt verlangen alle Zählerfunktionen einen eigenen, engen Server-Schlüssel, der in
--         Supabase Vault (Name `login_sperre_schluessel`) und als LOGIN_SPERRE_SCHLUESSEL in der
--         Server-Umgebung liegt. Kein Admin-Schlüssel: er öffnet nur diese zwei Funktionen.
-- BUG-10: Prüfen und Zählen waren zwei Aufrufe. Jetzt reserviert `login_versuch_beginnen` den
--         Versuch atomar (Sperre je E-Mail-Schlüssel per Advisory Lock) und zählt ihn sofort;
--         die App gibt ihn zurück, wenn die Zugangsdaten stimmten oder der Dienst ausfiel.
-- BUG-3:  `delete_own_account` verlangt eine frische Anmeldung mit Passwort (und bei
--         eingerichteter 2FA einen frischen Code) im Token der aufrufenden Sitzung. Eine
--         übernommene, ältere Sitzung kann das Konto nicht mehr direkt löschen.
--
-- Sperrregel unverändert (design.md): 5 oder mehr Fehlversuche je E-Mail in 15 Minuten →
-- gesperrt bis 15 Minuten nach dem jüngsten. Versuche während der Sperre zählen nicht.

-- ---------------------------------------------------------------------------
-- Server-Schlüssel der Zählerfunktionen (BUG-6)
-- ---------------------------------------------------------------------------
create function private.sperre_schluessel_gueltig(p_schluessel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(char_length(p_schluessel) >= 32, false)
    and exists (
      select 1
      from vault.decrypted_secrets s
      where s.name = 'login_sperre_schluessel'
        and s.decrypted_secret = p_schluessel
    );
$$;

revoke all on function private.sperre_schluessel_gueltig(text) from public;

-- Die alten, offenen Funktionen entfallen.
drop function public.login_fehlversuch_zaehlen(text, text);
drop function public.login_sperre_pruefen(text);

-- ---------------------------------------------------------------------------
-- Versuch reservieren: Sperre prüfen und Versuch zählen in einem Schritt (BUG-10)
-- ---------------------------------------------------------------------------
create function public.login_versuch_beginnen(p_schluessel text, p_email text, p_art text)
returns table (gesperrt boolean, gesperrt_bis timestamptz, versuch_id bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text := lower(btrim(coalesce(p_email, '')));
  v_anzahl integer;
  v_juengster timestamptz;
  v_id bigint;
begin
  if not private.sperre_schluessel_gueltig(p_schluessel) then
    raise exception 'schluessel_ungueltig' using errcode = '42501';
  end if;

  if char_length(v_key) not between 1 and 254 or coalesce(p_art, '') not in ('passwort', 'totp') then
    raise exception 'eingabe_ungueltig' using errcode = '22023';
  end if;

  -- Gleichzeitige Versuche für dieselbe E-Mail laufen nacheinander durch diese Stelle.
  perform pg_advisory_xact_lock(hashtextextended('login_attempts:' || v_key, 0));

  select count(*), max(a.attempted_at)
    into v_anzahl, v_juengster
  from public.login_attempts a
  where a.email_key = v_key
    and a.attempted_at > now() - interval '15 minutes';

  if v_anzahl >= 5 then
    return query select true, v_juengster + interval '15 minutes', null::bigint;
    return;
  end if;

  insert into public.login_attempts (email_key, kind)
  values (v_key, p_art)
  returning id into v_id;

  return query select false, null::timestamptz, v_id;
end;
$$;

-- Versuch zurückgeben: Zugangsdaten stimmten oder der Dienst fiel aus.
create function public.login_versuch_zuruecknehmen(p_schluessel text, p_versuch_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.sperre_schluessel_gueltig(p_schluessel) then
    raise exception 'schluessel_ungueltig' using errcode = '42501';
  end if;

  delete from public.login_attempts a where a.id = p_versuch_id;
end;
$$;

revoke all on function public.login_versuch_beginnen(text, text, text) from public;
revoke all on function public.login_versuch_zuruecknehmen(text, bigint) from public;
-- Aufrufbar mit und ohne Sitzung, aber nur mit dem Server-Schlüssel.
grant execute on function public.login_versuch_beginnen(text, text, text) to anon, authenticated;
grant execute on function public.login_versuch_zuruecknehmen(text, bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Frische Anmeldung im Token der Sitzung (BUG-3)
-- ---------------------------------------------------------------------------
-- Wahr, wenn der `amr`-Claim des aktuellen Tokens eine der Methoden enthält, die höchstens
-- `p_max_alter` alt ist. Jede unerwartete Form zählt als nicht frisch (fail closed).
create function private.frisch_bestaetigt(p_methoden text[], p_max_alter interval)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof((select auth.jwt()) -> 'amr') = 'array' then (select auth.jwt()) -> 'amr'
        else '[]'::jsonb
      end
    ) e
    where jsonb_typeof(e) = 'object'
      and e ->> 'method' = any (p_methoden)
      and coalesce(e ->> 'timestamp', '') ~ '^[0-9]{1,12}$'
      and to_timestamp((e ->> 'timestamp')::bigint) >= now() - p_max_alter
  );
$$;

revoke all on function private.frisch_bestaetigt(text[], interval) from public;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if v_uid is null then
    raise exception 'nicht_angemeldet' using errcode = '28000';
  end if;

  if not private.zweite_stufe_erfuellt() then
    raise exception 'zweite_stufe_erforderlich' using errcode = '42501';
  end if;

  -- Nur eine Sitzung, die gerade eben mit dem Passwort entstanden ist, darf löschen.
  if not private.frisch_bestaetigt(array['password'], interval '5 minutes') then
    raise exception 'erneute_anmeldung_erforderlich' using errcode = '42501';
  end if;

  -- Mit eingerichteter 2FA zusätzlich ein frischer Code.
  if exists (
    select 1 from auth.mfa_factors f where f.user_id = v_uid and f.status = 'verified'
  ) and not private.frisch_bestaetigt(array['totp', 'mfa/totp'], interval '5 minutes') then
    raise exception 'erneute_anmeldung_erforderlich' using errcode = '42501';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  -- Freigabe zur aktuellen E-Mail des Kontos entfernen (AC-29) …
  delete from public.registration_allowlist a where a.email = v_email;
  -- … und das Konto; Profil und alle Nutzertabellen folgen per ON DELETE CASCADE (ADR-001).
  delete from auth.users u where u.id = v_uid;
end;
$$;

-- `create or replace` behält die Rechte; zur Sicherheit noch einmal ausdrücklich.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
