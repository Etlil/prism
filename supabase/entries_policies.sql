-- RLS policies for the entries table.
--
-- Same shape as moods_policies.sql. Without these the app reads an empty year
-- and every save fails — RLS on with no policy denies everything.
--
-- The app upserts entries (insert-or-update on the unique (user_id,
-- entry_date) index), and an upsert can take either path, so INSERT and UPDATE
-- policies must both exist or saving a day fails intermittently depending on
-- whether that day had been written before.
--
-- Safe to re-run.

alter table public.entries enable row level security;

drop policy if exists "entries select own" on public.entries;
create policy "entries select own"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "entries insert own" on public.entries;
create policy "entries insert own"
  on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "entries update own" on public.entries;
create policy "entries update own"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "entries delete own" on public.entries;
create policy "entries delete own"
  on public.entries for delete
  using (auth.uid() = user_id);

-- Confirm: expect four rows — SELECT, INSERT, UPDATE, DELETE.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'entries'
order by cmd;
