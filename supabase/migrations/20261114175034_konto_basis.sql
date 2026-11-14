-- PROJ-1 Benutzerkonto & Login — Basis (T1)
-- Profil, Freigabeliste, Freigabe-Prüfung beim Anlegen eines Kontos, 2FA-Stufe,
-- "eigenes Konto löschen" und der Aufräum-Job für unbestätigte Registrierungen.
-- Zugriffsmodell: ADR-001 (docs/decisions.md).

-- ---------------------------------------------------------------------------
-- Schema für Helfer, die nicht über die öffentliche Schnittstelle aufrufbar sind
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- 2FA-Stufe (ADR-001 Punkt 3): Hat der Nutzer einen bestätigten Authenticator,
-- gilt die Sitzung nur mit zweiter Stufe (aal2). Ohne eingerichtete 2FA reicht aal1.
-- ---------------------------------------------------------------------------
create function private.zweite_stufe_erfuellt()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = (select auth.uid())
        and f.status = 'verified'
    );
$$;

revoke all on function private.zweite_stufe_erfuellt() from public;
grant execute on function private.zweite_stufe_erfuellt() to authenticated;

-- ---------------------------------------------------------------------------
-- Profil — eines je Konto
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text
    constraint profiles_display_name_gueltig check (
      display_name is null
      or (char_length(display_name) between 1 and 60 and display_name = btrim(display_name))
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil je Konto (PROJ-1). Anlegen und Löschen nur durch die Datenbank.';

alter table public.profiles enable row level security;

-- Nur der Eigentümer liest und ändert sein Profil; kein Anlegen/Löschen aus der App.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "profiles: eigenes Profil lesen"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: eigenes Profil aendern"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles: zweite Stufe bei eingerichteter 2FA"
  on public.profiles as restrictive for all
  to authenticated
  using ((select private.zweite_stufe_erfuellt()));

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Profil automatisch anlegen, sobald Supabase ein Konto anlegt (AC-4).
create function private.profil_anlegen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke all on function private.profil_anlegen() from public;

create trigger on_auth_user_created_profil_anlegen
  after insert on auth.users
  for each row execute function private.profil_anlegen();

-- ---------------------------------------------------------------------------
-- Freigabeliste — Betreiber-Daten, kein Zugriff aus der App (AC-2)
-- ---------------------------------------------------------------------------
create table public.registration_allowlist (
  email text primary key
    constraint registration_allowlist_email_gueltig check (
      email = lower(btrim(email)) and char_length(email) between 3 and 254
    ),
  created_at timestamptz not null default now()
);

comment on table public.registration_allowlist is
  'E-Mail-Adressen, die sich registrieren dürfen (PROJ-1). Pflege nur im Supabase-Dashboard.';

alter table public.registration_allowlist enable row level security;
-- Bewusst keine Policy: weder anon noch authenticated erreichen die Tabelle.
revoke all on table public.registration_allowlist from anon, authenticated;

-- Der Betreiber tippt Adressen im Table Editor ein: immer kleingeschrieben speichern.
create function private.allowlist_email_normalisieren()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger registration_allowlist_normalisieren
  before insert or update on public.registration_allowlist
  for each row execute function private.allowlist_email_normalisieren();

create function private.ist_freigegeben(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.registration_allowlist a
    where a.email = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke all on function private.ist_freigegeben(text) from public;

-- Supabase-Auth-Hook "Before User Created" (im Dashboard aktivieren, tasks.md T21).
-- Lehnt nicht freigegebene Adressen mit der Kennung "nur_auf_einladung" ab.
create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.ist_freigegeben(event -> 'user' ->> 'email') then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'nur_auf_einladung')
  );
end;
$$;

revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- Rückfallebene in der Datenbank selbst: Auch wenn der Hook im Dashboard nicht
-- eingeschaltet ist, entsteht ohne Freigabe kein Konto (design.md → Entscheidungen).
create function private.freigabe_erzwingen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.ist_freigegeben(new.email) then
    raise exception 'nur_auf_einladung' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.freigabe_erzwingen() from public;

create trigger on_auth_user_created_freigabe_erzwingen
  before insert on auth.users
  for each row execute function private.freigabe_erzwingen();

-- ---------------------------------------------------------------------------
-- Eigenes Konto löschen (AC-19, AC-29) — nur das Konto der aktuellen Sitzung
-- ---------------------------------------------------------------------------
create function public.delete_own_account()
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

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  -- Freigabe zur aktuellen E-Mail des Kontos entfernen (AC-29) …
  delete from public.registration_allowlist a where a.email = v_email;
  -- … und das Konto; Profil und alle Nutzertabellen folgen per ON DELETE CASCADE (ADR-001).
  delete from auth.users u where u.id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Aufräum-Job: unbestätigte Registrierungen nach 7 Tagen löschen (AC-26)
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

create function private.unbestaetigte_registrierungen_loeschen()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users u
  where u.email_confirmed_at is null
    and u.created_at < now() - interval '7 days';
$$;

revoke all on function private.unbestaetigte_registrierungen_loeschen() from public;

select cron.schedule(
  'konto-unbestaetigte-registrierungen-loeschen',
  '17 3 * * *',
  $$select private.unbestaetigte_registrierungen_loeschen();$$
);
