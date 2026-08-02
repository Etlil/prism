-- Gives every mood a place on a 1–5 scale, so days can be plotted on a chart.
--
-- Why this is needed: moods are user-defined rows. `sort_order` is the order
-- they appear in the picker, NOT how good or bad they are — the defaults run
-- content, creative, joyful, angry, anxious, sad, which is meaningless as a
-- vertical axis. Without a score there is no honest way to draw a mood line.
--
--   5 = great · 4 = good · 3 = okay · 2 = low · 1 = rough
--
-- 3 is the default for anything new, so a mood someone invents sits in the
-- middle until they place it themselves in Settings.
--
-- Safe to re-run.

alter table public.moods
  add column if not exists score smallint not null default 3;

-- Keeps bad data out of the chart's axis.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'moods_score_range'
  ) then
    alter table public.moods
      add constraint moods_score_range check (score between 1 and 5);
  end if;
end $$;

-- Place the six seeded defaults. Matched on lower(label) so renamed moods are
-- left alone, and only applied where the score is still the untouched default.
update public.moods m
set score = v.score
from (values
  ('joyful',   5),
  ('content',  4),
  ('creative', 4),
  ('anxious',  2),
  ('angry',    2),
  ('sad',      1)
) as v(label, score)
where lower(m.label) = v.label
  and m.score = 3;

-- Confirm: the six defaults should no longer all read 3.
select label, emoji, score, sort_order
from public.moods
order by score desc, sort_order;
