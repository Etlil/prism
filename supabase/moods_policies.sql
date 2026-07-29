-- RLS policies for the moods table.
--
-- RLS being ON with no policies means "deny everything" — reads come back
-- empty and writes fail with 42501. Each policy below grants one operation,
-- and only for rows the signed-in user owns.
--
-- using      = which existing rows you may see or change
-- with check = what a row must look like after you write it
--
-- Safe to re-run.

alter table public.moods enable row level security;

drop policy if exists "moods select own" on public.moods;
create policy "moods select own"
  on public.moods for select
  using (auth.uid() = user_id);

drop policy if exists "moods insert own" on public.moods;
create policy "moods insert own"
  on public.moods for insert
  with check (auth.uid() = user_id);

drop policy if exists "moods update own" on public.moods;
create policy "moods update own"
  on public.moods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Archiving is an update, not a delete, so this is only here for tidying up
-- by hand. The app never calls it.
drop policy if exists "moods delete own" on public.moods;
create policy "moods delete own"
  on public.moods for delete
  using (auth.uid() = user_id);

-- Confirm: expect four rows — SELECT, INSERT, UPDATE, DELETE.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'moods'
order by cmd;
