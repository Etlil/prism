import { toIsoDate } from '@/lib/dates'

// What's left of fakeYear.js once the fake moods are gone: just the calendar
// scaffold the grid is drawn on. The moods now come from the database.

// A function, not a constant: only today may be edited, so a value frozen at
// module load would lock you out of the new day if the app were left open
// across midnight — and leave yesterday editable.
export function todayIso() {
  return toIsoDate(new Date())
}

export const currentYear = new Date().getFullYear()

// Every day in a year, oldest first. Comparing ISO date strings works because
// YYYY-MM-DD sorts the same lexicographically as it does chronologically —
// which is the whole reason the app passes dates around as strings.
export function buildYear(year) {
  const total = Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / 86400000)
  const today = todayIso()

  return Array.from({ length: total }, (_, i) => {
    const date = new Date(year, 0, 1 + i)
    const isoDate = toIsoDate(date)
    return { date, isoDate, isFuture: isoDate > today }
  })
}
