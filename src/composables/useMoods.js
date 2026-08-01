import { reactive, computed, readonly, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { onSessionReset } from '@/composables/sessionReset'

// Module-level state, same pattern as useAuth and useTheme: every component
// that calls useMoods() shares one copy, so the settings screen and the mood
// pickers can't drift apart.
const state = reactive({
  all: [], // every mood, archived included
  loading: false,
  saving: false,
  error: '',
  loaded: false,
})

// Wiped whenever the signed-in user changes. loadMoods returns early once
// `loaded` is true, so without this a second account would inherit the first
// account's mood list — names, colours and all.
onSessionReset(() => {
  state.all = []
  state.loading = false
  state.saving = false
  state.error = ''
  state.loaded = false
})

const HEX = /^#[0-9a-f]{6}$/

// The six defaults every account starts with. Normally the on_auth_user_created
// trigger inserts these at signup; this copy is the fallback for accounts that
// existed before the trigger did.
const DEFAULT_MOODS = [
  { label: 'Content', emoji: '😌', color_hex: '#68d8a3' },
  { label: 'Creative', emoji: '🎨', color_hex: '#ebb0ff' },
  { label: 'Joyful', emoji: '😄', color_hex: '#e5c43d' },
  { label: 'Angry', emoji: '😠', color_hex: '#eb7581' },
  { label: 'Anxious', emoji: '😰', color_hex: '#00abc5' },
  { label: 'Sad', emoji: '😢', color_hex: '#8a8fff' },
]

// Matches the table's CHECK constraint, which only accepts lowercase. An
// <input type="color"> already returns lowercase, but a pasted value might not.
function normalizeColor(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

// Turns a Postgres error into something worth showing a person. 23505 is
// unique_violation — here it can only be the partial index on
// (user_id, lower(label)) where is_archived = false.
function friendlyError(error, { label } = {}) {
  if (error.code === '23505') {
    return label
      ? `You already have a mood called "${label}".`
      : 'You already have a mood with that name.'
  }
  if (error.code === '23514') {
    return 'That colour is not a valid hex code.'
  }
  return error.message || 'Something went wrong. Please try again.'
}

function currentUserId() {
  const { auth } = useAuth()
  return auth.user?.id ?? null
}

async function loadMoods({ force = false } = {}) {
  if (state.loading) return
  if (state.loaded && !force) return
  if (!currentUserId()) return

  state.loading = true
  state.error = ''

  // RLS already limits rows to this user, so no .eq('user_id', ...) needed.
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    state.error = friendlyError(error)
  } else {
    state.all = data
    state.loaded = true
  }
  state.loading = false

  // A genuinely empty table means this account never got seeded. Archiving
  // every mood doesn't land here, because archived rows are still loaded.
  if (!error && data.length === 0) await seedDefaultMoods()
}

// Guards against seeding twice. Without it, a table that accepts inserts but
// returns nothing on select (an INSERT policy with no SELECT policy) would
// loop: seed, read back empty, seed again.
let seedAttempted = false

async function seedDefaultMoods() {
  const userId = currentUserId()
  if (!userId || seedAttempted) return

  seedAttempted = true
  state.saving = true

  const { data, error } = await supabase
    .from('moods')
    .insert(DEFAULT_MOODS.map((mood, i) => ({ ...mood, user_id: userId, sort_order: i })))
    .select()

  state.saving = false

  if (error) {
    // 23505 means the rows already exist — either another tab seeded them, or
    // they were seeded in SQL. Re-read to pick them up.
    if (error.code === '23505') {
      state.loaded = false
      await loadMoods({ force: true })

      // Still nothing after a successful insert conflict means the rows are
      // there but unreadable — almost always a missing SELECT policy on the
      // table. Say so rather than showing an empty list with no explanation.
      if (state.all.length === 0) {
        state.error =
          'Your moods exist in the database but cannot be read back. The moods table is likely missing a SELECT policy for row level security.'
      }
      return
    }
    state.error = friendlyError(error)
    return
  }

  state.all = data
}

function resetMoods() {
  state.all = []
  state.loaded = false
  state.error = ''
  seedAttempted = false
}

// Auth resolves asynchronously on a page load, so the user id may not exist yet
// when a component mounts. Watching it means the first load fires as soon as the
// session is known, and the list is cleared on sign-out so the next person to
// log in never sees the previous user's moods.
watch(
  () => useAuth().auth.user?.id,
  (userId) => {
    if (userId) loadMoods({ force: true })
    else resetMoods()
  },
  { immediate: true },
)

async function createMood({ label, emoji, colorHex }) {
  const userId = currentUserId()
  if (!userId) return { success: false, error: 'You are not signed in.' }

  const trimmed = label.trim()
  if (!trimmed) return { success: false, error: 'Give the mood a name.' }

  const color = normalizeColor(colorHex)
  if (!HEX.test(color)) return { success: false, error: 'Pick a colour first.' }

  // Append to the end of the list.
  const nextOrder = state.all.length ? Math.max(...state.all.map((m) => m.sort_order)) + 1 : 0

  state.saving = true
  state.error = ''

  const { data, error } = await supabase
    .from('moods')
    .insert({
      user_id: userId,
      label: trimmed,
      emoji: emoji || '🙂',
      color_hex: color,
      sort_order: nextOrder,
    })
    .select()
    .single()

  state.saving = false

  if (error) {
    const message = friendlyError(error, { label: trimmed })
    state.error = message
    return { success: false, error: message }
  }

  state.all.push(data)
  return { success: true, mood: data }
}

async function updateMood(id, patch) {
  const payload = { ...patch, updated_at: new Date().toISOString() }

  if (payload.label !== undefined) {
    payload.label = payload.label.trim()
    if (!payload.label) return { success: false, error: 'Give the mood a name.' }
  }
  if (payload.color_hex !== undefined) {
    payload.color_hex = normalizeColor(payload.color_hex)
    if (!HEX.test(payload.color_hex)) {
      return { success: false, error: 'That colour is not a valid hex code.' }
    }
  }

  state.saving = true
  state.error = ''

  const { data, error } = await supabase.from('moods').update(payload).eq('id', id).select().single()

  state.saving = false

  if (error) {
    const message = friendlyError(error, { label: payload.label })
    state.error = message
    return { success: false, error: message }
  }

  const index = state.all.findIndex((m) => m.id === id)
  if (index !== -1) state.all[index] = data
  return { success: true, mood: data }
}

// Archive rather than delete: entries still point at this mood and have to
// keep rendering in its colour.
function archiveMood(id) {
  return updateMood(id, { is_archived: true })
}

function restoreMood(id) {
  return updateMood(id, { is_archived: false })
}

const activeMoods = computed(() => state.all.filter((m) => !m.is_archived))

// Takes the full list of active mood ids in their new order and writes
// sort_order 0..n-1. Only rows whose position actually changed get an update,
// so dropping a mood back where it started costs nothing.
async function reorderMoods(orderedIds) {
  const changed = orderedIds
    .map((id, index) => ({ mood: state.all.find((m) => m.id === id), index }))
    .filter(({ mood, index }) => mood && mood.sort_order !== index)

  if (!changed.length) return { success: true }

  // Applied locally before the request, not after. Waiting for the network
  // would leave the dropped row sitting in its old position for a round trip,
  // then jumping. If the write fails we re-read and the order corrects itself.
  for (const { mood, index } of changed) mood.sort_order = index
  state.all.sort((a, b) => a.sort_order - b.sort_order)

  state.saving = true
  state.error = ''

  const results = await Promise.all(
    changed.map(({ mood, index }) =>
      supabase.from('moods').update({ sort_order: index }).eq('id', mood.id),
    ),
  )

  state.saving = false

  const failure = results.find((r) => r.error)
  if (failure) {
    state.error = friendlyError(failure.error)
    // Some updates may have landed, so re-read rather than trusting local state.
    await loadMoods({ force: true })
    return { success: false, error: state.error }
  }

  return { success: true }
}

function clearError() {
  state.error = ''
}

// Lookup by id covers archived moods too, which is the whole reason the
// archived rows stay loaded — a pixel from March must still render in its
// original colour after that mood is archived.
function moodById(id) {
  return state.all.find((m) => m.id === id)
}

export function useMoods() {
  return {
    moods: readonly(state),
    activeMoods,
    moodById,
    loadMoods,
    createMood,
    updateMood,
    archiveMood,
    restoreMood,
    reorderMoods,
    clearError,
  }
}
