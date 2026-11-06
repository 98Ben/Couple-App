-- ============================================================
-- Couple App · Nachrichten: Liebesnotizen (inkl. Doodles) und Frage des Tages
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden. Setzt 0001 und 0002 voraus.
-- ============================================================

-- ---------- Liebesnotizen & Doodles (gemeinsame Pinnwand) ----------

create table if not exists public.love_notes (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  text         text check (char_length(text) between 1 and 280),
  color        text not null default 'rose' check (color in ('rose', 'peach', 'lav', 'sun')),
  doodle_path  text,                          -- gesetzt = gezeichnetes Bild statt (oder zusätzlich zu) Text
  heart_at     timestamptz,                   -- Herz-Reaktion des Partners
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint love_notes_inhalt check (text is not null or doodle_path is not null)
);
create index if not exists love_notes_couple_idx on public.love_notes (couple_id, created_at desc);

alter table public.love_notes enable row level security;
drop policy if exists "Notiz: lesen" on public.love_notes;
drop policy if exists "Notiz: schreiben" on public.love_notes;
drop policy if exists "Notiz: löschen" on public.love_notes;
create policy "Notiz: lesen" on public.love_notes for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "Notiz: schreiben" on public.love_notes for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "Notiz: löschen" on public.love_notes for delete to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid());
revoke all on public.love_notes from anon, authenticated;
grant select, insert, delete on public.love_notes to authenticated;

