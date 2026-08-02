<script setup>
import { useStreak } from '@/composables/useStreak'

const { currentStreak, weekStrip, perfectWeek, daysLoggedThisWeek, dismissCelebration } =
  useStreak()
</script>

<template>
  <div class="overlay" @click.self="dismissCelebration">
    <div class="card" role="dialog" aria-modal="true" aria-labelledby="streak-title">
      <!-- The flame is drawn rather than an image so it takes the accent
           colour and stays sharp at any size. -->
      <div class="flame">
        <svg viewBox="0 0 100 120" aria-hidden="true">
          <path
            class="flame-outer"
            d="M50 0C50 0 20 30 20 62a30 30 0 0 0 60 0C80 40 62 26 50 0Z"
          />
          <path class="flame-inner" d="M50 42c0 0-14 16-14 30a14 14 0 0 0 28 0c0-13-14-30-14-30Z" />
        </svg>
        <span id="streak-title" class="count">{{ currentStreak }}</span>
      </div>

      <p class="headline">day streak!</p>

      <div class="week">
        <div class="week-labels">
          <span v-for="day in weekStrip" :key="day.iso">{{ day.label }}</span>
        </div>
        <div class="week-marks">
          <span
            v-for="day in weekStrip"
            :key="day.iso"
            class="mark"
            :class="{ done: day.logged, today: day.isToday, future: day.isFuture }"
          >
            <template v-if="day.logged">✓</template>
          </span>
        </div>
      </div>

      <p class="note">
        <template v-if="perfectWeek">A perfect week. Every single day. ✨</template>
        <template v-else-if="daysLoggedThisWeek >= 4">
          You're <strong>{{ 7 - daysLoggedThisWeek }}</strong> away from a perfect week!
        </template>
        <template v-else-if="currentStreak === 1">
          That's day one. Come back tomorrow to keep it.
        </template>
        <template v-else>
          {{ daysLoggedThisWeek }} of 7 days this week. Keep going!
        </template>
      </p>

      <button type="button" class="continue" @click="dismissCelebration">CONTINUE</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(1rem + var(--safe-top)) 1rem calc(1rem + var(--safe-bottom));
  background: rgba(0, 0, 0, 0.5);
  animation: fade-in 0.2s ease;
}

.card {
  width: min(320px, 100%);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 1.8rem 1.4rem 1.4rem;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  animation: pop-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

.flame {
  position: relative;
  width: 120px;
  margin: 0 auto 0.3rem;
}

.flame svg {
  width: 100%;
  display: block;
}

.flame-outer {
  fill: #f5a524;
}

.flame-inner {
  fill: #f7d154;
}

/* Sits over the flame's belly, like the reference. */
.count {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 28%;
  font-size: 2.6rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  font-variant-numeric: tabular-nums;
}

.headline {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f5a524;
  margin-bottom: 1.1rem;
}

.week {
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.6rem;
}

.week-labels,
.week-marks {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.25rem;
}

.week-labels span {
  font-size: 0.7rem;
  color: var(--color-text-soft);
}

.week-marks {
  margin-top: 0.4rem;
}

.mark {
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
}

.mark.done {
  background: #f5a524;
}

.mark.future {
  background: transparent;
  border: 1px dashed var(--color-border);
}

.mark.today {
  box-shadow: 0 0 0 2px var(--color-bg-card), 0 0 0 4px #f5a524;
}

.note {
  margin: 0.9rem 0 1.1rem;
  font-size: 0.82rem;
  color: var(--color-text-soft);
  line-height: 1.5;
}

.note strong {
  color: var(--accent);
  font-weight: 700;
}

.continue {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.continue:hover {
  filter: brightness(1.05);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes pop-in {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
}

/* Respects the OS "reduce motion" setting. */
@media (prefers-reduced-motion: reduce) {
  .overlay,
  .card {
    animation: none;
  }
}
</style>
