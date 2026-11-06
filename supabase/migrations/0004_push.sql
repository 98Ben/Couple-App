-- ============================================================
-- Couple App · Push-Benachrichtigungen: Geräte-Anmeldungen
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- ============================================================

-- Pro Gerät (Browser/iPhone-App) eine Zeile. Die Edge Function "notify" liest sie mit
-- Service-Rechten und schickt die Benachrichtigung an die Geräte des Partners.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "Push: eigene" on public.push_subscriptions;
create policy "Push: eigene" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Gerät (neu) anmelden. Ein Endpoint gehört immer der zuletzt angemeldeten Person.
drop function if exists public.save_push_subscription(text, text, text, text);
create or replace function public.save_push_subscription(sub_endpoint text, sub_p256dh text, sub_auth text, sub_user_agent text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), sub_endpoint, sub_p256dh, sub_auth, left(sub_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