-- Herz nur vom Partner (nicht auf eigene Notizen)
create or replace function public.toggle_note_heart(note uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update love_notes
     set heart_at = case when heart_at is null then now() else null end
   where id = note and couple_id = my_couple_id() and created_by <> auth.uid();
  if not found then
    raise exception 'Diese Notiz kannst du nicht mit einem Herz versehen';
  end if;
end;
$$;

-- ---------- Frage des Tages ----------

create table if not exists public.daily_questions (
  id    int primary key,
  text  text not null
);
alter table public.daily_questions enable row level security;
drop policy if exists "Fragen: lesen" on public.daily_questions;
create policy "Fragen: lesen" on public.daily_questions for select to authenticated using (true);
revoke all on public.daily_questions from anon, authenticated;
grant select on public.daily_questions to authenticated;

insert into public.daily_questions (id, text) values
  (1, 'Was war dein Lieblingsmoment mit mir diese Woche?'),
  (2, 'An welchem Ort sollten wir unser nächstes Abenteuer starten?'),
  (3, 'Woran hast du gemerkt, dass du dich in mich verliebt hast?'),
  (4, 'Welches Lied erinnert dich an uns?'),
  (5, 'Was ist eine kleine Sache, die ich tue und die dich glücklich macht?'),
  (6, 'Wenn wir morgen spontan verreisen könnten, wohin ginge es?'),
  (7, 'Was war dein erster Eindruck von mir?'),
  (8, 'Welche gemeinsame Erinnerung bringt dich immer zum Lachen?'),
  (9, 'Was möchtest du in diesem Jahr unbedingt noch mit mir erleben?'),
  (10, 'Welches Essen verbindest du mit uns?'),
  (11, 'Wie würde dein perfekter Sonntag mit mir aussehen?'),
  (12, 'Was schätzt du an mir, das ich vielleicht gar nicht weiß?'),
  (13, 'Welche Superkraft hätten wir als Paar?'),
  (14, 'Was war das schönste Geschenk, das du je bekommen hast?'),
  (15, 'Wenn unsere Beziehung ein Film wäre, welcher Titel würde passen?'),
  (16, 'Welche Eigenschaft von mir würdest du gerne selbst haben?'),
  (17, 'Wo siehst du uns in fünf Jahren?'),
  (18, 'Was ist dein liebstes Kosewort für mich?'),
  (19, 'Welche Gewohnheit von mir findest du heimlich süß?'),
  (20, 'Was war unser lustigstes Missgeschick?'),
  (21, 'Was gibt dir in stressigen Zeiten am meisten Kraft?'),
  (22, 'Welchen Traum hast du, den du noch nie laut ausgesprochen hast?'),
  (23, 'Wenn du einen Tag mit mir tauschen könntest, was würdest du als Erstes tun?'),
  (24, 'Was war der Moment, in dem du dich mir besonders nah gefühlt hast?'),
  (25, 'Welches Tier wäre ich und warum?'),
  (26, 'Was ist deine liebste Kindheitserinnerung, die du mir noch nie erzählt hast?'),
  (27, 'Welche drei Dinge würdest du auf eine einsame Insel mitnehmen, außer mir?'),
  (28, 'Was möchtest du gerne noch lernen?'),
  (29, 'Welche Tradition sollten wir zusammen starten?'),
  (30, 'Was ist das Mutigste, was du je getan hast?'),
  (31, 'Welche Kleinigkeit hat dir heute ein Lächeln geschenkt?'),
  (32, 'Wie sieht für dich ein perfektes Date aus?'),
  (33, 'Was ist dein liebstes Foto von uns und warum?'),
  (34, 'Welche Stadt würdest du gerne mit mir erkunden?'),
  (35, 'Was macht dich an mir manchmal verrückt, auf eine liebevolle Art?'),
  (36, 'Wofür bist du heute dankbar?'),
  (37, 'Welcher Film sollte unbedingt unser nächster Filmabend sein?'),
  (38, 'Was würdest du deinem jüngeren Ich über die Liebe sagen?'),
  (39, 'Wenn wir ein gemeinsames Hobby anfangen würden, welches wäre es?'),
  (40, 'Was ist dein Lieblingsgeruch?'),
  (41, 'Welche Jahreszeit passt am besten zu uns?'),
  (42, 'Was ist das Netteste, was jemand Fremdes je für dich getan hat?'),
  (43, 'Welches Kompliment hörst du am liebsten?'),
  (44, 'Was war dein größtes Highlight des letzten Monats?'),
  (45, 'Wie würdest du unsere Beziehung in drei Worten beschreiben?'),
  (46, 'Welche Mahlzeit sollte ich dir mal kochen?'),
  (47, 'Was beruhigt dich am schnellsten?'),
  (48, 'Was ist ein Ziel, bei dem ich dich unterstützen kann?'),
  (49, 'Welche Serie könntest du immer wieder schauen?'),
  (50, 'Wenn du heute Abend alles machen könntest, was wäre es?'),
  (51, 'Welches Wort benutzt du viel zu oft?'),
  (52, 'Was ist deine früheste Erinnerung?'),
  (53, 'Welche Reise war bisher die schönste deines Lebens?'),
  (54, 'Welches Abenteuer würdest du nie alleine, aber mit mir machen?'),
  (55, 'Was bedeutet Zuhause für dich?'),
  (56, 'Wie kann ich dir zeigen, dass ich dich liebe, wenn du einen schlechten Tag hast?'),
  (57, 'Was ist dein Lieblingsplatz in unserer Stadt?'),
  (58, 'Welche Eigenschaft bewunderst du an deinen Eltern?'),
  (59, 'Was war dein Lieblingsspielzeug als Kind?'),
  (60, 'Welches Buch hat dich am meisten geprägt?'),
  (61, 'Was würdest du tun, wenn du im Lotto gewinnst?'),
  (62, 'Welche Sprache würdest du gerne können?'),
  (63, 'Was ist dein absolutes Lieblingsdessert?'),
  (64, 'Welcher Moment heute war der beste?'),
  (65, 'Wann hast du zuletzt so richtig gelacht?'),
  (66, 'Wenn wir eine Band wären, wie würden wir heißen?'),
  (67, 'Was möchtest du öfter zusammen machen?'),
  (68, 'Welche Angst hast du schon überwunden?'),
  (69, 'Was ist deine liebste Art, einen Abend ausklingen zu lassen?'),
  (70, 'Was war die beste Entscheidung, die du je getroffen hast?'),
  (71, 'Welche App würdest du am ehesten löschen?'),
  (72, 'Wenn du ein Restaurant eröffnen würdest, was gäbe es dort?'),
  (73, 'Was hat dich zuletzt richtig stolz gemacht?'),
  (74, 'Wie stellst du dir unser Traumhaus vor?'),
  (75, 'Welche kleine Geste von mir vergisst du nie?'),
  (76, 'Was ist dein Lieblingswetter?'),
  (77, 'Welche Musik hörst du, wenn du gute Laune willst?'),
  (78, 'Was würdest du gerne mal ganz verrückt ausprobieren?'),
  (79, 'Welche Frage wolltest du mir schon immer mal stellen?'),
  (80, 'Was macht für dich einen richtig gemütlichen Abend aus?'),
  (81, 'Welche Kindheitsserie liebst du heute noch?'),
  (82, 'Wenn wir einen Tag unsichtbar wären, was würden wir anstellen?'),
  (83, 'Was ist dein liebster Feiertag und warum?'),
  (84, 'Welches Geräusch macht dich glücklich?'),
  (85, 'Was ist dein Talent, das kaum jemand kennt?'),
  (86, 'Welches Land steht ganz oben auf deiner Reiseliste?'),
  (87, 'Was gefällt dir an unserem Alltag am meisten?'),
  (88, 'Welches Gericht deiner Familie sollte ich unbedingt probieren?'),
  (89, 'Was ist das Romantischste, das du dir vorstellen kannst?'),
  (90, 'Wenn du einen Brief an uns in zehn Jahren schreiben würdest, was stünde drin?'),
  (91, 'Was ist deine liebste Morgenroutine?'),
  (92, 'Welcher Duft erinnert dich an mich?'),
  (93, 'Welches Spiel sollten wir mal zusammen spielen?'),
  (94, 'Was war das schönste Kompliment, das ich dir je gemacht habe?'),
  (95, 'Welche Farbe beschreibt deine heutige Stimmung?'),
  (96, 'Was ist dein größtes Guilty Pleasure?'),
  (97, 'Welche Person hat dein Leben am meisten beeinflusst?'),
  (98, 'Wenn wir ein Wochenende ohne Handy hätten, was würden wir tun?'),
  (99, 'Welche Erinnerung möchtest du nie vergessen?'),
  (100, 'Was ist dein Lieblingsemoji und warum?'),
  (101, 'Was würdest du gerne öfter von mir hören?'),
  (102, 'Welcher Ort auf der Welt hat dich am meisten beeindruckt?'),
  (103, 'Was war dein peinlichster Moment in der Schule?'),
  (104, 'Welche Snacks gehören zu einem perfekten Filmabend?'),
  (105, 'Was bedeutet Vertrauen für dich?'),
  (106, 'Welche Sportart würdest du gerne mal mit mir ausprobieren?'),
  (107, 'Was hast du diese Woche Neues gelernt?'),
  (108, 'Wenn wir ein Haustier hätten, wie würde es heißen?'),
  (109, 'Was ist dein Lieblingsort zum Nachdenken?'),
  (110, 'Welche Eigenschaft macht für dich einen guten Freund aus?'),
  (111, 'Was war das beste Konzert oder Event, auf dem du je warst?'),
  (112, 'Welches Abenteuer aus deiner Bucket List ist dir am wichtigsten?'),
  (113, 'Was würdest du am liebsten an einem Regentag mit mir machen?'),
  (114, 'Welche Zeit des Tages magst du am meisten?'),
  (115, 'Was ist dein Lieblingszitat oder Lebensmotto?'),
  (116, 'Wie hat sich dein Leben verändert, seit wir zusammen sind?'),
  (117, 'Was ist dein liebstes Kleidungsstück und warum?'),
  (118, 'Welche drei Wörter beschreiben dich am besten?'),
  (119, 'Wenn du eine Zeitreise machen könntest, wohin ginge es?'),
  (120, 'Was war unser bisher schönstes Date?'),
  (121, 'Welche Gewohnheit möchtest du dir gerne angewöhnen?'),
  (122, 'Was ist dein liebster Snack für unterwegs?'),
  (123, 'Wann fühlst du dich am meisten geliebt?'),
  (124, 'Welche Überraschung würde dich so richtig umhauen?'),
  (125, 'Was ist das Beste an einem Sonntagmorgen?'),
  (126, 'Welches Abenteuer haben wir schon viel zu lange aufgeschoben?'),
  (127, 'Was hättest du als Kind gerne mal gemacht, durftest es aber nicht?'),
  (128, 'Welche Pflanze würde am besten zu uns passen?'),
  (129, 'Was ist dein Lieblingsgetränk an einem kalten Tag?'),
  (130, 'Wenn du heute einen Wunsch frei hättest, welcher wäre es?'),
  (131, 'Welches Spiel aus deiner Kindheit sollten wir wieder spielen?'),
  (132, 'Was macht unsere Beziehung besonders?'),
  (133, 'Welchen Rat würdest du einem frisch verliebten Paar geben?'),
  (134, 'Was ist dein liebster Ort zum Entspannen?'),
  (135, 'Welche Eigenschaft von dir mag ich wohl am meisten?'),
  (136, 'Was würdest du an einem freien Tag ganz allein machen?'),
  (137, 'Welches Lied singst du heimlich unter der Dusche?'),
  (138, 'Was war dein schönster Geburtstag?'),
  (139, 'Wie würdest du gerne unseren nächsten Jahrestag feiern?'),
  (140, 'Was ist dein Lieblingsgemüse, ehrlich jetzt?'),
  (141, 'Welche Stadt würdest du als Wahlheimat wählen?'),
  (142, 'Was hat dich heute überrascht?'),
  (143, 'Welche Erinnerung an uns würdest du gerne nochmal erleben?'),
  (144, 'Was bringt dich immer zum Weinen, im Guten?'),
  (145, 'Welche Fähigkeit von mir würdest du gerne lernen?'),
  (146, 'Was ist das Schönste, das du heute gesehen hast?'),
  (147, 'Wofür möchtest du mir heute einfach mal Danke sagen?'),
  (148, 'Was ist für dich ein Zeichen echter Liebe?'),
  (149, 'Welcher Moment heute hätte ein Foto verdient?'),
  (150, 'Wovon hast du letzte Nacht geträumt?')
on conflict (id) do update set text = excluded.text;

create table if not exists public.question_answers (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  day          date not null,
  question_id  int not null references public.daily_questions (id),
  answer       text not null check (char_length(answer) between 1 and 1000),
  created_at   timestamptz not null default now(),
  unique (couple_id, user_id, day)
);
create index if not exists question_answers_couple_idx on public.question_answers (couple_id, day desc);

-- Heutiger Tag in deutscher Zeit
create or replace function public.berlin_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Europe/Berlin')::date $$;

create or replace function public.question_id_for(d date)
returns int
language sql
stable
as $$
  select (((d - date '2026-01-01') % n + n) % n) + 1
  from (select count(*)::int as n from public.daily_questions) c
$$;

-- Hat die angemeldete Person an diesem Tag schon geantwortet? (security definer verhindert RLS-Rekursion)
create or replace function public.i_answered(d date)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from question_answers where user_id = auth.uid() and day = d)
$$;

