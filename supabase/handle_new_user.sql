-- Runs when a new auth.users row is created (i.e. on signup) and creates that
-- user's profile row plus their six default moods.
--
-- This has to be a trigger rather than client-side inserts: the project
-- requires email confirmation, so signUp() returns no session, which means the
-- browser has no auth.uid() and RLS would reject both inserts.
--
-- security definer lets the function bypass RLS (it runs as the function
-- owner, not the caller). set search_path = '' is the matching safety measure
-- for that elevated privilege, so table names must be fully qualified below.
--
-- Safe to re-run: replaces the function and recreates the trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, pixel_shape, week_start)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'square',
    'monday'
  );

  -- color_hex must be lowercase 6-digit hex to satisfy the table's CHECK
  -- constraint (^#[0-9a-f]{6}$).
  insert into public.moods (user_id, label, emoji, color_hex, sort_order)
  values
    (new.id, 'Content',  '😌', '#b19cd9', 0),
    (new.id, 'Creative', '🎨', '#f2a6c9', 1),
    (new.id, 'Joyful',   '😄', '#f5d547', 2),
    (new.id, 'Angry',    '😠', '#e2574c', 3),
    (new.id, 'Anxious',  '😰', '#6fcf97', 4),
    (new.id, 'Sad',      '😢', '#2e3a87', 5);

  return new; 
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
