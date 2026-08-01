// Somewhere for the composables to hand in a "throw away everything you're
// holding" function, so useAuth can call them all when the signed-in user
// changes.
//
// This exists to avoid a circular import: useMoods and useEntries both import
// useAuth (to read the current user id), so useAuth cannot import them back.
// Both sides import this instead, and neither knows about the other.
//
// The bug it fixes: those composables cache at module level and return early
// if they have already loaded. Without clearing them, signing in as a second
// account in the same tab re-displays the FIRST account's entries and photos —
// the database was never asked again, so its row-level security never got a
// chance to say no.

const resetters = new Set()

export function onSessionReset(fn) {
  resetters.add(fn)
  return () => resetters.delete(fn)
}

export function runSessionReset() {
  for (const fn of resetters) fn()
}
