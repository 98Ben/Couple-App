-- ============================================================
-- Couple App · Schritt 2: Profile, Paare und Zugriffsregeln
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- ============================================================

-- ---------- Tabellen ----------

create table if not exists public.couples (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique,                 -- 6 Zeichen, wird nach dem Beitritt gelöscht
  start_date   date,                        -- "Zusammen seit" für den Tage-Zähler
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (char_length(display_name) between 1 and 40),
  couple_id     uuid references public.couples (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists profiles_couple_id_idx on public.profiles (couple_id);

-- ---------- Profil automatisch anlegen, wenn sich jemand registriert ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Hilfsfunktion: Paar der angemeldeten Person ----------

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- ---------- Row Level Security: nur ihr beide seht eure Daten ----------

alter table public.profiles enable row level security;
alter table public.couples  enable row level security;

drop policy if exists "Profil: eigenes und Partner lesen" on public.profiles;
create policy "Profil: eigenes und Partner lesen" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (couple_id is not null and couple_id = public.my_couple_id()));

drop policy if exists "Profil: eigenes bearbeiten" on public.profiles;
create policy "Profil: eigenes bearbeiten" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Paar: eigenes lesen" on public.couples;
create policy "Paar: eigenes lesen" on public.couples
  for select to authenticated
  using (id = public.my_couple_id());

drop policy if exists "Paar: eigenes bearbeiten" on public.couples;
create policy "Paar: eigenes bearbeiten" on public.couples
  for update to authenticated
  using (id = public.my_couple_id())
  with check (id = public.my_couple_id());

-- Nur einzelne Spalten dürfen direkt geändert werden.
-- Paar-Zugehörigkeit und Einladungscode laufen ausschließlich über die Funktionen unten.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.couples  from anon, authenticated;
grant select on public.profiles, public.couples to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (start_date)   on public.couples  to authenticated;

-- ---------- Funktion: Paar anlegen und Einladungscode erzeugen ----------

create or replace function public.create_couple()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  me        uuid := auth.uid();
  alphabet  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ohne 0/O/1/I
  new_code  text;
  new_id    uuid;
  i         int;
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;
  if (select couple_id from profiles where id = me) is not null then
    raise exception 'Du bist schon mit jemandem verknüpft';
  end if;

  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from couples where invite_code = new_code);
  end loop;

  insert into couples (invite_code, created_by) values (new_code, me) returning id into new_id;
  update profiles set couple_id = new_id where id = me;
  return new_code;
end;
$$;

-- ---------- Funktion: mit Einladungscode beitreten ----------

create or replace function public.join_couple(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me       uuid := auth.uid();
  target   uuid;
  members  int;
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;
  if (select couple_id from profiles where id = me) is not null then
    raise exception 'Du bist schon mit jemandem verknüpft';
  end if;

  select id into target from couples where invite_code = upper(trim(code)) for update;
  if target is null then
    raise exception 'Diesen Code gibt es nicht';
  end if;

  select count(*) into members from profiles where couple_id = target;
  if members >= 2 then
    raise exception 'Dieses Paar ist schon vollständig';
  end if;

  update profiles set couple_id = target where id = me;
  update couples set invite_code = null where id = target; -- Code ist nur einmal gültig
  return target;
end;
$$;

revoke all on function public.create_couple()      from public, anon;
revoke all on function public.join_couple(text)    from public, anon;
revoke all on function public.my_couple_id()       from public, anon;
grant execute on function public.create_couple()   to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.my_couple_id()    to authenticated;

-- ---------- Realtime: Paar-Seite merkt sofort, wenn der Partner beitritt ----------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
     ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end;
$$;
