-- 1. Is the signup trigger installed? Should return one row: on_auth_user_created
select tgname
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

-- 2. Create a profile for any user missing one.
insert into public.profiles (id, display_name, pixel_shape, week_start)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  'square',
  'monday'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 3. Fill in the name on profiles that exist but have a blank display_name.
update public.profiles p
set display_name = coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id
  and (p.display_name is null or p.display_name = '');

-- 4. Give everyone their six default moods, if they don't have any.
insert into public.moods (user_id, label, color_hex, sort_order)
select u.id, m.label, m.color_hex, m.sort_order
from auth.users u
cross join (
  values
    ('Content',  '#b19cd9', 0),
    ('Creative', '#f2a6c9', 1),
    ('Joyful',   '#f5d547', 2),
    ('Angry',    '#e2574c', 3),
    ('Anxious',  '#6fcf97', 4),
    ('Sad',      '#2e3a87', 5)
) as m(label, color_hex, sort_order)
where not exists (
  select 1 from public.moods where user_id = u.id
);

-- 5. Check the result — display_name should now match username_sent_by_app.
select
  u.email,
  u.raw_user_meta_data->>'username' as username_sent_by_app,
  p.display_name                    as display_name_in_profiles
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
