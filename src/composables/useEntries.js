import { reactive, readonly, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { useMoods } from '@/composables/useMoods'
import { todayIso } from '@/lib/calendar'
import { encryptOrThrow, decryptIfPossible, vaultIsUnlocked } from '@/composables/useVault'
import { compressImage } from '@/lib/image'
import { onSessionReset } from '@/composables/sessionReset'

// Module-level state, same pattern as useAuth / useMoods / useTheme: one shared
// copy, so the dashboard grid and the journal page can't disagree about what a
// day holds.

// Cards per day. A card is an entry: a journal, optionally with a photo.
export const MAX_ENTRIES = 5
const BUCKET = 'journal-photos'

// Signed URLs are minted with this lifetime. Long enough to browse a day
// without links dying mid-session, short enough that a leaked one goes stale.
const SIGNED_URL_TTL = 60 * 60

const state = reactive({
  // isoDate -> { id, entry_date, mood_id, journal_title, journal_text, photos[] }
  byDate: {},
  year: null,
  loading: false,
  saving: false,
  error: '',
})

// Wiped whenever the signed-in user changes. loadYear returns early when the
// year is already loaded, so without this a second account signing in on the
// same tab would be shown the first account's entries and photos straight out
// of this cache — never re-querying, so RLS never gets asked.
onSessionReset(() => {
  state.byDate = {}
  state.year = null
  state.loading = false
  state.saving = false
  state.error = ''
})

function currentUserId() {
  const { auth } = useAuth()
  return auth.user?.id ?? null
}

// Bumped every time a mood is written. useStreak watches it, because the
// streak and the week strip are derived from a plain object (state.byDate)
// whose nested edits don't always register as a dependency on their own.
export const dayLoggedAt = ref(0)

export const READ_ONLY_MESSAGE = 'Only today can be edited. Other days are read-only.'

// Only the current day is writable. Enforced here rather than only in the UI,
// so a stale page left open overnight can't keep writing to what is now
// yesterday — every mutator below goes through this first.
//
// Deliberately NOT a database CHECK on entry_date = current_date: Postgres
// would evaluate that in the server's timezone, and at UTC+8 the user's "today"
// is a day ahead of UTC for eight hours out of every twenty-four, so valid
// evening writes would be rejected.
function blockedDate(isoDate) {
  if (isoDate === todayIso()) return null
  state.error = READ_ONLY_MESSAGE
  return { success: false, error: READ_ONLY_MESSAGE }
}

export function isEditable(isoDate) {
  return isoDate === todayIso()
}

function friendlyError(error) {
  if (!error) return ''
  // 42501 is insufficient_privilege — nearly always a missing RLS policy
  // rather than anything the person did.
  if (error.code === '42501') {
    return 'The database refused that write. Run the SQL files in supabase/ (entries_policies, schema_photos, storage_photos).'
  }
  return error.message || 'Something went wrong. Please try again.'
}

// ── loading ────────────────────────────────────────────────────────────────

// One round trip for the whole year. `photos(*)` is PostgREST's embed syntax —
// it follows the foreign key from photos.entry_id and nests the rows, so this
// is a join, not 365 follow-up queries.
export async function loadYear(year, { force = false } = {}) {
  if (!currentUserId()) return
  if (state.loading) return
  if (state.year === year && !force) return

  state.loading = true
  state.error = ''

  const { data, error } = await supabase
    .from('entries')
    .select('id, entry_date, mood_id, journal_title, journal_text, photos(*)')
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)

  state.loading = false

  if (error) {
    state.error = friendlyError(error)
    return
  }

  const next = {}
  for (const row of data) {
    next[row.entry_date] = {
      ...row,
      photos: (row.photos ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }
  }
  state.byDate = next
  state.year = year
}

// Photos are stored as bucket paths, not URLs, because the bucket is private.
// This swaps each path for a temporary signed link, and is called only for the
// day being viewed — the dashboard needs mood ids, not images, so signing a
// whole year of photos would be wasted work.
export async function signPhotosFor(isoDate) {
  const entry = state.byDate[isoDate]
  if (!entry?.photos.length) return

  // storage_path is null on cards that have no picture — asking Storage to
  // sign a null path errors and takes the whole day's images down with it.
  const unsigned = entry.photos.filter((p) => p.storage_path && !p.url)
  if (!unsigned.length) return

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unsigned.map((p) => p.storage_path), SIGNED_URL_TTL)

  if (error) {
    state.error = friendlyError(error)
    return
  }

  data.forEach((result, i) => {
    if (result.signedUrl) unsigned[i].url = result.signedUrl
  })
}

