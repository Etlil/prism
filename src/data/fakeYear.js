import { moods } from './moods'

const YEAR = 2026

function daysInYear(year) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

// Built once at module load, not inside a function — so every component that
// imports `year` sees the same 365 fake days instead of a fresh random set
// every re-render.
const today = new Date()
const total = daysInYear(YEAR)

export const year = Array.from({ length: total }, (_, i) => {
  const date = new Date(YEAR, 0, 1 + i)
  const isFuture = date > today
  const mood = isFuture ? null : moods[Math.floor(Math.random() * moods.length)]
  return {
    date,
    isoDate: date.toISOString().slice(0, 10),
    mood,
  }
})
