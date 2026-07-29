<script setup>
import { computed } from 'vue'
import { year, todayIso } from '@/data/fakeYear'
import { moods, moodById } from '@/data/moods'
import { moodColorsFor } from '@/data/fakeEntries'
import MoodCell from '@/components/MoodCell.vue'

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

// Moods tagged on journal photos win; days without an entry fall back to the
// generated fake moods. Reading the reactive `entries` here means tagging a
// photo repaints that day's pixel straight away.
function colorsFor(day) {
  if (!day) return []

  const fromJournal = moodColorsFor(day.isoDate)
  if (fromJournal.length) return fromJournal

  return day.baseMoodIds.map((id) => moodById(id)?.colorHex).filter(Boolean)
}

function labelFor(day) {
  if (!day) return ''

  const count = colorsFor(day).length
  if (!count) return day.isoDate
  return `${day.isoDate} · ${count} mood${count > 1 ? 's' : ''}`
}

// Counts backwards from today and stops at the first blank day, so this is the
// run you'd break by skipping tomorrow.
const currentStreak = computed(() => {
  const past = year.filter((day) => day.isoDate <= todayIso)

  let streak = 0
  for (let i = past.length - 1; i >= 0; i--) {
    if (!colorsFor(past[i]).length) break
    streak++
  }
  return streak
})
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <div>
        <h1>Year in Pixels</h1>
        <p class="subtitle">
          <span v-if="currentStreak">🔥 {{ currentStreak }} day streak</span>
          <span v-else>No streak yet — log today to start one</span>
        </p>
      </div>
      <ul class="legend">
        <li v-for="mood in moods" :key="mood.id">
          <span class="swatch" :style="{ background: mood.colorHex }"></span>
          {{ mood.label }}
        </li>
      </ul>
    </header>

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
            :is-today="cell?.isoDate === todayIso"
            :label="labelFor(cell)"
          />
        </div>
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
