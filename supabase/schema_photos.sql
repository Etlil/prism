-- Phase 4 schema: the UI outgrew the original `entries` table.
--
-- What changed and why:
--
--   * A day can hold up to 5 photos, each with its own caption and mood, so
--     photos become their own table instead of `entries.photo_url`.
--   * `entries.mood_id` is KEPT and given a clear meaning: the mood for the day
--     itself, recorded without a photo. A day's pixel is drawn from the day
--     mood plus every photo mood, so a day can be logged either way.
--   * `journal_title` is added — the journal card has an editable title with
--     nowhere to store it.
--
--   * photos.storage_path holds the path inside the bucket, NOT a URL. The
--     bucket is private, so the app mints a short-lived signed URL when it
--     displays an image; a stored URL would expire and go stale.
--
-- user_id is denormalised onto photos so every RLS policy stays the same shape
-- (auth.uid() = user_id) instead of joining back to entries on every check.
--
-- Safe to re-run.

-- ── entries ────────────────────────────────────────────────────────────────
alter table public.entries add column if not exists journal_title text;

-- One entry per day per user. The app upserts on this, so it must exist.
create unique index if not exists entries_user_date_idx
  on public.entries (user_id, entry_date);

-- ── photos ─────────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.entries (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  caption      text,
  -- on delete set null, not cascade: deleting a mood must never delete the
  -- photo it was tagged with.
  mood_id      uuid references public.moods (id) on delete set null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists photos_entry_idx on public.photos (entry_id);
create index if not exists photos_user_idx on public.photos (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- RLS on with no policy means deny-all: reads come back empty and writes fail.
alter table public.photos enable row level security;

drop policy if exists "photos select own" on public.photos;
create policy "photos select own"
  on public.photos for select
  using (auth.uid() = user_id);

drop policy if exists "photos insert own" on public.photos;
create policy "photos insert own"
  on public.photos for insert
  with check (auth.uid() = user_id);

drop policy if exists "photos update own" on public.photos;
create policy "photos update own"
  on public.photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "photos delete own" on public.photos;
create policy "photos delete own"
  on public.photos for delete
  using (auth.uid() = user_id);

-- Confirm: expect four rows — SELECT, INSERT, UPDATE, DELETE.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'photos'
order by cmd;
