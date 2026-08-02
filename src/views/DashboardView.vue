<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { buildYear, todayIso, currentYear } from '@/lib/calendar'
import { useMoods } from '@/composables/useMoods'
import { useEntries } from '@/composables/useEntries'
import { useStreak } from '@/composables/useStreak'
import { formatMediumDate } from '@/lib/dates'
import MoodCell from '@/components/MoodCell.vue'
import StreakRow from '@/components/StreakRow.vue'
import MoodChart from '@/components/MoodChart.vue'

const { activeMoods, loadMoods } = useMoods()
// setDayMood is the same call the journal page's "How was this day?" makes, and
// useEntries is shared module state — so a mood set here shows up there (and in
// the pixel) with nothing to keep in sync.
const { entries, loadYear, moodColorsFor, setDayMood, clearError } = useEntries()
const { currentStreak } = useStreak()

const year = buildYear(currentYear)

// Resolved once per mount rather than per cell — the template compares it
// against all 372 grid squares.
const today = todayIso()

// Moods must be loaded too — the grid turns mood ids into colours, so without
// them every cell would come back blank even with entries in hand.
onMounted(() => Promise.all([loadMoods(), loadYear(currentYear)]))

const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// Lookup by "month-day" so the 31x12 grid below doesn't re-scan all 365 days
// for every single cell.
const byMonthDay = computed(() => {
  const map = new Map()
  for (const day of year) {
    map.set(`${day.date.getMonth()}-${day.date.getDate()}`, day)
  }
  return map
})

const rows = computed(() =>
  Array.from({ length: 31 }, (_, i) => {
    const dayNum = i + 1
    return {
      dayNum,
      cells: monthLabels.map((_, month) => byMonthDay.value.get(`${month}-${dayNum}`) ?? null),
    }
  }),
)

// A day's colours: its own mood plus one per mood-tagged photo. Reads the live
// mood list, so recolouring a mood in Settings repaints the grid immediately.
function colorsFor(day) {
  if (!day) return []
  return moodColorsFor(day.isoDate)
}

// --- Tap any pixel to log today --------------------------------------------
//
// Every cell opens TODAY, not the day that was tapped. Only today can be
// written to, so opening a past pixel just produced a read-only dead end —
// this turns the whole grid into one big "how was today?" button instead.
// Browsing older days still lives on the journal page, which has a date strip
// built for it.

const sheetOpen = ref(false)

const todayEntry = computed(() => entries.byDate[today] ?? null)
const todayMoodId = computed(() => todayEntry.value?.mood_id ?? null)

// Every mood recorded today — the day mood plus each photo's — as objects
// rather than colours, so the sheet can name them.
const todayMoods = computed(() => {
  if (!todayEntry.value) return []
  const ids = [todayEntry.value.mood_id, ...todayEntry.value.photos.map((p) => p.mood_id)]
  return ids
    .filter(Boolean)
    .map((id) => activeMoods.value.find((m) => m.id === id))
    .filter(Boolean)
})

async function pickMood(moodId) {
  await setDayMood(today, moodId)
}

