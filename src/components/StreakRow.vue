<script setup>
import { computed } from 'vue'
import { useStreak } from '@/composables/useStreak'

const { currentStreak, weekStrip, longestStreak } = useStreak()

// A connector is only green when BOTH days it joins are logged. Colouring it
// from `day.logged` alone drew a green line out of a day that was never
// recorded, which read as a chain that isn't there.
const days = computed(() =>
  weekStrip.value.map((day, i) => ({
    ...day,
    linkFilled: i > 0 && day.logged && weekStrip.value[i - 1].logged,
  })),
)
</script>

<template>
  <section class="streak-card">
    <h2 class="title">Days in a Row</h2>

    <div class="track">
      <ol class="days">
        <li v-for="day in days" :key="day.iso" class="day">
          <span class="link" :class="{ filled: day.linkFilled }" aria-hidden="true"></span>

          <span
            class="bead"
            :class="{
              done: day.logged,
              today: day.isToday && !day.logged,
              future: day.isFuture,
            }"
          >
            <svg v-if="day.logged" class="tick" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4.5 4.5L19 8" />
            </svg>
            <template v-else-if="day.isToday">?</template>
          </span>

          <span class="label" :class="{ strong: day.isToday }">
            {{ day.isToday ? 'Today' : day.label }}
          </span>
        </li>
      </ol>

      <!-- At the end of the track rather than up in the header, so the number
           reads as the result of the row it sits beside. -->
      <span class="count">{{ currentStreak }}</span>
    </div>

    <p class="longest"><span class="trophy">🏆</span> Longest chain: {{ longestStreak }}</p>
  </section>
</template>

<style scoped>
/* One knob for the circle size — the connector's vertical position is derived
   from it, so they can't drift apart. */
.streak-card {
  --bead: 34px;

  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.1rem 1.2rem 1rem;
  margin-bottom: 1.25rem;
}

.title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.track {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}

.days {
  flex: 1;
  min-width: 0;
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

/* Runs from the centre of the previous circle to the centre of this one.
   Sits behind the beads, which have their own stacking context. */
.link {
  position: absolute;
  top: calc(var(--bead) / 2 - 1.5px);
  right: 50%;
  width: 100%;
  height: 3px;
  background: var(--color-border);
}

.day:first-child .link {
  display: none;
}

.link.filled {
  background: #3ec46d;
}

.bead {
  position: relative;
  width: var(--bead);
  height: var(--bead);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-soft);
  border: 2px solid var(--color-border);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-soft);
}

.bead.done {
  background: #3ec46d;
  border-color: #3ec46d;
  color: white;
}

/* Today, still unlogged — the open question in the reference. */
.bead.today {
  border-color: #3ec46d;
  border-style: solid;
  color: #3ec46d;
  background: var(--color-bg-card);
}

.bead.future {
  border-style: dashed;
  background: transparent;
}

/* Drawn rather than a ✓ character, which sits off-centre in most fonts and
   changes shape with the theme's font. */
.tick {
  width: 60%;
  height: 60%;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.label {
  font-size: 0.68rem;
  color: var(--color-text-soft);
  white-space: nowrap;
}

.label.strong {
  color: var(--color-text);
  font-weight: 600;
}

/* Height-matched to a bead so it lines up with the row, not the labels. */
.count {
  flex-shrink: 0;
  min-width: 3.2rem;
  height: var(--bead);
  padding: 0 0.7rem;
  border: 2px solid var(--color-border);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.longest {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.trophy {
  margin-right: 0.2rem;
}

@media (max-width: 480px) {
  .streak-card {
    --bead: 28px;
    padding: 0.9rem 0.9rem 0.8rem;
  }

  .track {
    gap: 0.5rem;
  }

  .count {
    min-width: 2.6rem;
    padding: 0 0.5rem;
    font-size: 0.95rem;
  }

  .label {
    font-size: 0.6rem;
  }
}
</style>
