import { reactive, watch } from 'vue'
import { useMoods } from '@/composables/useMoods'

const { activeMoods, moodById } = useMoods()

export const MAX_PHOTOS = 5

// Gradients stand in for real photos until Supabase Storage exists (Phase 8).
// Uploaded photos get a `url` instead, from URL.createObjectURL.
const seedGradients = [
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
  'linear-gradient(135deg, #cfd9df, #e2ebf0)',
  'linear-gradient(135deg, #f5576c, #f093fb)',
  'linear-gradient(135deg, #667eea, #764ba2)',
]

let nextPhotoId = 100

// Keyed by date so one day has exactly one entry — mirrors the
// UNIQUE (user_id, entry_date) constraint in the real schema.
export const entries = reactive({
  '2026-07-29': {
    isoDate: '2026-07-29',
    journalTitle: 'A slow start',
    journalText:
      'Woke up late, made coffee, and actually sat down to work on the app for a few hours. Good day.',
    photos: [
      { id: 1, gradient: seedGradients[0], caption: 'Morning coffee', moodId: null, seedMoodLabel: 'Content' },
      { id: 2, gradient: seedGradients[2], caption: 'Walk to the park', moodId: null, seedMoodLabel: 'Joyful' },
    ],
  },
  '2026-07-28': {
    isoDate: '2026-07-28',
    journalTitle: 'Too many meetings',
    journalText: 'Long day at work. Too many meetings and not enough actual time to build anything.',
    photos: [{ id: 3, gradient: seedGradients[3], caption: 'Desk at 9pm', moodId: null, seedMoodLabel: 'Anxious' }],
  },
  '2026-07-25': {
    isoDate: '2026-07-25',
    journalTitle: 'Finally finished it',
    journalText: 'Finished the painting I started weeks ago, then went out for dinner with family.',
    photos: [
      { id: 4, gradient: seedGradients[4], caption: 'The finished piece', moodId: null, seedMoodLabel: 'Creative' },
      { id: 5, gradient: seedGradients[1], caption: 'Dinner out', moodId: null, seedMoodLabel: 'Joyful' },
      { id: 6, gradient: seedGradients[5], caption: 'Walking home', moodId: null, seedMoodLabel: 'Content' },
    ],
  },
})

// The seeded photos above name their mood by label, because real mood ids are
// uuids that don't exist until the user's moods load. This swaps each label for
// the matching real id once, so everything downstream deals only in real ids.
watch(
  activeMoods,
  (list) => {
    if (!list.length) return

    for (const entry of Object.values(entries)) {
      for (const photo of entry.photos) {
        if (photo.moodId || !photo.seedMoodLabel) continue

        const match = list.find(
          (mood) => mood.label.toLowerCase() === photo.seedMoodLabel.toLowerCase(),
        )
        if (match) {
          photo.moodId = match.id
          photo.seedMoodLabel = null
        }
      }
    }
  },
  { immediate: true },
)

export function getEntry(isoDate) {
  return entries[isoDate]
}

function ensureEntry(isoDate) {
  if (!entries[isoDate]) {
    entries[isoDate] = { isoDate, journalTitle: '', journalText: '', photos: [] }
  }
  return entries[isoDate]
}

export function addPhotos(isoDate, files) {
  const entry = ensureEntry(isoDate)
  const room = MAX_PHOTOS - entry.photos.length

  for (const file of Array.from(files).slice(0, room)) {
    entry.photos.push({
      id: nextPhotoId++,
      url: URL.createObjectURL(file),
      caption: '',
      moodId: null,
    })
  }
  return entry.photos.length
}

export function removePhoto(isoDate, photoId) {
  const entry = entries[isoDate]
  if (!entry) return

  const index = entry.photos.findIndex((p) => p.id === photoId)
  if (index === -1) return

  // Uploaded photos hold a blob URL that the browser keeps alive until it's
  // explicitly released.
  if (entry.photos[index].url) URL.revokeObjectURL(entry.photos[index].url)
  entry.photos.splice(index, 1)
}

export function setJournal(isoDate, { title, text }) {
  const entry = ensureEntry(isoDate)
  entry.journalTitle = title
  entry.journalText = text
}

export function setPhotoCaption(photo, caption) {
  photo.caption = caption.trim()
}

export function setPhotoMood(photo, moodId) {
  photo.moodId = photo.moodId === moodId ? null : moodId
}

// The colours that make up one day's pixel. A day with three photos tagged
// joyful, joyful, sad gives a pixel that is two-thirds joyful — which is what
// the pie slices on the dashboard are drawn from.
export function moodColorsFor(isoDate) {
  const entry = entries[isoDate]
  if (!entry) return []

  return entry.photos
    .filter((p) => p.moodId)
    .map((p) => moodById(p.moodId)?.color_hex)
    .filter(Boolean)
}
