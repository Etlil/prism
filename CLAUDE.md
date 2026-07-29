# Prism

A mood-tracking app built around a "Year in Pixels" grid. Each day of the year is
one colored cell. Tap a cell to record how the day felt, write a journal entry,
and attach photos.

## Who is building this

The owner is new to Vue and learning it through this project. Explain concepts
when introducing them rather than assuming familiarity. Prefer showing the
pattern and letting them write the code over generating large files unprompted.
When something has an obvious shortcut and a more instructive path, mention both
and say which you'd pick.

**Keep explanations short and in plain words.** Skip jargon and long recaps. Say
what changed and what to do next; explain a term only when it's needed to act.

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

Installed: `vue`, `vue-router`, `@supabase/supabase-js`, `vite`.

---

# Current state (as of 2026-07-29)

**Auth is real. Everything else is still fake, in-memory data.** Refreshing the
page loses any photo, caption, mood, or journal edit made in the UI.

## What works

| Area | State |
|---|---|
| Signup / login / logout | **Real Supabase Auth**, password-based |
| Session restore on reload | Works (`authReady` promise gates the router) |
| Route guards | Works — `meta.requiresAuth` on all app routes |
| Profiles table read | Works — nav greeting reads `profiles.display_name` |
| Dashboard grid | Fake data, pie-chart pixels, streak, today ring |
| Photo journal | Fake data — date strip, 5 photos/day, per-photo mood |
| Settings | Theme, accent, font, font size — saved to `localStorage` |
| About | Fake stats |
| Moods / entries tables | **Not read or written by the app yet** |
| Photo upload to Storage | **Not built** — uploads are in-memory blob URLs |

## File map

```
src/
  lib/supabase.js        Supabase client (reads VITE_SUPABASE_URL / _KEY)
  lib/dates.js           Local-date helpers — see the timezone note below
  composables/useAuth.js Session state, login/signup/logout, profile load
  composables/useTheme.js Theme, accent, font, font size → CSS vars + localStorage
  data/moods.js          6 hardcoded moods (id, label, emoji, colorHex)
  data/fakeYear.js       365 fake days, ~1 in 6 blank so streaks mean something
  data/fakeEntries.js    Fake journal entries keyed by date + all mutators
  components/MoodCell.vue    One pixel — conic-gradient pie, shape prop, today ring
  components/DateStrip.vue   Month/year picker + horizontal day strip
  components/PolaroidPhoto.vue Flip card: photo + mood picker / journal + editor
  components/AppNav.vue      Sidebar, hamburger drawer under 768px
  views/                 Dashboard, PhotoJournal, Settings, About, Login, Signup
supabase/
  handle_new_user.sql       Signup trigger — profile + seed 6 moods
  check_and_backfill.sql    Verify trigger + fix users created before it
  debug_usernames.sql       Diagnostic: username in auth vs profiles
```

## Supabase state

- Project exists, keys in `.env.local` (gitignored). **`VITE_SUPABASE_URL` must
  be the project URL** (`https://<ref>.supabase.co`) — pasting a publishable key
  there crashes the app to a blank page at startup.
- `profiles`, `moods`, `entries` tables exist. **RLS verified enabled and
  rejecting anonymous writes on all three.**
- Email confirmation is **on** (`mailer_autoconfirm: false`), so `signUp()`
  returns **no session**. The browser therefore has no `auth.uid()` at signup and
  cannot insert the profile row — this is why profile creation must be a trigger.
- The free tier rate-limits confirmation emails (a few per hour). Hitting
  `over_email_send_rate_limit` during testing is the email quota, not a bug.
- **`supabase/handle_new_user.sql` must be run in the SQL Editor.** Without it,
  signups create no profile row. Verify with `check_and_backfill.sql`.

---

# Data model

## As designed

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

## The UI has outgrown this schema — resolve before Phase 4

The built UI records things `entries` has nowhere to store. **Decide this before
wiring real queries**, because it changes the table design:

| UI does this | Schema says | Gap |
|---|---|---|
| Up to **5 photos per day** | `photo_url` — one per entry | Needs a `photos` table |
| **A mood per photo** | `mood_id` — one per entry | Day mood is now derived, not stored |
| A **caption per photo** | no column | Belongs on the new `photos` table |
| An editable **journal title** | no column | Add `journal_title text` to `entries` |

Likely shape:

```
photos
  id          uuid
  entry_id    uuid, references entries.id
  user_id     uuid          -- denormalised so RLS stays auth.uid() = user_id
  url         text
  caption     text
  mood_id     uuid, references moods.id
  sort_order  int
```

