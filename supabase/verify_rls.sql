-- Confirms row-level security is actually switched on and has policies, for
-- every table that holds personal data.
--
-- RLS enabled with ZERO policies means deny-all (safe but the app reads
-- nothing). RLS DISABLED means every signed-in user can read every row —
-- that is the dangerous state, and it is easy to miss because the app looks
-- like it works.
--
-- Read-only. Safe to run any time.

select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  count(p.policyname)                         as policy_count,
  coalesce(string_agg(p.cmd, ', ' order by p.cmd), '—') as commands,
  case
    when not c.relrowsecurity then '*** DANGER — RLS OFF, every user can read every row ***'
    when count(p.policyname) = 0 then 'RLS on but no policies — nothing is readable'
    when count(p.policyname) < 4 then 'RLS on, but not all of SELECT/INSERT/UPDATE/DELETE covered'
    else 'ok'
  end                                         as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'moods', 'entries', 'photos', 'journal_keys')
group by c.relname, c.relrowsecurity
order by c.relname;

-- Every policy should compare against auth.uid(). Anything here whose
-- qualifier does not mention auth.uid() is not scoping rows to their owner.
select
  tablename,
  policyname,
  cmd,
  case
    when coalesce(qual, '') || coalesce(with_check, '') like '%auth.uid()%' then 'ok'
    else '*** does not check auth.uid() ***'
  end as scoping
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'moods', 'entries', 'photos', 'journal_keys')
order by tablename, cmd;

-- Storage: the photo bucket must be private, and its policies must pin the
-- first path segment to the user id.
select id, public,
  case when public then '*** DANGER — bucket is public, any URL is readable ***' else 'ok' end
    as verdict
from storage.buckets
where id = 'journal-photos';

select policyname, cmd,
  case
    when coalesce(qual, '') || coalesce(with_check, '') like '%auth.uid()%' then 'ok'
    else '*** does not check auth.uid() ***'
  end as scoping
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'journal photos%'
order by cmd;
