import { reactive, readonly } from 'vue'
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from '@/lib/authRedirect'
import { todayIso } from '@/lib/calendar'
import { toIsoDate } from '@/lib/dates'
import { isLogged } from '@/composables/useEntries'

// Nightly nudges so a streak doesn't die by accident.
//
// These are LOCAL notifications — scheduled on the phone, fired by Android.
// Nothing is sent from a server, so they work with no signal and cost nothing.
//
// Web browsers get nothing: every function here no-ops unless the app is
// running inside the Capacitor shell.

const STORAGE_KEY = 'prism-reminders-enabled'

// The escalation, most polite to least.
export const REMINDERS = [
  { slot: 0, hour: 18, minute: 0, title: 'Prism', body: 'Broo the streak' },
  { slot: 1, hour: 22, minute: 0, title: 'Prism', body: "Yoooo don't forget it" },
  { slot: 2, hour: 23, minute: 30, title: 'Prism', body: 'HOYYY STRIKKKKKK' },
]

// How many days ahead to schedule. Android caps how many notifications an app
// can have pending, and re-scheduling happens on every app open anyway, so a
// week is plenty.
const DAYS_AHEAD = 7

const state = reactive({
  supported: false,
  enabled: false,
  permission: 'unknown', // 'granted' | 'denied' | 'unknown'
  scheduled: 0,
})

function readEnabled() {
  try {
    // Default on: someone who installs a streak app wants the reminder.
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function writeEnabled(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch {
    /* nothing to do */
  }
}

// Deterministic ids so a reschedule replaces the previous set cleanly instead
// of stacking duplicates: dayOffset * 10 + slot.
function notificationId(dayOffset, slot) {
  return dayOffset * 10 + slot
}

function allIds() {
  const ids = []
  for (let day = 0; day < DAYS_AHEAD; day++) {
    for (const r of REMINDERS) ids.push({ id: notificationId(day, r.slot) })
  }
  return ids
}

export async function initReminders() {
  state.supported = isNativeApp()
  state.enabled = readEnabled()
  if (!state.supported) return

  const status = await LocalNotifications.checkPermissions()
  state.permission = status.display
  if (state.permission === 'granted' && state.enabled) await rescheduleReminders()
}

export async function requestReminderPermission() {
  if (!state.supported) return false

  // Android 13+ shows the system prompt here. Older versions return granted
  // straight away.
  const status = await LocalNotifications.requestPermissions()
  state.permission = status.display
  return state.permission === 'granted'
}

// Rebuilds the whole schedule.
//
// Deliberately NOT using the plugin's `repeats: true`: a repeating daily
// notification cannot skip a day, so it would still nag on evenings the entry
// was already written. Instead this lays down one-shot notifications for the
// next week and skips any day that is already logged — then runs again on the
// next app open or write to stay current.
export async function rescheduleReminders() {
  if (!state.supported) return
  if (state.permission !== 'granted') return

  await LocalNotifications.cancel({ notifications: allIds() })

  if (!state.enabled) {
    state.scheduled = 0
    return
  }

  const now = new Date()
  const today = todayIso()
  const notifications = []

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const date = new Date(now)
    date.setDate(now.getDate() + day)
    const iso = toIsoDate(date)

    // Don't nag about a day that's already been written.
    if (iso === today && isLogged(today)) continue

    for (const r of REMINDERS) {
      const at = new Date(date)
      at.setHours(r.hour, r.minute, 0, 0)

      // Skip times that have already passed today.
      if (at <= now) continue

      notifications.push({
        id: notificationId(day, r.slot),
        title: r.title,
        body: r.body,
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_icon_config_sample',
      })
    }
  }

  if (notifications.length) await LocalNotifications.schedule({ notifications })
  state.scheduled = notifications.length
}

export async function setRemindersEnabled(value) {
  state.enabled = value
  writeEnabled(value)

  if (value && state.permission !== 'granted') {
    const granted = await requestReminderPermission()
    if (!granted) return false
  }
  await rescheduleReminders()
  return true
}

export function useReminders() {
  return {
    reminders: readonly(state),
    REMINDERS,
    initReminders,
    setRemindersEnabled,
    rescheduleReminders,
    requestReminderPermission,
  }
}