// ── writing ────────────────────────────────────────────────────────────────

// Every write needs an entry row to hang off, and a day may not have one yet.
// The unique index on (user_id, entry_date) is what makes this an upsert
// instead of a check-then-insert race.
async function ensureEntry(isoDate) {
  const existing = state.byDate[isoDate]
  if (existing?.id) return existing

  const userId = currentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('entries')
    .upsert({ user_id: userId, entry_date: isoDate }, { onConflict: 'user_id,entry_date' })
    .select('id, entry_date, mood_id, journal_title, journal_text')
    .single()

  if (error) {
    state.error = friendlyError(error)
    return null
  }

  state.byDate[isoDate] = { ...data, photos: [] }
  return state.byDate[isoDate]
}

// Patches one entry row and merges the result back into local state, so the
// grid repaints without re-reading the year.
async function patchEntry(isoDate, patch) {
  const entry = await ensureEntry(isoDate)
  if (!entry) return { success: false, error: state.error }

  state.saving = true
  const { data, error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', entry.id)
    .select('id, entry_date, mood_id, journal_title, journal_text')
    .single()
  state.saving = false

  if (error) {
    state.error = friendlyError(error)
    return { success: false, error: state.error }
  }

  Object.assign(state.byDate[isoDate], data)
  return { success: true }
}

// Clicking the mood already set clears it, matching how the photo mood picker
// behaves.
export async function setDayMood(isoDate, moodId) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const current = state.byDate[isoDate]?.mood_id ?? null
  const result = await patchEntry(isoDate, { mood_id: current === moodId ? null : moodId })
  if (result.success) dayLoggedAt.value++
  return result
}

// The journal belongs to a photo, not to the day — three photos on one day
// means three separate notes. It used to live on `entries`, which is why every
// photo of a day showed the same text.
export const LOCKED_MESSAGE =
  'Your journal is locked, so this would be saved as readable text. Log out and back in to unlock it, then try again.'

export async function savePhotoJournal(isoDate, photoId, { title, text }) {
  // Refuse rather than fall back to plaintext. Saving unencrypted here would
  // be worse than not saving: it looks like it worked while quietly putting
  // readable text in the database.
  if (!vaultIsUnlocked()) {
    state.error = LOCKED_MESSAGE
    return { success: false, error: LOCKED_MESSAGE }
  }

  // Encrypted here, on the way out — the plaintext never reaches the network.
  const result = await patchPhoto(isoDate, photoId, {
    journal_title: await encryptOrThrow(title),
    journal_text: await encryptOrThrow(text),
  })

  // patchPhoto stored what the server returned, which is ciphertext. Put the
  // plaintext back on the local copy so the card doesn't flash to gibberish
  // after saving.
  if (result.success) {
    const photo = state.byDate[isoDate]?.photos.find((p) => p.id === photoId)
    if (photo) {
      photo.journal_title_plain = title
      photo.journal_text_plain = text
    }
  }
  return result
}

// Decrypts one day's journals into `*_plain` fields. Called for the day being
// viewed, the same way signed photo URLs are — decrypting a whole year up front
// would be wasted work, and it keeps the ciphertext as the single source of
// truth in state.
//
// Sets the fields to null when the vault is locked, which is how the UI tells
// "empty" apart from "hidden".
export async function decryptEntry(isoDate) {
  const entry = state.byDate[isoDate]
  if (!entry) return

  await Promise.all(
    entry.photos.map(async (photo) => {
      photo.journal_title_plain = await decryptIfPossible(photo.journal_title)
      photo.journal_text_plain = await decryptIfPossible(photo.journal_text)
    }),
  )
}

// Re-runs decryption for every day already loaded. Used right after unlocking,
// so entries that were showing as locked fill in without a reload.
export async function decryptLoadedEntries() {
  if (!vaultIsUnlocked()) return
  await Promise.all(Object.keys(state.byDate).map(decryptEntry))
}

