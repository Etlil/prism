-- Move the journal from the day onto each photo.
--
-- Before this, journal_title/journal_text lived on `entries`, so every photo of
-- a day flipped over to the same text — editing one changed all of them. The
-- journal is now per photo: three photos on a day means three separate notes.
--
-- The day-level entries.journal_title / journal_text columns are left in place
-- but are no longer written by the app. Nothing reads them after the backfill
-- below; they are kept only so this migration is reversible.
--
-- Safe to re-run.

alter table public.photos add column if not exists journal_title text;
alter table public.photos add column if not exists journal_text  text;

-- Backfill: hand each day's existing journal to its FIRST photo, so anything
-- already written survives the move instead of being stranded on a column the
-- app no longer reads.
--
-- Values may be ciphertext if journal encryption is switched on. That is fine —
-- it is the same data key either way, so it decrypts exactly as before.
update public.photos p
set journal_title = e.journal_title,
    journal_text  = e.journal_text
from public.entries e
where p.entry_id = e.id
  and p.journal_title is null
  and p.journal_text is null
  and (e.journal_title is not null or e.journal_text is not null)
  and p.sort_order = (
    select min(p2.sort_order)
    from public.photos p2
    where p2.entry_id = p.entry_id
  );

-- Confirm: the new columns exist.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'photos'
  and column_name in ('journal_title', 'journal_text')
order by column_name;

-- Confirm: how many photos carry a journal after the backfill.
select count(*) as photos_with_journal
from public.photos
where journal_title is not null or journal_text is not null;
