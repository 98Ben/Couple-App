-- ============================================================
-- Couple App · Alltag: Einkaufsliste und To-dos (einmalig + wiederkehrend)
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden. Setzt 0001–0005 voraus.
-- ============================================================

-- ================= Einkaufsliste =================

create table if not exists public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  category    text not null default 'sonstiges'
              check (category in ('obst_gemuese', 'kuehlregal', 'brot', 'tiefkuehl', 'vorrat', 'getraenke', 'snacks', 'haushalt', 'drogerie', 'sonstiges')),
  checked_at  timestamptz,           -- gesetzt = „Bereits im Wagen“
  checked_by  uuid references auth.users (id) on delete set null,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists shopping_items_couple_idx on public.shopping_items (couple_id, created_at);

-- Gedächtnis pro Paar: gelernte Kategorien, Häufigkeit (für Vorschläge) und Favoriten
create table if not exists public.shopping_memory (
  couple_id  uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  key        text not null,          -- Name klein geschrieben, ohne Leerzeichen am Rand
  name       text not null,
  category   text not null,
  uses       int not null default 0,
  pinned     boolean not null default false,
  last_used  timestamptz not null default now(),
  primary key (couple_id, key)
);

-- Artikel merken (beim Hinzufügen): Häufigkeit hochzählen und Kategorie übernehmen
create or replace function public.shopping_remember(item_name text, item_category text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare c uuid := my_couple_id();
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  insert into shopping_memory (couple_id, key, name, category, uses, last_used)
  values (c, lower(trim(item_name)), trim(item_name), item_category, 1, now())
  on conflict (couple_id, key) do update
    set uses = shopping_memory.uses + 1, category = excluded.category, name = excluded.name, last_used = now();
end;
$$;

-- Kategorie korrigieren (wird fürs nächste Mal gemerkt)
create or replace function public.shopping_set_category(item_name text, item_category text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare c uuid := my_couple_id();
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  insert into shopping_memory (couple_id, key, name, category, uses)
  values (c, lower(trim(item_name)), trim(item_name), item_category, 0)
  on conflict (couple_id, key) do update set category = excluded.category;
end;
$$;

-- ================= To-dos =================

-- Einmalige Aufgaben. assignee = null bedeutet „wir beide“.
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  assignee    uuid references auth.users (id) on delete set null,
  due_on      date,
  important   boolean not null default false,
  done_at     timestamptz,
  done_by     uuid references auth.users (id) on delete set null,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_couple_idx on public.tasks (couple_id, due_on);

-- Wiederkehrende Aufgaben (Haushalt). Nach dem Abhaken rückt next_due weiter.
create table if not exists public.chores (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  assignee      uuid references auth.users (id) on delete set null,
  every         text not null check (every in ('taeglich', 'woechentlich', 'zweiwoechentlich', 'monatlich')),
  next_due      date not null,
  last_done_at  timestamptz,
  last_done_by  uuid references auth.users (id) on delete set null,
  created_by    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists chores_couple_idx on public.chores (couple_id, next_due);

-- Erledigt: nächster Termin ab dem späteren von (fällig, heute)
create or replace function public.complete_chore(chore uuid)
returns date
language plpgsql
security definer set search_path = public
as $$
declare
  ch chores;
  base date;
  nxt date;
begin
  select * into ch from chores where id = chore and couple_id = my_couple_id() for update;
  if ch.id is null then raise exception 'Diese Aufgabe gibt es nicht'; end if;
  base := greatest(ch.next_due, berlin_today());
  nxt := case ch.every
    when 'taeglich' then base + 1
    when 'woechentlich' then base + 7
    when 'zweiwoechentlich' then base + 14
    else (base + interval '1 month')::date
  end;
  update chores set next_due = nxt, last_done_at = now(), last_done_by = auth.uid() where id = chore;
  return nxt;
end;
$$;

-- ================= Row Level Security =================

do $$
declare t text;
begin
  foreach t in array array['shopping_items', 'shopping_memory', 'tasks', 'chores'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Paar: alles" on public.%I', t);
    execute format(
      'create policy "Paar: alles" on public.%I for all to authenticated
         using (couple_id = public.my_couple_id())
         with check (couple_id = public.my_couple_id())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

revoke all on function public.shopping_remember(text, text)     from public, anon;
revoke all on function public.shopping_set_category(text, text) from public, anon;
revoke all on function public.complete_chore(uuid)              from public, anon;
grant execute on function public.shopping_remember(text, text)     to authenticated;
grant execute on function public.shopping_set_category(text, text) to authenticated;
grant execute on function public.complete_chore(uuid)              to authenticated;

-- ================= Realtime =================

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['shopping_items', 'shopping_memory', 'tasks', 'chores'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
