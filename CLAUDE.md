# Prism

A mood-tracking app built around a "Year in Pixels" grid. Each day of the year is
one colored cell. Tap a cell to record how the day felt, write a journal entry,
and attach one photo.

## Who is building this

The owner is new to Vue and learning it through this project. Explain concepts
when introducing them rather than assuming familiarity. Prefer showing the
pattern and letting them write the code over generating large files unprompted.
When something has an obvious shortcut and a more instructive path, mention both
and say which you'd pick.

## Stack

- **Vue 3**, Composition API with `<script setup>` only. Never use the Options API.
- **Vite** for dev server and build.
- **Vue Router** for navigation.
- **Plain CSS with CSS custom properties.** No Tailwind, no CSS-in-JS.
- **JavaScript, not TypeScript.** May be added later; don't write code that blocks it.
- **No state management library yet.** Use Vue reactivity and composables.
  Introduce Pinia only if state genuinely becomes tangled, and explain why first.
- **Supabase** for database, auth, and file storage.
- **Capacitor** to wrap as a native iOS/Android app. This is the final phase.
  Do not add Capacitor-specific code before then.

## Data model

```
profiles
  id            uuid, references auth.users.id
  display_name  text
  pixel_shape   text, default 'square'
  week_start    text
  created_at    timestamptz

moods
  id            uuid
  user_id       uuid
  label         text
  color_hex     text
  sort_order    int

entries
  id            uuid
  user_id       uuid
  entry_date    date
  mood_id       uuid, references moods.id
  note          text          -- short, one line
  journal_text  text          -- long form
  photo_url     text          -- Supabase Storage URL
  UNIQUE (user_id, entry_date)
```

Design decisions baked in:

- Moods are rows, not a Postgres enum, so users can rename and recolor them.
  Seed six defaults on signup: content, creative, joyful, angry, anxious, sad.
- `UNIQUE (user_id, entry_date)` enables upsert instead of check-then-write.
- Row Level Security on every table, policy `auth.uid() = user_id`. This is the
  entire backend security model. Get it right early.
- Photos live in a Supabase Storage bucket, one folder per user, with matching
  RLS. Only the URL is stored in `entries`.

## Pixel shapes

Cell shape is a user setting applying to the whole grid: square, rounded square,
circle, hexagon, star, and more later.

Implement as a single `MoodCell` component that takes a shape prop and applies a
CSS class. Squares and circles are `border-radius`. Hexagons and stars are
`clip-path`. Adding a new shape should mean adding one CSS class and nothing
else. Do not create a separate component per shape.

## Build phases

Ordered for learning, not for how you'd do it professionally. Auth comes late on
purpose because it's async plumbing and a poor first encounter with a framework.

0. **Setup** — Vue scaffold, dev server running. *(done)*
1. **Grid, faked** — Hardcoded array of 365 moods, render the pixel grid. No
   backend, no async. Teaches components, props, `v-for`, reactivity. This phase
   decides whether the app feels good.
2. **Interactivity, faked** — Tap a cell, bottom sheet opens with mood swatches,
   note field, journal field, photo button. All in memory. Teaches events and
   state.
3. **Supabase project** — Tables, RLS policies, storage bucket, seed trigger.
   Done in the dashboard, no Vue involved.
4. **Wire it up** — Replace fake data with real queries. Teaches async, loading
   states, error handling, now that the working UI is already known.
5. **Auth** — Email magic link. Short phase by this point.
6. **Legend editor** — Custom mood names and colors, shape picker.
7. **Stats** — Mood counts, streaks, month comparisons.
8. **Polish** — Image compression before upload, offline cache, optimistic
   updates so taps feel instant.
9. **Capacitor** — Native wrap, icons, splash, store builds.

Phases 0 through 5 produce an app worth using daily. Everything after is upgrade.

## Known hard part

The grid on a phone. Twelve month columns on a roughly 380px screen leaves about
28px per cell before labels. Tappable but cramped, and small cells make the color
pattern hard to read, which is the entire emotional point of the app.

Two approaches to test: horizontal scroll with a sticky day-number column, or a
month-at-a-time view with the full year available as a zoomed-out poster. Build
the poster view first; it's the payoff.

## Environment

Windows 11, Node 22.13.0, PowerShell.

## Open questions

- Should the grid show photo thumbnails inside cells, or only in the day sheet?
- Is long-form journaling per day, or should there also be a monthly reflection
  entry like the original bullet-journal reference?
