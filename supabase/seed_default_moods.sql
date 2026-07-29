-- Gives every existing user the six default moods, skipping anyone who
-- already has some. Safe to run more than once.

insert into public.moods (user_id, label, emoji, color_hex, sort_order)
select u.id, m.label, m.emoji, m.color_hex, m.sort_order
from auth.users u
cross join (
  values
    ('Content',  '😌', '#b19cd9', 0),
    ('Creative', '🎨', '#f2a6c9', 1),
    ('Joyful',   '😄', '#f5d547', 2),
    ('Angry',    '😠', '#e2574c', 3),
    ('Anxious',  '😰', '#6fcf97', 4),
    ('Sad',      '😢', '#2e3a87', 5)
) as m(label, emoji, color_hex, sort_order)
where not exists (
  select 1 from public.moods where user_id = u.id
);

-- Check the result.
select u.email, m.label, m.emoji, m.color_hex, m.sort_order
from auth.users u
join public.moods m on m.user_id = u.id
order by u.email, m.sort_order;
