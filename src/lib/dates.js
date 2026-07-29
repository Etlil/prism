export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Formats as YYYY-MM-DD using the local calendar date. toISOString() can't be
// used here: it converts to UTC first, which shifts the date by a day for
// anyone east or west of Greenwich.
export function toIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromIsoDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function formatMediumDate(iso) {
  const date = fromIsoDate(iso)
  const weekday = weekdayShort[date.getDay()]
  const month = monthNames[date.getMonth()].slice(0, 3)
  return `${weekday} · ${month} ${date.getDate()}, ${date.getFullYear()}`
}

