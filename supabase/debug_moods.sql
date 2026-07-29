-- 1. Does each user actually have mood rows?
--    If mood_count is 0, the moods were never seeded — run check_and_backfill.sql.
select
  u.email,
  count(m.id) as mood_count,
  count(m.id) filter (where m.is_archived) as archived_count
from auth.users u
left join public.moods m on m.user_id = u.id
group by u.email
order by u.email;

-- 2. What RLS policies exist on moods?
--    You need a SELECT policy, or the app reads back an empty list even though
--    the rows are there. Expect to see cmd = SELECT, INSERT, UPDATE.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'moods'
order by cmd;

-- 3. Confirm RLS is switched on for the table.
select relname, relrowsecurity as rls_enabled
from pg_class
where relname in ('moods', 'profiles', 'entries');

-- 4. The actual rows, so you can eyeball emoji and colours.
select user_id, label, emoji, color_hex, sort_order, is_archived
from public.moods
order by user_id, sort_order;
