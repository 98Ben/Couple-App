-- ============================================================
-- Couple App · Erinnerungen: Orte, Momente, Countdowns, Bucket List,
-- Date-Ideen, Wunsch-Box und Foto-Speicher
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden. Setzt 0001 voraus.
-- ============================================================

-- ---------- Tabellen (jede gehört genau einem Paar) ----------

-- Orte auf der Weltkarte
create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  happened_on  date,
  note         text check (char_length(note) <= 1000),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  address      text check (char_length(address) <= 300),
  photo_path   text,
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Momente der Foto-Timeline
create table if not exists public.moments (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  happened_on  date not null,
  note         text check (char_length(note) <= 1000),
  photo_path   text,
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Countdowns (Urlaub, Geburtstag, …). Der Jahrestag kommt automatisch aus couples.start_date.
create table if not exists public.countdowns (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 60),
  target_date  date not null,
  target_time  time,
  emoji        text check (char_length(emoji) <= 8),
  yearly       boolean not null default false,
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Bucket List
create table if not exists public.bucket_items (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  category     text not null default 'erlebnisse' check (category in ('reisen', 'essen', 'abenteuer', 'erlebnisse')),
  done_at      timestamptz,
  done_by      uuid references auth.users (id) on delete set null,
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Date-Ideen (Pool für den Würfel)
create table if not exists public.date_ideas (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  setting      text not null default 'egal' check (setting in ('drinnen', 'draussen', 'egal')),
  cost         text not null default 'guenstig' check (cost in ('kostenlos', 'guenstig', 'teurer')),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

-- Wunsch-Box: Wünsche an den Partner, damit er/sie einen damit überraschen kann
create table if not exists public.wishes (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  text          text not null check (char_length(text) between 1 and 300),
  fulfilled_at  timestamptz,
  created_by    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.couples add column if not exists date_ideas_seeded boolean not null default false;

create index if not exists places_couple_idx       on public.places (couple_id);
create index if not exists moments_couple_idx      on public.moments (couple_id, happened_on);
create index if not exists countdowns_couple_idx   on public.countdowns (couple_id);
create index if not exists bucket_items_couple_idx on public.bucket_items (couple_id);
create index if not exists date_ideas_couple_idx   on public.date_ideas (couple_id);
create index if not exists wishes_couple_idx       on public.wishes (couple_id);

-- ---------- Row Level Security: alles nur innerhalb des eigenen Paares ----------

do $$
declare
  t text;
begin
  foreach t in array array['places', 'moments', 'countdowns', 'bucket_items', 'date_ideas', 'wishes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Paar: alles" on public.%I', t);
    execute format(
      'create policy "Paar: alles" on public.%I for all to authenticated
         using (couple_id = public.my_couple_id())
         with check (couple_id = public.my_couple_id())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- Wünsche darf nur der/die Verfasser/in ändern oder löschen; "erfüllt" setzt die andere Person über eine Funktion.
drop policy if exists "Paar: alles" on public.wishes;
drop policy if exists "Wunsch: lesen" on public.wishes;
drop policy if exists "Wunsch: schreiben" on public.wishes;
drop policy if exists "Wunsch: ändern" on public.wishes;
drop policy if exists "Wunsch: löschen" on public.wishes;
create policy "Wunsch: lesen" on public.wishes for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "Wunsch: schreiben" on public.wishes for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "Wunsch: ändern" on public.wishes for update to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid())
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "Wunsch: löschen" on public.wishes for delete to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid());

create or replace function public.toggle_wish_fulfilled(wish uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update wishes
     set fulfilled_at = case when fulfilled_at is null then now() else null end
   where id = wish
     and couple_id = my_couple_id()
     and created_by <> auth.uid();   -- nur der Partner hakt einen Wunsch als erfüllt ab
  if not found then
    raise exception 'Diesen Wunsch kannst du nicht abhaken';
  end if;
end;
$$;

-- ---------- Start-Ideen für den Date-Würfel (einmal pro Paar) ----------

create or replace function public.seed_date_ideas()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
begin
  if c is null then
    return;
  end if;
  -- Sperre verhindert doppeltes Einfügen, wenn beide gleichzeitig öffnen
  if (select date_ideas_seeded from couples where id = c for update) then
    return;
  end if;
  insert into date_ideas (couple_id, title, setting, cost, created_by) values
    (c, 'Picknick im Park mit Lieblingssnacks', 'draussen', 'guenstig', null),
    (c, 'Gemeinsam ein neues Rezept kochen', 'drinnen', 'guenstig', null),
    (c, 'Sterne gucken mit Decke und Tee', 'draussen', 'kostenlos', null),
    (c, 'Filmabend mit Deckenburg', 'drinnen', 'kostenlos', null),
    (c, 'Sonnenaufgang zusammen anschauen', 'draussen', 'kostenlos', null),
    (c, 'Spieleabend mit Brettspielen', 'drinnen', 'kostenlos', null),
    (c, 'Fahrradtour ins Blaue', 'draussen', 'kostenlos', null),
    (c, 'Töpfer- oder Malkurs ausprobieren', 'drinnen', 'teurer', null),
    (c, 'Frühstück im Bett', 'drinnen', 'guenstig', null),
    (c, 'Neues Restaurant ausprobieren', 'drinnen', 'teurer', null),
    (c, 'Wanderung mit Aussichtspunkt', 'draussen', 'kostenlos', null),
    (c, 'Wellness-Abend zu Hause mit Gesichtsmasken', 'drinnen', 'guenstig', null),
    (c, 'Minigolf spielen', 'draussen', 'guenstig', null),
    (c, 'Flohmarkt bummeln', 'draussen', 'guenstig', null),
    (c, 'Pizza selbst backen', 'drinnen', 'guenstig', null),
    (c, 'Fotospaziergang durch die Stadt', 'draussen', 'kostenlos', null),
    (c, 'Kino mit Popcorn', 'drinnen', 'teurer', null),
    (c, 'Bowling oder Billard', 'drinnen', 'guenstig', null),
    (c, 'Tagesausflug in eine andere Stadt', 'draussen', 'teurer', null),
    (c, 'Gemeinsam ein Puzzle machen', 'drinnen', 'kostenlos', null),
    (c, 'Eis essen gehen', 'draussen', 'guenstig', null),
    (c, 'Karaoke-Abend', 'drinnen', 'guenstig', null),
    (c, 'Museum oder Ausstellung besuchen', 'drinnen', 'guenstig', null),
    (c, 'Zusammen Sport machen oder Yoga', 'egal', 'kostenlos', null),
    (c, 'Cocktails selbst mixen', 'drinnen', 'guenstig', null),
    (c, 'Botanischen Garten oder Zoo besuchen', 'draussen', 'guenstig', null),
    (c, 'Briefe aneinander schreiben und vorlesen', 'drinnen', 'kostenlos', null),
    (c, 'Escape Room spielen', 'drinnen', 'teurer', null),
    (c, 'Kanu oder Tretboot fahren', 'draussen', 'guenstig', null),
    (c, 'Fondue- oder Raclette-Abend', 'drinnen', 'guenstig', null),
    (c, 'Konzert oder Live-Musik', 'egal', 'teurer', null),
    (c, 'Thermen- oder Saunatag', 'drinnen', 'teurer', null),
    (c, 'Gemeinsame Playlist erstellen und tanzen', 'drinnen', 'kostenlos', null),
    (c, 'Am See oder Fluss den Sonnenuntergang genießen', 'draussen', 'kostenlos', null),
    (c, 'Weinprobe oder Bierverkostung', 'drinnen', 'teurer', null),
    (c, 'Fotos von früher anschauen', 'drinnen', 'kostenlos', null),
    (c, 'Freizeitpark besuchen', 'draussen', 'teurer', null),
    (c, 'Zusammen backen: Kuchen oder Kekse', 'drinnen', 'guenstig', null),
    (c, 'Nachtspaziergang mit heißer Schokolade', 'draussen', 'guenstig', null),
    (c, 'Überraschungs-Date: einer plant, der andere weiß nichts', 'egal', 'guenstig', null);
  update couples set date_ideas_seeded = true where id = c;
end;
$$;

revoke all on function public.seed_date_ideas()            from public, anon;
revoke all on function public.toggle_wish_fulfilled(uuid)  from public, anon;
grant execute on function public.seed_date_ideas()           to authenticated;
grant execute on function public.toggle_wish_fulfilled(uuid) to authenticated;

-- ---------- Foto-Speicher: privater Bucket, Ordner pro Paar ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Fotos: Paar lesen"     on storage.objects;
drop policy if exists "Fotos: Paar hochladen" on storage.objects;
drop policy if exists "Fotos: Paar ändern"    on storage.objects;
drop policy if exists "Fotos: Paar löschen"   on storage.objects;

create policy "Fotos: Paar lesen" on storage.objects for select to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "Fotos: Paar hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "Fotos: Paar ändern" on storage.objects for update to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "Fotos: Paar löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple_id()::text);

-- ---------- Realtime: Änderungen sofort beim Partner ----------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['places', 'moments', 'countdowns', 'bucket_items', 'date_ideas', 'wishes', 'couples'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
