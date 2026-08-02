<script setup>
import { computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMoods } from '@/composables/useMoods'
import { useEntries } from '@/composables/useEntries'
import { useStreak } from '@/composables/useStreak'
import { buildYear, currentYear } from '@/lib/calendar'

const { auth, displayName } = useAuth()
const { loadMoods } = useMoods()
const { loadYear, isLogged } = useEntries()
// Same calculation the dashboard and the streak celebration use.
const { longestStreak } = useStreak()

const year = buildYear(currentYear)

onMounted(() => Promise.all([loadMoods(), loadYear(currentYear)]))

// 👇 Put her name here. It's a constant rather than typed into the template so
// there's one obvious place to change it.
const DEDICATED_TO = 'Daffy'

// The tech list is data, not markup, so adding a tool later means adding a line
// here instead of copy-pasting a block of HTML. Same reason the moods are rows
// and not hardcoded — v-for over a list beats repeating yourself.
const stack = [
  { name: 'Vue 3', role: 'The interface. Every screen is a component that redraws itself when its data changes.' },
  { name: 'Vite', role: 'Runs the dev server and bundles the app for release.' },
  { name: 'Vue Router', role: 'Moves between Dashboard, Journal, Settings and About without reloading the page.' },
  { name: 'Supabase', role: 'The backend — accounts, the database your entries live in, and photo storage.' },
  { name: 'Plain CSS', role: 'No frameworks. Themes are CSS variables swapped at the root, which is why colour and font changes are instant.' },
  { name: 'Capacitor', role: 'Planned last step: wraps the finished web app as a real Android app(IOS developers fee is expensive HAHAHHA).' },
]

const loggedCount = computed(() => year.filter((day) => isLogged(day.isoDate)).length)
</script>

<template>
  <div class="about">
    <header class="page-header">
      <h1>About</h1>
    </header>

    <section class="profile-card">
      <div class="avatar">{{ displayName.charAt(0).toUpperCase() || '?' }}</div>
      <div>
        <h2>{{ displayName }}</h2>
        <p class="joined">{{ auth.user?.email }}</p>
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <span class="value">{{ loggedCount }}</span>
        <span class="label">days logged</span>
      </div>
      <div class="stat">
        <span class="value">{{ longestStreak }}</span>
        <span class="label">longest streak</span>
      </div>
    </section>

    <section class="bio-card">
      <h2>What Prism is</h2>
      <p>
        A year of your life on one screen. Every day is a single coloured square, and the colour is
        however that day felt.
      </p>
      <p>
        One square on its own says nothing. Fill in a few months and something shows up that a
        diary can't give you: the rough week you'd stopped thinking about, the stretch where things
        were quietly good, the shape of a year you were too close to see while you were living it.
      </p>
      <p>
        Logging a day takes seconds. Write about it or add photos when you want to, and skip it
        when you don't. The empty squares say something too.
      </p>
    </section>

    <section class="bio-card">
      <h2>How it works</h2>
      <ul class="how">
        <li>
          <strong>One cell per day.</strong> The grid is twelve columns, one per month, so a whole
          year fits on one screen without scrolling sideways.
        </li>
        <li>
          <strong>A day can hold more than one feeling.</strong> Days are rarely just one thing, so
          a cell is drawn as a pie. Tag three photos joyful, joyful and sad, and the square comes
          out two-thirds joyful. It's a CSS gradient doing the drawing — no chart library.
        </li>
        <li>
          <strong>Photos carry the mood.</strong> In the Photo Journal you can attach up to five
          photos to a day, give each one a caption, and tag each with how that moment felt. Those
          tags are what colour the day's pixel.
        </li>
        <li>
          <strong>The moods are yours.</strong> Six come with the app, but they're just rows in a
          database — rename them, recolour them, add your own, or archive ones you don't use.
          Archived moods stay on old entries so your past pixels keep their colours.
        </li>
        <li>
          <strong>It should look like yours too.</strong> Six themes — notebook, space, girly,
          gothic, forest, sunset — each in light or dark, plus six fonts and three text sizes.
          Every choice is remembered on your device.
        </li>
        <li>
          <strong>Only you can see any of it.</strong> Every row in the database is stamped with
          your account, and the database itself refuses to hand a row to anyone else — not just the
          app hiding it, the database refusing it.
        </li>
      </ul>
    </section>

    <section class="bio-card">
      <h2>What it's built with</h2>
      <p class="lead">
        Prism is a personal project, and also how I'm learning Vue — most of it was written while
        figuring out the thing it was written in.
      </p>
      <ul class="stack">
        <li v-for="tool in stack" :key="tool.name">
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-role">{{ tool.role }}</span>
        </li>
      </ul>
    </section>

    <section class="bio-card thanks">
      <h2>Thank you, {{ DEDICATED_TO }}</h2>
      <p>
        I dedicated this project to you because you help me see my potential, you make me want to be better, and you make me want to keep going.(Even your motivation is kinda weird hehe), I'm so grateful for you and I hope you like this project.
      </p>
      <p>
        Thank you! 
      </p>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 560px;
}

.page-header {
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.6rem;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.3rem;
  margin-bottom: 1.25rem;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-card h2 {
  font-size: 1.1rem;
}

.joined {
  color: var(--color-text-soft);
  font-size: 0.82rem;
  margin-top: 0.2rem;
}

.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stat {
  flex: 1;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat .value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--accent);
}

.stat .label {
  font-size: 0.78rem;
  color: var(--color-text-soft);
  margin-top: 0.2rem;
}

.bio-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.3rem;
  margin-bottom: 1.25rem;
}

.bio-card h2 {
  font-size: 1rem;
  margin-bottom: 0.6rem;
}

.bio-card p {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  line-height: 1.6;
}

.bio-card p + p {
  margin-top: 0.7rem;
}

.lead {
  margin-bottom: 1rem;
}

/* base.css resets margin but not padding, so a <ul> keeps its 40px indent
   unless it's cleared. Same trap as the sidebar and the dashboard legend. */
.how,
.stack {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.how li {
  color: var(--color-text-soft);
  font-size: 0.88rem;
  line-height: 1.6;
  padding-left: 0.9rem;
  border-left: 2px solid var(--color-border);
}

.how strong {
  color: var(--color-text);
  font-weight: 600;
}

.stack li {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tool-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--accent);
}

.tool-role {
  font-size: 0.83rem;
  line-height: 1.55;
  color: var(--color-text-soft);
}

.thanks {
  border-color: var(--accent);
}

.thanks h2 {
  color: var(--accent);
}
</style>
