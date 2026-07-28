<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { year } from '@/data/fakeYear'

const { auth } = useAuth()

const loggedCount = computed(() => year.filter((d) => d.mood).length)

// Longest run of consecutive logged days, scanning oldest to newest.
const longestStreak = computed(() => {
  let longest = 0
  let current = 0
  for (const day of year) {
    if (day.mood) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
})
</script>

<template>
  <div class="about">
    <header class="page-header">
      <h1>About Me</h1>
    </header>

    <section class="profile-card">
      <div class="avatar">{{ auth.currentUser?.username.charAt(0).toUpperCase() || '?' }}</div>
      <div>
        <h2>{{ auth.currentUser?.username }}</h2>
        <p class="joined">{{ auth.currentUser?.email }}</p>
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
      <h2>About Prism</h2>
      <p>
        Prism is a mood-tracking app built around a Year in Pixels grid — one colored cell per
        day. This build is still early: the grid, photo journal, and theming all work, but
        everything is running on fake data until Supabase is wired up.
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
  color: white;
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
</style>
