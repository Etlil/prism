-- Marks accounts created BEFORE email confirmation was switched off as
-- confirmed, so they can log in.
--
-- Turning off "Confirm email" in the dashboard only affects new signups. Anyone
-- who registered while it was on still has email_confirmed_at = null and is
-- rejected at login with email_not_confirmed — the app shows "This account
-- still needs confirming".
--
-- Only email_confirmed_at is written. `confirmed_at` is a generated column in
-- current Supabase and cannot be set by hand; it follows this one.
--
-- Safe to re-run: already-confirmed rows are skipped by the WHERE clause.

-- 1. Look first. These are the accounts that currently cannot log in.
select
  id,
  email,
  created_at,
  email_confirmed_at,
  case when email_confirmed_at is null then 'BLOCKED — cannot log in' else 'ok' end as status
from auth.users
order by created_at desc;

-- 2. Confirm them.
--
-- This says "trust every address already registered". That is fine while the
-- only accounts are yours and hers. Do NOT run it on a project real users can
-- sign up to — it would confirm addresses nobody proved they own.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 3. Verify: expect zero rows.
select id, email
from auth.users
where email_confirmed_at is null;
