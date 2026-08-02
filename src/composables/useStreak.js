import { computed, ref } from 'vue'
import { buildYear, todayIso, currentYear } from '@/lib/calendar'
import { toIsoDate, fromIsoDate } from '@/lib/dates'
import { useEntries, dayLoggedAt } from '@/composables/useEntries'
import { onSessionReset } from '@/composables/sessionReset'

// The streak, the week strip, and the once-a-day celebration.
//
// The streak calculation used to live in DashboardView and again in AboutView.
// It lives here now so the number on the dashboard, the number in the
// celebration and the count on the About page can't disagree.

// Remembers which day the celebration was last shown, so it appears once —
// on the first entry of the day — and not again on every later edit.
const SHOWN_KEY = 'prism-streak-shown'

const showCelebration = ref(false)

function lastShownDate() {
  try {
    return localStorage.getItem(SHOWN_KEY)
  } catch {
    return null
  }
}

function markShown(iso) {
  try {
    localStorage.setItem(SHOWN_KEY, iso)
  } catch {
    /* private mode — it'll just show again next time */
  }
}

onSessionReset(() => {
  showCelebration.value = false
})

export function useStreak() {
  const { isLogged, scoresFor } = useEntries()

  // Counts backwards from today, stopping at the first blank day.
  //
  // An unlogged today is skipped rather than treated as a break: it hasn't been
  // missed yet, and counting it as a gap would show 0 every morning.
  const currentStreak = computed(() => {
    // Referenced so the count recomputes after a write, not just after a load.
    dayLoggedAt.value

    const today = todayIso()
    const past = buildYear(currentYear).filter((day) => day.isoDate <= today)

    let streak = 0
    for (let i = past.length - 1; i >= 0; i--) {
      if (!isLogged(past[i].isoDate)) {
        if (past[i].isoDate === today) continue
        break
      }
      streak++
    }
    return streak
  })

  // Sunday → Saturday of the week containing today, for the strip of ticks.
  const weekStrip = computed(() => {
    dayLoggedAt.value

    const today = todayIso()
    const date = fromIsoDate(today)
    const sunday = new Date(date)
    sunday.setDate(date.getDate() - date.getDay())

    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      const iso = toIsoDate(d)
      return { label, iso, logged: isLogged(iso), isToday: iso === today, isFuture: iso > today }
    })
  })

  const perfectWeek = computed(() => weekStrip.value.every((d) => d.logged || d.isFuture))
  const daysLoggedThisWeek = computed(() => weekStrip.value.filter((d) => d.logged).length)

  // Best run of consecutive logged days anywhere in the year.
  const longestStreak = computed(() => {
    dayLoggedAt.value

    let longest = 0
    let run = 0
    for (const day of buildYear(currentYear)) {
      if (isLogged(day.isoDate)) {
        run++
        longest = Math.max(longest, run)
      } else {
        run = 0
      }
    }
    return longest
  })

  // Average score across the days logged this week, or null if nothing yet.
  const weekAverage = computed(() => {
    dayLoggedAt.value

    const scores = weekStrip.value.filter((d) => d.logged).flatMap((d) => scoresFor(d.iso))
    if (!scores.length) return null
    return scores.reduce((sum, n) => sum + n, 0) / scores.length
  })

  // A line for under the chart. Deliberately gentle at the low end: someone
  // having a rough week does not need to be told to cheer up.
  const encouragement = computed(() => {
    const avg = weekAverage.value
    if (avg === null) return "Log a day and I'll tell you how your week is going."

    if (avg >= 4.3) return "You're doing good. Whatever this week was, keep it."
    if (avg >= 3.5) return 'A solid week. More good days than not.'
    if (avg >= 2.7) return 'A mixed week — that is most weeks. You are doing fine.'
    if (avg >= 1.8) return "Heavier week than usual. It's okay for it to be like this."
    return "Everything's gonna be alright. Rough stretches end — this one will too."
  })

  // Called after a write. Shows the celebration only if today is now logged and
  // it hasn't already been shown today.
  function maybeCelebrate() {
    const today = todayIso()
    if (!isLogged(today)) return
    if (lastShownDate() === today) return

    markShown(today)
    showCelebration.value = true
  }

  function dismissCelebration() {
    showCelebration.value = false
  }

  return {
    currentStreak,
    weekStrip,
    perfectWeek,
    daysLoggedThisWeek,
    longestStreak,
    weekAverage,
    encouragement,
    showCelebration,
    maybeCelebrate,
    dismissCelebration,
  }
}
