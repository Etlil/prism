import { toIsoDate } from '@/lib/dates'

const YEAR = 2026

function daysInYear(year) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

// Deterministic stand-in for Math.random. Seeding off the date means the fake
// grid looks the same on every reload instead of reshuffling, and it lets the
// mood slots below be plain numbers rather than ids that would have to match
// whatever moods the user actually has.
function hash(text) {
  let value = 0
  for (const char of text) {
    value = (value * 31 + char.charCodeAt(0)) >>> 0
  }
  return value
}

const today = new Date()
const total = daysInYear(YEAR)

export const todayIso = toIsoDate(today)

export const year = Array.from({ length: total }, (_, i) => {
  const date = new Date(YEAR, 0, 1 + i)
  const isoDate = toIsoDate(date)
  const isFuture = date > today
  const seed = hash(isoDate)

  // Roughly one day in six is left blank, so the grid has gaps like a real
  // year would — and so the streak count on the dashboard means something.
  const skipped = seed % 100 < 17

  // One to three moods per day. These are arbitrary numbers, not mood ids —
  // the dashboard maps them onto however many moods the user actually has.
  const slotCount = 1 + (seed % 3)
  const moodSlots =
    isFuture || skipped
      ? []
      : Array.from({ length: slotCount }, (_, k) => hash(`${isoDate}-${k}`))

  return { date, isoDate, moodSlots }
})
