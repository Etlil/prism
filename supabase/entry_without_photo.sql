-- Lets a card exist without a photo.
--
-- A card started life as "a photo with a journal on the back". It is really an
-- entry: something you write, that may or may not have a picture attached.
-- Some days there is nothing to photograph and plenty to say.
--
-- The table keeps the name `photos` on purpose — renaming it would mean
-- rewriting every policy, index and foreign key for a word. What changes is
-- that storage_path is now optional, and null means "no picture yet".
--
-- Safe to re-run.

alter table public.photos
  alter column storage_path drop not null;

-- Confirm: is_nullable should read YES.
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'photos'
  and column_name = 'storage_path';
