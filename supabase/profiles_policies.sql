-- RLS policies for the profiles table.
--
-- Same shape as moods_policies.sql, with one difference: the owner column here
-- is the primary key `id` (it references auth.users.id), not `user_id`.
--
-- No INSERT policy on purpose. Profile rows are created by the
-- on_auth_user_created trigger, which is security definer and bypasses RLS.
-- The browser should never insert one.
--
-- Safe to re-run.

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Confirm: expect two rows — SELECT and UPDATE.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by cmd;
