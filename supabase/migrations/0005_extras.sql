-- ============================================================
-- Couple App · Extras: „Wer kennt wen besser?“-Quiz, Stimmungs-Ring, Zeitkapseln
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden. Setzt 0001–0004 voraus.
-- ============================================================

-- ================= Quiz =================

create table if not exists public.quiz_questions (
  id    int primary key,
  text  text not null            -- an die befragte Person gerichtet („Was ist dein …?“)
);
alter table public.quiz_questions enable row level security;
drop policy if exists "Quizfragen: lesen" on public.quiz_questions;
create policy "Quizfragen: lesen" on public.quiz_questions for select to authenticated using (true);
revoke all on public.quiz_questions from anon, authenticated;
grant select on public.quiz_questions to authenticated;

insert into public.quiz_questions (id, text) values
  (1, 'Was ist dein absolutes Lieblingsessen?'),
  (2, 'Welche Eissorte nimmst du im Sommer immer?'),
  (3, 'Was ist dein Lieblingsfilm?'),
  (4, 'Welche Serie könntest du immer wieder schauen?'),
  (5, 'Was ist dein Lieblingsgetränk?'),
  (6, 'Welches Lied hörst du gerade am häufigsten?'),
  (7, 'Was ist deine Lieblingsfarbe?'),
  (8, 'Welches Tier wärst du am liebsten?'),
  (9, 'Was ist dein Traumreiseziel?'),
  (10, 'Was würdest du mit einer Million Euro als Erstes machen?'),
  (11, 'Was ist dein größtes Talent?'),
  (12, 'Wovor hast du am meisten Angst?'),
  (13, 'Was ist dein Lieblingsort in unserer Stadt?'),
  (14, 'Was bestellst du beim Lieferdienst am liebsten?'),
  (15, 'Was ist dein Lieblingssnack für einen Filmabend?'),
  (16, 'Was war dein Lieblingsfach in der Schule?'),
  (17, 'Was wolltest du als Kind werden?'),
  (18, 'Was ist dein Lieblingsgericht von deiner Familie?'),
  (19, 'Welche Pizza bestellst du?'),
  (20, 'Kaffee oder Tee, und wie trinkst du ihn?'),
  (21, 'Was ist dein Lieblingsdessert?'),
  (22, 'Welche Jahreszeit magst du am liebsten?'),
  (23, 'Was machst du als Erstes, wenn du nach Hause kommst?'),
  (24, 'Was ist dein liebstes Hobby?'),
  (25, 'Wer ist dein Lieblingskünstler oder deine Lieblingsband?'),
  (26, 'Was ist dein Lieblingsbuch?'),
  (27, 'Was ist deine größte Macke?'),
  (28, 'Welches Essen magst du überhaupt nicht?'),
  (29, 'Was ist dein Lieblingsemoji?'),
  (30, 'Wie würdest du dich in drei Worten beschreiben?'),
  (31, 'Was ist dein Lieblingskleidungsstück?'),
  (32, 'Welche Superkraft hättest du gerne?'),
  (33, 'Was ist dein Guilty Pleasure?'),
  (34, 'Welches Spiel spielst du am liebsten?'),
  (35, 'Was ist dein liebster Sonntagsplan?'),
  (36, 'Welche Sportart würdest du am ehesten machen?'),
  (37, 'Was regt dich am schnellsten auf?'),
  (38, 'Womit kann man dich immer aufheitern?'),
  (39, 'Was ist dein Lieblingsduft?'),
  (40, 'Was ist dein Lieblingsfeiertag?'),
  (41, 'Welche Stadt würdest du gerne mal besuchen?'),
  (42, 'Was ist dein Lieblingsgemüse?'),
  (43, 'Was ist dein Lieblingsobst?'),
  (44, 'Süß oder salzig?'),
  (45, 'Berge oder Meer?'),
  (46, 'Frühaufsteher oder Langschläfer?'),
  (47, 'Was ist deine Lieblingsblume?'),
  (48, 'Was ist dein Lieblingscocktail oder -drink beim Ausgehen?'),
  (49, 'Welchen Promi würdest du gerne mal treffen?'),
  (50, 'Wohin ging dein schönster Urlaub als Kind?'),
  (51, 'Was ist dein Lieblingsfrühstück?'),
  (52, 'Welche App nutzt du am meisten?'),
  (53, 'Was ist dein Lieblingsspielzeug aus der Kindheit?'),
  (54, 'Was ist das Erste, was du morgens machst?'),
  (55, 'Was ist dein Lieblingswort?'),
  (56, 'Was ist deine liebste Pasta-Sorte?'),
  (57, 'Was würdest du nie essen, egal für wie viel Geld?'),
  (58, 'Was ist dein Lieblingsgeräusch?'),
  (59, 'Was war dein erstes Haustier oder welches hättest du gern gehabt?'),
  (60, 'Welches Restaurant ist dein Favorit?'),
  (61, 'Was ist dein Lieblingskuchen?'),
  (62, 'Was ist dein liebster Weg, dich zu entspannen?'),
  (63, 'Welches Geschenk würde dich gerade am meisten freuen?'),
  (64, 'Was ist deine Lieblingsschokolade?'),
  (65, 'Welcher Film bringt dich zum Weinen?'),
  (66, 'Was ist dein Lieblingsessen auf dem Weihnachtsmarkt oder Volksfest?'),
  (67, 'Was ist dein Lieblingswetter?'),
  (68, 'Was ist deine liebste Erinnerung an uns?'),
  (69, 'Was magst du an dir selbst am meisten?'),
  (70, 'Was ist dein Lieblingsgericht, das ich koche?'),
  (71, 'Was wäre dein perfektes Date?'),
  (72, 'Was ist dein liebstes Brettspiel oder Kartenspiel?'),
  (73, 'Was ist dein liebster YouTube-Kanal oder Podcast?'),
  (74, 'Welches Land würdest du für ein Jahr auswandern?'),
  (75, 'Welche Süßigkeit hast du als Kind am meisten geliebt?'),
  (76, 'Was ist dein Lieblingskompliment?'),
  (77, 'Was ist dein absolutes Lieblingslied zum Mitsingen?'),
  (78, 'Welcher Wochentag ist dein liebster?'),
  (79, 'Welches Topping kommt bei dir immer aufs Eis?'),
  (80, 'Was nimmst du immer mit in den Urlaub?')