// ── photos ─────────────────────────────────────────────────────────────────

function fileExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName
  return file.type?.split('/')[1] || 'jpg'
}

// Adds an empty card — no picture, just somewhere to write. A photo can be
// attached to it later with attachPhoto.
export async function addEntry(isoDate) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const userId = currentUserId()
  if (!userId) return { success: false, error: 'You are not signed in.' }

  const entry = await ensureEntry(isoDate)
  if (!entry) return { success: false, error: state.error }
  if (entry.photos.length >= MAX_ENTRIES) {
    return { success: false, error: `That's the ${MAX_ENTRIES}-entry limit for one day.` }
  }

  state.saving = true
  const { data, error } = await supabase
    .from('photos')
    .insert({ entry_id: entry.id, user_id: userId, sort_order: entry.photos.length })
    .select()
    .single()
  state.saving = false

  if (error) {
    state.error = friendlyError(error)
    return { success: false, error: state.error }
  }

  entry.photos.push({ ...data, journal_title_plain: '', journal_text_plain: '' })
  return { success: true, id: data.id }
}

// Puts a picture on a card that didn't have one.
export async function attachPhoto(isoDate, photoId, file) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const userId = currentUserId()
  if (!userId) return { success: false, error: 'You are not signed in.' }

  const photo = state.byDate[isoDate]?.photos.find((p) => p.id === photoId)
  if (!photo) return { success: false, error: 'Entry not found.' }

  state.saving = true
  state.error = ''

  const compressed = await compressImage(file)
  const path = `${userId}/${isoDate}/${crypto.randomUUID()}.${fileExtension(compressed)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: false })

  if (uploadError) {
    state.saving = false
    state.error = friendlyError(uploadError)
    return { success: false, error: state.error }
  }

  const { data, error } = await supabase
    .from('photos')
    .update({ storage_path: path })
    .eq('id', photoId)
    .select()
    .single()

  if (error) {
    // Don't leave a file in the bucket that no row points at.
    await supabase.storage.from(BUCKET).remove([path])
    state.saving = false
    state.error = friendlyError(error)
    return { success: false, error: state.error }
  }

  // Keeps the decrypted journal, which isn't a database column.
  Object.assign(photo, data, {
    journal_title_plain: photo.journal_title_plain,
    journal_text_plain: photo.journal_text_plain,
    url: null,
  })

  state.saving = false
  await signPhotosFor(isoDate)
  return { success: true }
}

export async function addPhotos(isoDate, files) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const userId = currentUserId()
  if (!userId) return { success: false, error: 'You are not signed in.' }

  const entry = await ensureEntry(isoDate)
  if (!entry) return { success: false, error: state.error }

  const room = MAX_ENTRIES - entry.photos.length
  const chosen = Array.from(files).slice(0, Math.max(0, room))
  if (!chosen.length) return { success: true }

  state.saving = true
  state.error = ''

  for (const [i, original] of chosen.entries()) {
    // Shrunk before it ever touches the network. One at a time rather than all
    // at once — each decode holds a full bitmap in memory.
    const file = await compressImage(original)

    // The user id has to be the first path segment: the storage policies read
    // it back out with storage.foldername() to decide who owns the file.
    const path = `${userId}/${isoDate}/${crypto.randomUUID()}.${fileExtension(file)}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      state.saving = false
      state.error = friendlyError(uploadError)
      return { success: false, error: state.error }
    }

    const { data, error } = await supabase
      .from('photos')
      .insert({
        entry_id: entry.id,
        user_id: userId,
        storage_path: path,
        sort_order: entry.photos.length + i,
      })
      .select()
      .single()

    if (error) {
      // The upload already succeeded, so drop the file rather than leave an
      // orphan in the bucket that nothing points at.
      await supabase.storage.from(BUCKET).remove([path])
      state.saving = false
      state.error = friendlyError(error)
      return { success: false, error: state.error }
    }

    entry.photos.push(data)
  }

  state.saving = false
  await signPhotosFor(isoDate)
  return { success: true }
}

