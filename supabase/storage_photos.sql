-- Storage bucket for journal photos.
--
-- Private bucket (public = false): nothing is readable by URL alone. The app
-- calls createSignedUrl() to display an image, which mints a link that expires.
-- That is why photos.storage_path stores a PATH, not a URL — a signed URL would
-- go stale in the database within the hour.
--
-- Files are laid out as:   <user_id>/<entry_date>/<uuid>.<ext>
--
-- storage.foldername(name) splits that path into an array, so element 1 is the
-- user id — which is what every policy below compares against auth.uid(). This
-- is the whole reason the user id is the FIRST path segment: it makes "is this
-- yours?" answerable from the filename.
--
-- Safe to re-run.

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', false)
on conflict (id) do nothing;

-- Policies live on storage.objects, which is a normal table with RLS already
-- enabled by Supabase.
drop policy if exists "journal photos read own" on storage.objects;
create policy "journal photos read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos upload own" on storage.objects;
create policy "journal photos upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos update own" on storage.objects;
create policy "journal photos update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal photos delete own" on storage.objects;
create policy "journal photos delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Confirm: expect the bucket row with public = false, then four policies.
select id, public from storage.buckets where id = 'journal-photos';

select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'journal photos%'
order by cmd;
