<script setup>
import { computed } from 'vue'
import { year } from '@/data/fakeYear'
import { moods } from '@/data/moods'
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

const loggedCount = computed(() => year.filter((d) => d.mood).length)
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <div>
        <h1>Year in Pixels</h1>
        <p class="subtitle">{{ loggedCount }} days logged in 2026</p>
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
            :color="cell?.mood?.colorHex"
            :label="cell ? `${cell.isoDate}${cell.mood ? ' · ' + cell.mood.label : ''}` : ''"
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
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
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
  display: flex;
  flex-wrap: wrap;
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
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.pixel-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 560px;
}

.month-row,
.pixel-row {
  display: grid;
  grid-template-columns: 1.5rem repeat(12, minmax(24px, 1fr));
  gap: 3px;
  align-items: center;
}

.day-label,
.month-label {
  font-size: 0.7rem;
  color: var(--color-text-soft);
  text-align: center;
}
</style>
