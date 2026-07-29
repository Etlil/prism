-- Shows, for every user: the username the app sent, and what ended up in profiles.
select
  u.email,
  u.raw_user_meta_data->>'username' as username_sent_by_app,
  p.display_name                    as display_name_in_profiles,
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
