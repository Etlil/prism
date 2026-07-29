<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import {
  monthNames,
  weekdayShort,
  toIsoDate,
  fromIsoDate,
  daysInMonth,
  formatMediumDate,
} from '@/lib/dates'

// defineModel gives two-way binding: the parent writes v-model="selectedDate"
// and this component can assign to `selected` directly to update it.
const selected = defineModel({ type: String, required: true })

const todayIso = toIsoDate(new Date())
const strip = ref(null)

const viewYear = ref(fromIsoDate(selected.value).getFullYear())
const viewMonth = ref(fromIsoDate(selected.value).getMonth())

const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1, current + 2]
})

const days = computed(() =>
  Array.from({ length: daysInMonth(viewYear.value, viewMonth.value) }, (_, i) => {
    const date = new Date(viewYear.value, viewMonth.value, i + 1)
    return {
      dayNum: i + 1,
      iso: toIsoDate(date),
      weekday: weekdayShort[date.getDay()],
    }
  }),
)

function shiftMonth(step) {
  const date = new Date(viewYear.value, viewMonth.value + step, 1)
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
}

function goToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  selected.value = todayIso
}

// Scrolls the highlighted day into view — otherwise picking a date near the
// end of the month leaves it off-screen in the horizontal strip.
async function scrollSelectedIntoView() {
  await nextTick()
  strip.value?.querySelector('.day.selected')?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  })
}

watch([selected, viewMonth, viewYear], scrollSelectedIntoView, { immediate: true })
</script>

<template>
  <section class="date-strip">
    <header class="controls">
      <div class="picker">
        <button type="button" class="arrow" aria-label="Previous month" @click="shiftMonth(-1)">
          ‹
        </button>
        <select v-model.number="viewMonth" aria-label="Month">
          <option v-for="(name, i) in monthNames" :key="name" :value="i">{{ name }}</option>
        </select>
        <select v-model.number="viewYear" aria-label="Year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button type="button" class="arrow" aria-label="Next month" @click="shiftMonth(1)">›</button>
      </div>

      <div class="legend-row">
        <span class="viewing">{{ formatMediumDate(selected) }}</span>
        <button type="button" class="today-btn" @click="goToday">Today</button>
      </div>
    </header>

    <div ref="strip" class="days">
      <button
        v-for="day in days"
        :key="day.iso"
        type="button"
        class="day"
        :class="{ selected: day.iso === selected, today: day.iso === todayIso }"
        @click="selected = day.iso"
      >
        <span class="num">{{ day.dayNum }}</span>
        <span class="wd">{{ day.weekday }}</span>
      </button>
    </div>

  </section>
</template>

<style scoped>
.date-strip {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.7rem;
  margin-bottom: 0.9rem;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.picker {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.arrow {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.arrow:hover {
  border-color: var(--accent);
}

.picker select {
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.85rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.viewing {
  color: var(--accent);
  font-weight: 600;
}

.today-btn {
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.today-btn:hover {
  background: var(--accent);
  color: white;
}

.days {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;
  scroll-behavior: smooth;
}

.day {
  flex: 0 0 auto;
  width: 40px;
  padding: 0.3rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.day:hover {
  background: var(--color-bg-soft);
}

.day .num {
  font-size: 0.92rem;
  font-weight: 700;
}

.day .wd {
  font-size: 0.6rem;
  color: var(--color-text-soft);
  letter-spacing: 0.03em;
}

.day.today {
  border-color: var(--accent);
}

.day.selected {
  background: var(--accent);
  color: white;
}

.day.selected .wd {
  color: rgba(255, 255, 255, 0.85);
}

@media (max-width: 768px) {
  .controls {
    gap: 0.6rem;
  }

  .legend-row {
    width: 100%;
    justify-content: space-between;
  }

  .picker select {
    font-size: 0.8rem;
  }
}
</style>