// Bound to the window because the sheet is a plain div, which can't receive key
// events unless it's focusable.
function onKeydown(event) {
  if (event.key === 'Escape') sheetOpen.value = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function labelFor(day) {
  if (!day) return ''

  const count = colorsFor(day).length
  if (!count) return day.isoDate
  return `${day.isoDate} · ${count} mood${count > 1 ? 's' : ''}`
}

// Streak now comes from useStreak, so this number, the one in the celebration
// and the count on the About page are all the same calculation.
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <div>
        <h1>Year in Pixels</h1>
        <p class="subtitle">
          <span v-if="entries.loading">Loading your year…</span>
          <span v-else-if="currentStreak">🔥 {{ currentStreak }} day streak</span>
          <span v-else>No streak yet — log today to start one</span>
        </p>
      </div>
      <ul class="legend">
        <li v-for="mood in activeMoods" :key="mood.id">
          <span class="swatch" :style="{ background: mood.color_hex }"></span>
          {{ mood.label }}
        </li>
      </ul>
    </header>

    <p v-if="entries.error" class="banner error">
      {{ entries.error }}
      <button type="button" class="banner-close" @click="clearError">×</button>
    </p>

    <StreakRow />

    <div class="grid-scroller">
      <div class="pixel-grid">
        <div class="month-row">
          <div class="day-label"></div>
          <div v-for="m in monthLabels" :key="m" class="month-label">{{ m }}</div>
        </div>
        <div v-for="row in rows" :key="row.dayNum" class="pixel-row">
          <div class="day-label">{{ row.dayNum }}</div>
          <MoodCell
            v-for="(cell, i) in row.cells"
            :key="i"
            :colors="colorsFor(cell)"
            :is-today="cell?.isoDate === today"
            :label="labelFor(cell)"
            :disabled="!cell"
            @click="sheetOpen = true"
          />
        </div>
      </div>
    </div>

    <MoodChart />

    <!-- Tapping any pixel opens this, always for today. The mood picker writes
         entries.mood_id — the same field the journal page's "How was this
         day?" sets, so the two stay in step on their own. -->
    <div v-if="sheetOpen" class="overlay" @click.self="sheetOpen = false">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="day-sheet-title">
        <header class="sheet-head">
          <div>
            <h2 id="day-sheet-title">How was today?</h2>
            <p class="sheet-date">{{ formatMediumDate(today) }}</p>
          </div>
          <button type="button" class="close" aria-label="Close" @click="sheetOpen = false">
            ×
          </button>
        </header>

        <div class="picker">
          <button
            v-for="mood in activeMoods"
            :key="mood.id"
            type="button"
            class="mood-btn"
            :class="{ active: todayMoodId === mood.id }"
            :title="mood.label"
            :disabled="entries.saving"
            :style="todayMoodId === mood.id ? { borderColor: mood.color_hex } : null"
            @click="pickMood(mood.id)"
          >
            {{ mood.emoji }}
          </button>
        </div>

        <p class="sheet-note">Tap the same mood again to clear it.</p>

        <!-- Photo moods are part of the pixel too, so the sheet has to explain
             the slices that aren't the day mood. -->
        <div v-if="todayMoods.length" class="recorded">
          <span class="recorded-label">In today's pixel</span>
          <ul class="chips">
            <li v-for="(mood, i) in todayMoods" :key="i" class="chip">
              <span class="dot" :style="{ background: mood.color_hex }"></span>
              {{ mood.emoji }} {{ mood.label }}
            </li>
          </ul>
        </div>

        <RouterLink class="journal-link" :to="{ name: 'journal' }" @click="sheetOpen = false">
          Add photos and write about today →
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 900px;
}

.page-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.6rem;
}

.subtitle {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.legend {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.1rem;
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  margin-bottom: 1rem;
  background: rgba(226, 87, 76, 0.12);
  border: 1px solid rgba(226, 87, 76, 0.4);
  color: #c0392b;
}

.banner-close {
  border: none;
  background: none;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.grid-scroller {
  padding-bottom: 0.5rem;
}

.pixel-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* minmax(0, 1fr) rather than 1fr so the cells are allowed to shrink below
   their default size — that's what keeps all 12 months on screen instead of
   overflowing sideways. */
.month-row,
.pixel-row {
  display: grid;
  grid-template-columns: 1.5rem repeat(12, minmax(0, 1fr));
  gap: 3px;
  align-items: center;
}

.day-label,
.month-label {
  font-size: 0.7rem;
  color: var(--color-text-soft);
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}

.sheet {
  width: min(360px, 100%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.sheet-head h2 {
  font-size: 0.95rem;
  font-weight: 700;
}

.sheet-date {
  font-size: 0.75rem;
  color: var(--color-text-soft);
  margin-top: 0.15rem;
}

.close {
  border: none;
  background: none;
  color: var(--color-text-soft);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.2rem;
}

.picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mood-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-bg);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  filter: grayscale(1);
  opacity: 0.55;
  transition:
    filter 0.15s,
    opacity 0.15s;
}

.mood-btn:hover:not(:disabled),
.mood-btn.active {
  filter: none;
  opacity: 1;
}

.mood-btn:disabled {
  cursor: default;
}

.mood-btn:disabled:not(.active) {
  opacity: 0.3;
}

.sheet-note {
  margin-top: 0.7rem;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.recorded {
  margin-top: 0.9rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border);
}

.recorded-label {
  font-size: 0.72rem;
  color: var(--color-text-soft);
}

.chips {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.72rem;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.journal-link {
  display: inline-block;
  margin-top: 0.9rem;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  h1 {
    font-size: 1.3rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .legend {
    gap: 0.5rem 0.9rem;
    font-size: 0.75rem;
  }

  .pixel-grid {
    gap: 2px;
  }

  .month-row,
  .pixel-row {
    grid-template-columns: 1.1rem repeat(12, minmax(0, 1fr));
    gap: 2px;
  }

  .day-label,
  .month-label {
    font-size: 0.6rem;
  }
}
</style>