export async function removePhoto(isoDate, photoId) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const entry = state.byDate[isoDate]
  if (!entry) return { success: false, error: 'No entry for that day.' }

  const index = entry.photos.findIndex((p) => p.id === photoId)
  if (index === -1) return { success: false, error: 'Photo not found.' }

  const photo = entry.photos[index]
  state.saving = true

  const { error } = await supabase.from('photos').delete().eq('id', photoId)
  if (error) {
    state.saving = false
    state.error = friendlyError(error)
    return { success: false, error: state.error }
  }

  // Row first, file second. If this fails the file is orphaned but nothing in
  // the app points at it — the reverse order would leave a row whose image is
  // permanently missing.
  await supabase.storage.from(BUCKET).remove([photo.storage_path])

  entry.photos.splice(index, 1)
  state.saving = false
  return { success: true }
}

// Covers both the caption and the per-photo mood, so neither needs its own
// guard.
async function patchPhoto(isoDate, photoId, patch) {
  const blocked = blockedDate(isoDate)
  if (blocked) return blocked

  const entry = state.byDate[isoDate]
  const photo = entry?.photos.find((p) => p.id === photoId)
  if (!photo) return { success: false, error: 'Photo not found.' }

  state.saving = true
  const { data, error } = await supabase
    .from('photos')
    .update(patch)
    .eq('id', photoId)
    .select()
    .single()
  state.saving = false

  if (error) {
    state.error = friendlyError(error)
    return { success: false, error: state.error }
  }

  // The signed URL isn't a database column, so it would be lost by a blind
  // overwrite of the local object.
  Object.assign(photo, data, { url: photo.url })
  return { success: true }
}

export async function setPhotoCaption(isoDate, photoId, caption) {
  return patchPhoto(isoDate, photoId, { caption: caption.trim() })
}

export async function setPhotoMood(isoDate, photoId, moodId) {
  const entry = state.byDate[isoDate]
  const photo = entry?.photos.find((p) => p.id === photoId)
  if (!photo) return { success: false, error: 'Photo not found.' }

  const result = await patchPhoto(isoDate, photoId, {
    mood_id: photo.mood_id === moodId ? null : moodId,
  })
  if (result.success) dayLoggedAt.value++
  return result
}

// ── reading ────────────────────────────────────────────────────────────────

// The colours that make up one day's pixel: the day's own mood, plus one per
// mood-tagged photo. Three photos tagged joyful/joyful/sad gives a pixel that
// is two-thirds joyful — which is what the conic-gradient pie is drawn from.
export function moodColorsFor(isoDate) {
  const entry = state.byDate[isoDate]
  if (!entry) return []

  const { moodById } = useMoods()
  const ids = [entry.mood_id, ...entry.photos.map((p) => p.mood_id)]

  return ids.filter(Boolean).map((id) => moodById(id)?.color_hex).filter(Boolean)
}

// Every mood object recorded that day — the day's own mood plus each
// mood-tagged photo. moodColorsFor is the colour-only version of this.
export function moodsFor(isoDate) {
  const entry = state.byDate[isoDate]
  if (!entry) return []

  const { moodById } = useMoods()
  const ids = [entry.mood_id, ...entry.photos.map((p) => p.mood_id)]

  return ids.filter(Boolean).map((id) => moodById(id)).filter(Boolean)
}

// The 1–5 scores behind those moods, for the chart's y-axis. Moods created
// before the score column existed fall back to 3 (okay) rather than dropping
// the day off the chart entirely.
export function scoresFor(isoDate) {
  return moodsFor(isoDate).map((mood) => mood.score ?? 3)
}

export function isLogged(isoDate) {
  return moodColorsFor(isoDate).length > 0
}

export function getEntry(isoDate) {
  return state.byDate[isoDate] ?? null
}

export function clearError() {
  state.error = ''
}

export function useEntries() {
  return {
    entries: readonly(state),
    MAX_ENTRIES,
    loadYear,
    signPhotosFor,
    decryptEntry,
    decryptLoadedEntries,
    setDayMood,
    savePhotoJournal,
    addPhotos,
    removePhoto,
    setPhotoCaption,
    setPhotoMood,
    moodColorsFor,
    moodsFor,
    scoresFor,
    isLogged,
    isEditable,
    getEntry,
    clearError,
  }
}
