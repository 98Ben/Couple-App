-- Couple App – Briefe mit Zustellzeit und „Wünsche“ (was ich gerade brauche)
-- Wiederholbar ausführbar. Im Supabase SQL Editor komplett ausführen.

-- ================= Briefe =================
-- Komplette Überraschung: Der Empfänger sieht den Brief erst ab der Zustellzeit.

create table if not exists public.letters (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  sender       uuid not null references auth.users (id) on delete cascade,
  recipient    uuid not null references auth.users (id) on delete cascade,
  message      text not null check (char_length(message) between 1 and 5000),
  photo_path   text,
  deliver_at   timestamptz not null,
  notified_at  timestamptz,
  opened_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists letters_recipient_idx on public.letters (recipient, deliver_at);
create index if not exists letters_due_idx on public.letters (deliver_at) where notified_at is null;

alter table public.letters enable row level security;
drop policy if exists "Brief: lesen" on public.letters;
create policy "Brief: lesen" on public.letters for select to authenticated
  using (
    couple_id = public.my_couple_id()
    and (sender = auth.uid() or (recipient = auth.uid() and deliver_at <= now()))
  );
revoke all on public.letters from anon, authenticated;
grant select on public.letters to authenticated;

create or replace function public.send_letter(l_message text, l_photo_path text, l_deliver_at timestamptz)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  c uuid := my_couple_id();
  r uuid;
  l uuid;
begin
  if c is null then raise exception 'Du bist noch mit niemandem verknüpft'; end if;
  select id into r from profiles where couple_id = c and id <> auth.uid() limit 1;
  if r is null then raise exception 'Dein Schatz ist noch nicht verbunden'; end if;
  if l_deliver_at <= now() then raise exception 'Der Zeitpunkt muss in der Zukunft liegen'; end if;
  if l_photo_path is not null and split_part(l_photo_path, '/', 1) <> c::text then raise exception 'Ungültiges Foto'; end if;
  insert into letters (couple_id, sender, recipient, message, photo_path, deliver_at)
  values (c, auth.uid(), r, trim(l_message), l_photo_path, l_deliver_at)
  returning id into l;
  return l;
end;
$$;

-- Empfänger hat den Brief geöffnet (nur einmal, nur ab Zustellung)
create or replace function public.open_letter(l uuid)
returns void
language sql
security definer set search_path = public
as $$
  update letters set opened_at = now()
   where id = l and recipient = auth.uid() and deliver_at <= now() and opened_at is null;
$$;

-- Eigenen Brief zurückholen, solange er noch nicht angekommen ist; gibt den Fotopfad zum Aufräumen zurück
create or replace function public.delete_letter(l uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare p text;
begin
  delete from letters where id = l and sender = auth.uid() and deliver_at > now() returning photo_path into p;
  if not found then raise exception 'Dieser Brief ist schon angekommen'; end if;
  return p;
end;
$$;

-- ================= Wünsche: was ich gerade brauche =================

create table if not exists public.needs (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null default public.my_couple_id() references public.couples (id) on delete cascade,
  kind          text not null check (kind in ('umarmungen', 'zeit', 'ueberraschungen', 'komplimente', 'unterstuetzung', 'zuhoeren', 'zaertlichkeit', 'date', 'ruhe', 'eigen')),
  text          text check (char_length(text) <= 200),
  heart_at      timestamptz,
  fulfilled_at  timestamptz,
  created_by    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists needs_couple_idx on public.needs (couple_id, created_at desc);

alter table public.needs enable row level security;
drop policy if exists "Bedürfnis: lesen" on public.needs;
drop policy if exists "Bedürfnis: schreiben" on public.needs;
drop policy if exists "Bedürfnis: ändern" on public.needs;
drop policy if exists "Bedürfnis: löschen" on public.needs;
create policy "Bedürfnis: lesen" on public.needs for select to authenticated
  using (couple_id = public.my_couple_id());
create policy "Bedürfnis: schreiben" on public.needs for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
-- Nur wer den Wunsch hat, ändert ihn oder hakt ihn als erfüllt ab
create policy "Bedürfnis: ändern" on public.needs for update to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid())
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy "Bedürfnis: löschen" on public.needs for delete to authenticated
  using (couple_id = public.my_couple_id() and created_by = auth.uid());
revoke all on public.needs from anon, authenticated;
grant select, insert, delete on public.needs to authenticated;
grant update (kind, text, fulfilled_at) on public.needs to authenticated;

-- Herz („gesehen 💗“) gibt nur die andere Person
create or replace function public.toggle_need_heart(n uuid)
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare h timestamptz;
begin
  update needs
     set heart_at = case when heart_at is null then now() else null end
   where id = n and couple_id = my_couple_id() and created_by <> auth.uid()
  returning heart_at into h;
  if not found then raise exception 'Diesen Wunsch kannst du nicht mit einem Herz versehen'; end if;
  return h;
end;
$$;

-- ================= Rechte für die Funktionen =================

revoke all on function public.send_letter(text, text, timestamptz) from public, anon;
revoke all on function public.open_letter(uuid)                    from public, anon;
revoke all on function public.delete_letter(uuid)                  from public, anon;
revoke all on function public.toggle_need_heart(uuid)              from public, anon;
grant execute on function public.send_letter(text, text, timestamptz) to authenticated;
grant execute on function public.open_letter(uuid)                    to authenticated;
grant execute on function public.delete_letter(uuid)                  to authenticated;
grant execute on function public.toggle_need_heart(uuid)              to authenticated;

-- ================= Zeitplan: Briefe alle 5 Minuten zustellen =================
-- Nutzt dasselbe Geheimnis wie der Zeitkapsel-Job aus 0005.

do $outer$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'couple-letters';
    perform cron.schedule(
      'couple-letters',
      '*/5 * * * *',
      $job$
        select net.http_post(
          url := 'https://kpfahnaxdgvhntsvfagx.supabase.co/functions/v1/notify',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select secret from private.cron_secret where id = 1)),
          body := '{"type":"cron","job":"letters"}'::jsonb
        )
        where exists (select 1 from public.letters where notified_at is null and deliver_at <= now());
      $job$
    );
  else
    raise notice 'pg_cron/pg_net fehlen – bitte erst 0005_extras.sql ausführen';
  end if;
end;
$outer$;

-- ================= Realtime =================

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['needs', 'letters'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
