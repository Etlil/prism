-- Lets someone delete their own account from inside the app.
--
-- The browser holds only the anon key, which cannot touch auth.users — that
-- needs the service_role key, and putting that in a web app would hand every
-- visitor full control of the database. So deletion goes through this function
-- instead: it runs with elevated rights, but can only ever delete the account
-- of whoever called it.
--
-- security definer  = runs as the function's owner, bypassing RLS
-- set search_path='' = the matching safety measure, so a caller cannot shadow
--                      a table name and trick the elevated code into hitting
--                      something else. Every name below is fully qualified.
--
-- The guard on auth.uid() is what makes this safe. Without it, security definer
-- would happily delete any row asked for.
--
-- Rows are deleted explicitly rather than trusting ON DELETE CASCADE, because
-- the older tables (profiles, moods, entries) were created before this project
-- standardised on cascades and may not have them.
--
-- Safe to re-run.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;

  -- Children before parents. photos references entries, so it goes first.
  delete from public.photos       where user_id = uid;
  delete from public.entries      where user_id = uid;
  delete from public.moods        where user_id = uid;
  delete from public.journal_keys where user_id = uid;
  delete from public.profiles     where id      = uid;

  -- Removing the auth row is what actually ends the account. Any session
  -- tokens stop working immediately.
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in callers. anon has no business calling this at all, and
-- without this grant PostgREST will not expose it.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Confirm: expect one row.
select
  p.proname,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'delete_own_account';