With that, `entries.mood_id` becomes redundant — a day's pixel is computed from
its photos' moods. Keep or drop it deliberately; don't leave it half-used.

---

# Pixel shapes

Cell shape is a user setting applying to the whole grid: square, rounded square,
circle, hexagon, star, and more later.

Implement as a single `MoodCell` component that takes a shape prop and applies a
CSS class. Squares and circles are `border-radius`. Hexagons and stars are
`clip-path`. Adding a new shape should mean adding one CSS class and nothing
else. Do not create a separate component per shape.

**Built**, all five shapes. But nothing sets the prop yet — every cell renders as
`square`. `profiles.pixel_shape` is unused; the Settings shape picker is Phase 6.

## Pixels are pie charts now

A day's pixel is split into equal slices, one per mood recorded that day, drawn
with a CSS `conic-gradient` — no chart library. Three photos tagged
joyful/joyful/sad gives a pixel that's two-thirds joyful.

This replaces the original one-mood-per-day design. It's the main reason the
schema above needs revisiting.

---

# Build phases

Ordered for learning, not for how you'd do it professionally.

0. **Setup** — Vue scaffold, dev server running. ✅ **done**
1. **Grid, faked** — render the pixel grid from fake data. ✅ **done**
2. **Interactivity, faked** — mood picking, journal editing, photo upload, all in
   memory. ✅ **done** (as the Photo Journal page, not a bottom sheet)
3. **Supabase project** — tables, RLS, storage bucket, seed trigger.
   🟡 **mostly done** — tables + RLS done; **trigger SQL written but must be run**;
   **storage bucket not created**
4. **Wire it up** — replace fake data with real queries. ⬜ **not started.**
   Resolve the schema gap above first.
5. **Auth** — ✅ **done, but with two deliberate changes:**
   - **Built before Phase 4**, not after — the owner asked for login/signup early.
   - **Password auth, not magic link.** The signup/login forms were already built
     with password fields, so they were wired to `signInWithPassword` rather than
     rewritten for a passwordless flow. Switching to magic link later means
     dropping the password field and adding a "check your email" state.
6. **Legend editor** — custom mood names/colors, shape picker. ⬜ not started
7. **Stats** — 🟡 streak is on the dashboard; counts and comparisons not built
8. **Polish** — image compression, offline cache, optimistic updates. ⬜ not started
9. **Capacitor** — native wrap. ⬜ not started

---

# Gotchas already hit

Worth knowing before touching this code again:

- **Never use `toISOString()` for calendar dates.** It converts to UTC first,
  which shifts the date by a day (the owner is UTC+8, so Jan 1 became Dec 31).
  Use `toIsoDate()` in `src/lib/dates.js`, which formats the local date.
- **`base.css` resets `margin` but not `padding`.** A `<ul>` keeps its default
  40px left indent — this silently misaligned both the sidebar links and the
  dashboard legend. Set `padding: 0` on any list.
- **Font size must be set on the root element**, not `body`. The app sizes
  everything in `rem`, which resolves against the root; setting `body` scales
  almost nothing.
- **`minmax(0, 1fr)`, not `1fr`**, for the grid columns. Plain `1fr` won't shrink
  below its content, so the grid overflows instead of fitting the screen.
- **Don't call Supabase from inside `onAuthStateChange`.** The client holds a
  lock during that callback and re-entering it can deadlock. `useAuth.js` defers
  with `setTimeout(..., 0)`.
- **A ring drawn outside a small cell gets clipped** by its neighbours. The
  "today" marker uses an *inset* box-shadow for that reason.

---

# Known hard part

The grid on a phone. Twelve month columns on a roughly 380px screen leaves about
28px per cell before labels. Tappable but cramped, and small cells make the color
pattern hard to read, which is the entire emotional point of the app.

**Current approach:** all 12 months fit any screen width, vertical scroll only.
On a ~380px phone this lands around 25px per cell. The month-at-a-time view is
still the untested alternative if this proves too cramped in daily use.

---

# Environment

Windows 11, Node 22.13.0, PowerShell. Dev server: `npm run dev`.

`.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (anon key —
safe for the browser; never put the `service_role` key here).

# Open questions

- Should the grid show photo thumbnails inside cells, or only in the day sheet?
- Is long-form journaling per day, or should there also be a monthly reflection
  entry like the original bullet-journal reference?
- Photos are capped at 5/day. Is that a product rule worth enforcing in the
  database, or just a UI limit?
- Equal pie slices per photo, or should a mood tagged on 3 of 5 photos weight the
  pixel accordingly? (Currently equal — one slice per photo.)
