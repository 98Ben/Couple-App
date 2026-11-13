-- Couple App – 6 weitere Stimmungen und Quiz-Antworten nachträglich ändern
-- Wiederholbar ausführbar. Im Supabase SQL Editor komplett ausführen.

-- ================= Stimmungen: 14 statt 8 =================
alter table public.moods drop constraint if exists moods_mood_check;
alter table public.moods add constraint moods_mood_check check (mood in (
  'energie', 'kuschelig', 'muede', 'gestresst', 'entspannt', 'gluecklich', 'nachdenklich', 'krank',
  'aufgeregt', 'sehnsucht', 'traurig', 'genervt', 'dankbar', 'albern'
));

-- ================= Quiz: eigene Antworten ändern =================
-- Erlaubt, solange der Partner noch nicht abgegeben hat (danach wird aufgedeckt).
-- answers = [{"question_id":1,"own":"…","guess":"…"}, …]
create or replace function public.quiz_update(r uuid, answers jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  rd quiz_rounds;
  a jsonb;
begin
  select * into rd from quiz_rounds where id = r and couple_id = c and finished_at is null for update;
  if rd.id is null then raise exception 'Diese Runde gibt es nicht (mehr)'; end if;
  if not (auth.uid() = any(rd.submitted)) then raise exception 'Du hast diese Runde noch nicht abgegeben'; end if;
  if coalesce(array_length(rd.submitted, 1), 0) >= 2 then
    raise exception 'Schon aufgedeckt – jetzt kann nichts mehr geändert werden';
  end if;

  for a in select * from jsonb_array_elements(answers) loop
    if coalesce(trim(a->>'own'), '') = '' or coalesce(trim(a->>'guess'), '') = '' then
      raise exception 'Bitte alle Felder ausfüllen';
    end if;
    update quiz_entries
       set own_answer = trim(a->>'own'), guess = trim(a->>'guess')
     where round_id = r and user_id = auth.uid() and question_id = (a->>'question_id')::int;
  end loop;
end;
$$;

revoke all on function public.quiz_update(uuid, jsonb) from public, anon;
grant execute on function public.quiz_update(uuid, jsonb) to authenticated;