alter table public.question_answers enable row level security;
drop policy if exists "Antwort: lesen" on public.question_answers;
create policy "Antwort: lesen" on public.question_answers for select to authenticated
  using (
    couple_id = public.my_couple_id()
    and (
      user_id = auth.uid()                 -- eigene Antworten immer
      or public.i_answered(day)            -- Partner-Antwort erst nach eigener Antwort
      or day < public.berlin_today()       -- vergangene Tage: alles sichtbar
    )
  );
-- Schreiben nur über answer_today(); ändern und löschen gar nicht
revoke all on public.question_answers from anon, authenticated;
grant select on public.question_answers to authenticated;

-- Heutige Frage + ob der Partner schon geantwortet hat (ohne den Inhalt zu verraten)
create or replace function public.today_question()
returns table (day date, question_id int, text text, partner_answered boolean, i_answered boolean)
language sql
stable
security definer set search_path = public
as $$
  select t.d, q.id, q.text,
         exists (select 1 from question_answers a
                  where a.couple_id = my_couple_id() and a.day = t.d and a.user_id <> auth.uid()),
         exists (select 1 from question_answers a where a.user_id = auth.uid() and a.day = t.d)
  from (select berlin_today() as d) t
  join daily_questions q on q.id = question_id_for(t.d)
$$;

-- Antwort für heute abgeben (nur einmal, nur am selben Tag)
create or replace function public.answer_today(answer text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  d date := berlin_today();
begin
  if c is null then
    raise exception 'Du bist noch mit niemandem verknüpft';
  end if;
  if char_length(trim(answer)) = 0 then
    raise exception 'Bitte schreib eine Antwort';
  end if;
  insert into question_answers (couple_id, user_id, day, question_id, answer)
  values (c, auth.uid(), d, question_id_for(d), trim(answer));
exception
  when unique_violation then
    raise exception 'Du hast heute schon geantwortet';
end;
$$;

revoke all on function public.toggle_note_heart(uuid) from public, anon;
revoke all on function public.today_question()        from public, anon;
revoke all on function public.answer_today(text)      from public, anon;
revoke all on function public.i_answered(date)        from public, anon;
grant execute on function public.toggle_note_heart(uuid) to authenticated;
grant execute on function public.today_question()        to authenticated;
grant execute on function public.answer_today(text)      to authenticated;
grant execute on function public.i_answered(date)        to authenticated;
grant execute on function public.berlin_today()          to authenticated;
grant execute on function public.question_id_for(date)   to authenticated;

-- ---------- Realtime ----------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['love_notes', 'question_answers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
