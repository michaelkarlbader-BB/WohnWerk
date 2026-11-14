-- PROJ-1 Benutzerkonto & Login — Sperre nach Fehlversuchen (T2, AC-22, EC-9)
-- Regel (design.md): 5 oder mehr Fehlversuche je E-Mail in den letzten 15 Minuten
-- → gesperrt bis 15 Minuten nach dem jüngsten dieser Fehlversuche. Versuche während
-- der Sperre werden nicht gezählt. Dieselbe Regel steht als reine Funktion in
-- src/features/konto/konto.rules.ts (sperrstatus).

create table public.login_attempts (
  id bigint generated always as identity primary key,
  email_key text not null
    constraint login_attempts_email_key_gueltig check (
      email_key = lower(btrim(email_key)) and char_length(email_key) between 1 and 254
    ),
  kind text not null
    constraint login_attempts_kind_gueltig check (kind in ('passwort', 'totp')),
  attempted_at timestamptz not null default now()
);

comment on table public.login_attempts is
  'Fehlgeschlagene Anmeldeversuche je E-Mail (PROJ-1). Kein Direktzugriff; nach 24 h gelöscht.';

create index login_attempts_email_key_attempted_at_idx
  on public.login_attempts (email_key, attempted_at desc);

alter table public.login_attempts enable row level security;
-- Bewusst keine Policy: Zugriff nur über die drei Funktionen unten.
revoke all on table public.login_attempts from anon, authenticated;

-- "Ist gesperrt?" — vor jeder Prüfung von Zugangsdaten.
create function public.login_sperre_pruefen(p_email text)
returns table (gesperrt boolean, gesperrt_bis timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) >= 5,
    case when count(*) >= 5 then max(a.attempted_at) + interval '15 minutes' end
  from public.login_attempts a
  where a.email_key = lower(btrim(coalesce(p_email, '')))
    and a.attempted_at > now() - interval '15 minutes';
$$;

-- "Fehlversuch zählen" — nur wenn nicht gesperrt.
create function public.login_fehlversuch_zaehlen(p_email text, p_art text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(v_key) not between 1 and 254 or p_art not in ('passwort', 'totp') then
    return;
  end if;

  if (select s.gesperrt from public.login_sperre_pruefen(v_key) s) then
    return;
  end if;

  insert into public.login_attempts (email_key, kind) values (v_key, p_art);
end;
$$;

-- "Fehlversuche löschen" — nur für die eigene E-Mail nach vollständiger Anmeldung (inkl. 2FA).
create function public.login_fehlversuche_loeschen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.zweite_stufe_erfuellt() then
    return;
  end if;

  delete from public.login_attempts a
  where a.email_key = (select lower(u.email) from auth.users u where u.id = v_uid);
end;
$$;

revoke all on function public.login_sperre_pruefen(text) from public;
revoke all on function public.login_fehlversuch_zaehlen(text, text) from public;
revoke all on function public.login_fehlversuche_loeschen() from public, anon;

-- Prüfen und Zählen passieren vor der Anmeldung, also auch ohne Sitzung.
grant execute on function public.login_sperre_pruefen(text) to anon, authenticated;
grant execute on function public.login_fehlversuch_zaehlen(text, text) to anon, authenticated;
grant execute on function public.login_fehlversuche_loeschen() to authenticated;

-- Aufräum-Job: Einträge älter als 24 Stunden löschen.
create function private.alte_fehlversuche_loeschen()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts a where a.attempted_at < now() - interval '24 hours';
$$;

revoke all on function private.alte_fehlversuche_loeschen() from public;

select cron.schedule(
  'konto-alte-fehlversuche-loeschen',
  '47 3 * * *',
  $$select private.alte_fehlversuche_loeschen();$$
);