on conflict (id) do update set text = excluded.text;

-- Eine Runde = 5 Fragen. submitted = wer schon abgegeben hat (für „wartet auf …“ ohne Inhalte zu verraten)
create table if not exists public.quiz_rounds (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  question_ids  int[] not null,
  submitted     uuid[] not null default '{}',
  finished_at   timestamptz,
  created_by    uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists quiz_rounds_couple_idx on public.quiz_rounds (couple_id, created_at desc);

-- Pro Person und Frage: eigene Antwort + Tipp, was der Partner antwortet.
-- guess_correct setzt der Partner (die befragte Person) nach dem Aufdecken.
create table if not exists public.quiz_entries (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  round_id       uuid not null references public.quiz_rounds (id) on delete cascade,
  question_id    int not null references public.quiz_questions (id),
  user_id        uuid not null references auth.users (id) on delete cascade,
  own_answer     text not null check (char_length(own_answer) between 1 and 200),
  guess          text not null check (char_length(guess) between 1 and 200),
  guess_correct  boolean,
  created_at     timestamptz not null default now(),
  unique (round_id, question_id, user_id)
);
create index if not exists quiz_entries_round_idx on public.quiz_entries (round_id);

create or replace function public.quiz_i_submitted(r uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$ select exists (select 1 from quiz_entries where round_id = r and user_id = auth.uid()) $$;

alter table public.quiz_rounds  enable row level security;
alter table public.quiz_entries enable row level security;
drop policy if exists "Quizrunde: lesen" on public.quiz_rounds;
create policy "Quizrunde: lesen" on public.quiz_rounds for select to authenticated
  using (couple_id = public.my_couple_id());
drop policy if exists "Quizantwort: lesen" on public.quiz_entries;
create policy "Quizantwort: lesen" on public.quiz_entries for select to authenticated
  using (couple_id = public.my_couple_id() and (user_id = auth.uid() or public.quiz_i_submitted(round_id)));
revoke all on public.quiz_rounds, public.quiz_entries from anon, authenticated;
grant select on public.quiz_rounds, public.quiz_entries to authenticated;

-- Laufende Runde zurückgeben oder neue mit 5 zufälligen, länger nicht gestellten Fragen anlegen
create or replace function public.quiz_start_round()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  r uuid;
  qs int[];
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  perform 1 from couples where id = c for update;  -- gleichzeitiges Starten verhindern
  select id into r from quiz_rounds where couple_id = c and finished_at is null order by created_at desc limit 1;
  if r is not null then return r; end if;

  select array_agg(id) into qs from (
    select q.id from quiz_questions q
    where q.id not in (
      select unnest(question_ids) from (
        select question_ids from quiz_rounds where couple_id = c order by created_at desc limit 12
      ) recent
    )
    order by random() limit 5
  ) pick;
  if coalesce(array_length(qs, 1), 0) < 5 then
    select array_agg(id) into qs from (select id from quiz_questions order by random() limit 5) pick;
  end if;

  insert into quiz_rounds (couple_id, question_ids, created_by) values (c, qs, auth.uid()) returning id into r;
  return r;
end;
$$;

-- Alle 5 Antworten auf einmal abgeben: answers = [{"question_id":1,"own":"…","guess":"…"}, …]
create or replace function public.quiz_submit(r uuid, answers jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  qs int[];
  a jsonb;
  n int := 0;
begin
  select question_ids into qs from quiz_rounds where id = r and couple_id = c and finished_at is null for update;
  if qs is null then raise exception 'Diese Runde gibt es nicht (mehr)'; end if;
  if quiz_i_submitted(r) then raise exception 'Du hast diese Runde schon abgegeben'; end if;

  for a in select * from jsonb_array_elements(answers) loop
    if not ((a->>'question_id')::int = any(qs)) then raise exception 'Falsche Frage'; end if;
    insert into quiz_entries (couple_id, round_id, question_id, user_id, own_answer, guess)
    values (c, r, (a->>'question_id')::int, auth.uid(), trim(a->>'own'), trim(a->>'guess'));
    n := n + 1;
  end loop;
  if n <> array_length(qs, 1) then raise exception 'Bitte alle Fragen beantworten'; end if;

  update quiz_rounds set submitted = array_append(submitted, auth.uid()) where id = r;
end;
$$;

-- Tipp des Partners über mich bewerten (nur wenn beide abgegeben haben)
create or replace function public.quiz_judge(entry uuid, correct boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  e quiz_entries;
  open_left int;
begin
  select * into e from quiz_entries where id = entry and couple_id = my_couple_id();
  if e.id is null or e.user_id = auth.uid() then raise exception 'Das kannst du nicht bewerten'; end if;
  if (select coalesce(array_length(submitted, 1), 0) from quiz_rounds where id = e.round_id) < 2 then
    raise exception 'Erst wenn beide abgegeben haben';
  end if;
  update quiz_entries set guess_correct = correct where id = entry;

  select count(*) into open_left from quiz_entries where round_id = e.round_id and guess_correct is null;
  if open_left = 0 then
    update quiz_rounds set finished_at = coalesce(finished_at, now()) where id = e.round_id;
  end if;
end;
$$;

-- ================= Stimmung =================

create table if not exists public.moods (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  mood        text not null check (mood in ('energie', 'kuschelig', 'muede', 'gestresst', 'entspannt', 'gluecklich', 'nachdenklich', 'krank')),
  day         date not null,           -- gilt nur an diesem Tag (deutsche Zeit), danach „zurückgesetzt“
  updated_at  timestamptz not null default now()
);
alter table public.moods enable row level security;
drop policy if exists "Stimmung: lesen" on public.moods;
create policy "Stimmung: lesen" on public.moods for select to authenticated using (couple_id = public.my_couple_id());
revoke all on public.moods from anon, authenticated;
grant select on public.moods to authenticated;

create or replace function public.set_mood(m text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare c uuid := my_couple_id();
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  insert into moods (user_id, couple_id, mood, day, updated_at)
  values (auth.uid(), c, m, berlin_today(), now())
  on conflict (user_id) do update set couple_id = excluded.couple_id, mood = excluded.mood, day = excluded.day, updated_at = now();
end;
$$;

-- ================= Zeitkapseln =================

create table if not exists public.capsules (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  title        text check (char_length(title) <= 60),
  open_on      date not null,
  photo_count  int not null default 0,
  notified_at  timestamptz,
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists capsules_couple_idx on public.capsules (couple_id, open_on);

-- Inhalt getrennt, damit er bis zum Öffnungstag für niemanden lesbar ist – auch nicht für den Ersteller
create table if not exists public.capsule_contents (
  capsule_id   uuid primary key references public.capsules (id) on delete cascade,
  couple_id    uuid not null references public.couples (id) on delete cascade,
  message      text not null check (char_length(message) between 1 and 3000),
  photo_paths  text[] not null default '{}'
);

alter table public.capsules         enable row level security;
alter table public.capsule_contents enable row level security;
drop policy if exists "Kapsel: lesen" on public.capsules;
create policy "Kapsel: lesen" on public.capsules for select to authenticated using (couple_id = public.my_couple_id());
drop policy if exists "Kapselinhalt: lesen ab Öffnungstag" on public.capsule_contents;
create policy "Kapselinhalt: lesen ab Öffnungstag" on public.capsule_contents for select to authenticated
  using (
    couple_id = public.my_couple_id()
    and exists (select 1 from public.capsules k where k.id = capsule_id and k.open_on <= public.berlin_today())
  );
revoke all on public.capsules, public.capsule_contents from anon, authenticated;
grant select on public.capsules, public.capsule_contents to authenticated;

create or replace function public.create_capsule(cap_title text, cap_open_on date, cap_message text, cap_photo_paths text[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  k uuid;
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  if cap_open_on <= berlin_today() then raise exception 'Das Öffnungsdatum muss in der Zukunft liegen'; end if;
  if coalesce(array_length(cap_photo_paths, 1), 0) > 5 then raise exception 'Höchstens 5 Fotos'; end if;
  if exists (select 1 from unnest(coalesce(cap_photo_paths, '{}')) p where split_part(p, '/', 1) <> c::text) then
    raise exception 'Ungültiges Foto';
  end if;
  insert into capsules (couple_id, title, open_on, photo_count, created_by)
  values (c, nullif(trim(cap_title), ''), cap_open_on, coalesce(array_length(cap_photo_paths, 1), 0), auth.uid())
  returning id into k;
  insert into capsule_contents (capsule_id, couple_id, message, photo_paths)
  values (k, c, trim(cap_message), coalesce(cap_photo_paths, '{}'));
  return k;
end;
$$;

-- Eigene, noch verschlossene Kapsel löschen; gibt die Fotopfade zum Aufräumen zurück
create or replace function public.delete_capsule(k uuid)
returns text[]
language plpgsql
security definer set search_path = public
as $$
declare paths text[];
begin
  select cc.photo_paths into paths
  from capsules ca join capsule_contents cc on cc.capsule_id = ca.id
  where ca.id = k and ca.couple_id = my_couple_id() and ca.created_by = auth.uid();
  if not found then raise exception 'Diese Kapsel kannst du nicht löschen'; end if;
  delete from capsules where id = k;
  return coalesce(paths, '{}');
end;
$$;

-- ================= Rechte für die Funktionen =================

revoke all on function public.quiz_i_submitted(uuid)                       from public, anon;
revoke all on function public.quiz_start_round()                           from public, anon;
revoke all on function public.quiz_submit(uuid, jsonb)                     from public, anon;
revoke all on function public.quiz_judge(uuid, boolean)                    from public, anon;
revoke all on function public.set_mood(text)                               from public, anon;
revoke all on function public.create_capsule(text, date, text, text[])     from public, anon;
revoke all on function public.delete_capsule(uuid)                         from public, anon;
grant execute on function public.quiz_i_submitted(uuid)                    to authenticated;
grant execute on function public.quiz_start_round()                        to authenticated;
grant execute on function public.quiz_submit(uuid, jsonb)                  to authenticated;
grant execute on function public.quiz_judge(uuid, boolean)                 to authenticated;
grant execute on function public.set_mood(text)                            to authenticated;
grant execute on function public.create_capsule(text, date, text, text[])  to authenticated;
grant execute on function public.delete_capsule(uuid)                      to authenticated;

-- ================= Täglicher Push für fällige Zeitkapseln =================
-- Ein zufälliges Geheimnis schützt den Aufruf der Edge Function durch den Zeitplan.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.cron_secret (id int primary key default 1 check (id = 1), secret text not null);
insert into private.cron_secret (id, secret)
values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- Nur die Edge Function (Service-Rolle) darf prüfen
create or replace function public.cron_secret_ok(s text)
returns boolean
language sql
stable
security definer set search_path = public
as $$ select exists (select 1 from private.cron_secret where secret = s) $$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.cron_secret_ok(text) to service_role';
  end if;
end $$;

-- Zeitplan: täglich um 7:00 UTC (8:00 bzw. 9:00 Uhr in Deutschland)
do $outer$
begin
  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
  exception when others then
    raise notice 'pg_cron/pg_net nicht verfügbar: %', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'couple-capsules';
    perform cron.schedule(
      'couple-capsules',
      '0 7 * * *',
      $job$
        select net.http_post(
          url := 'https://kpfahnaxdgvhntsvfagx.supabase.co/functions/v1/notify',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select secret from private.cron_secret where id = 1)),
          body := '{"type":"cron"}'::jsonb
        );
      $job$
    );
  end if;
end;
$outer$;

-- ================= Realtime =================

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['quiz_rounds', 'quiz_entries', 'moods', 'capsules'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
