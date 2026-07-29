import { moods } from './moods'
import { toIsoDate } from '@/lib/dates'

const YEAR = 2026

function daysInYear(year) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

// Built once at module load, not inside a function — so every component that
// imports `year` sees the same fake days instead of a fresh random set on
// every re-render.
const today = new Date()
const total = daysInYear(YEAR)

export const todayIso = toIsoDate(today)

export const year = Array.from({ length: total }, (_, i) => {
  const date = new Date(YEAR, 0, 1 + i)
  const isFuture = date > today

  // Roughly one day in six is left blank, so the grid has gaps like a real
  // year would — and so the streak count on the dashboard means something.
  const skipped = Math.random() < 0.17

  // One to three moods per day, so the dashboard shows a mix of solid pixels
  // and pie-sliced ones. Real days come from journal photos instead.
  const count = 1 + Math.floor(Math.random() * 3)
  const baseMoodIds =
    isFuture || skipped
      ? []
      : Array.from({ length: count }, () => moods[Math.floor(Math.random() * moods.length)].id)

  return {
    date,
    isoDate: toIsoDate(date),
    baseMoodIds,
  }
})
