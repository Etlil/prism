-- End-to-end encryption keys for journal entries.
--
-- What is stored here is NOT the key. It is the key *wrapped* (encrypted) two
-- separate times — once by a key derived from the passphrase, once by a key
-- derived from the recovery code. Neither the passphrase nor the recovery code
-- ever leaves the browser, so these rows are useless on their own: without one
-- of those two secrets, the wrapped blobs cannot be opened.
--
-- That is the whole point. Anyone reading this table in the Supabase dashboard
-- — including the project owner — sees only ciphertext.
--
-- Why two wraps of the SAME key instead of encrypting the journal twice: it
-- means the recovery code can open the journal without the passphrase, and
-- changing the passphrase only rewraps this one small blob rather than
-- re-encrypting every entry.
--
-- Safe to re-run.

create table if not exists public.journal_keys (
  user_id           uuid primary key references auth.users (id) on delete cascade,

  -- PBKDF2 salt + AES-GCM iv + the wrapped data key, all base64.
  passphrase_salt   text not null,
  passphrase_iv     text not null,
  passphrase_key    text not null,

  recovery_salt     text not null,
  recovery_iv       text not null,
  recovery_key      text not null,

  -- Bumped if the key derivation ever changes, so old rows stay readable.
  version           int  not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.journal_keys enable row level security;

drop policy if exists "journal_keys select own" on public.journal_keys;
create policy "journal_keys select own"
  on public.journal_keys for select
  using (auth.uid() = user_id);

drop policy if exists "journal_keys insert own" on public.journal_keys;
create policy "journal_keys insert own"
  on public.journal_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "journal_keys update own" on public.journal_keys;
create policy "journal_keys update own"
  on public.journal_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "journal_keys delete own" on public.journal_keys;
create policy "journal_keys delete own"
  on public.journal_keys for delete
  using (auth.uid() = user_id);

-- Confirm: expect four rows — SELECT, INSERT, UPDATE, DELETE.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'journal_keys'
order by cmd;
