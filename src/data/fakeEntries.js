import { reactive } from 'vue'
import { moodById } from './moods'

// Gradients stand in for real photos until Supabase Storage exists (Phase 3+).
// Real entries will have `photoUrl` pointing at a bucket file instead.
const placeholderPhotos = [
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
  'linear-gradient(135deg, #cfd9df, #e2ebf0)',
  'linear-gradient(135deg, #f5576c, #f093fb)',
  'linear-gradient(135deg, #667eea, #764ba2)',
]

export const reactionTypes = [
  { key: 'like', emoji: '👍' },
  { key: 'love', emoji: '❤️' },
  { key: 'haha', emoji: '😆' },
  { key: 'wow', emoji: '😮' },
  { key: 'sad', emoji: '😢' },
]

const raw = [
  {
    id: 1,
    isoDate: '2026-01-12',
    moodId: 'joyful',
    note: 'Beach day with the old crew',
    journalText:
      "Didn't expect to run into half the group from college but we ended up staying until the tide came in. Feels like nothing changed.",
    photo: placeholderPhotos[0],
  },
  {
    id: 2,
    isoDate: '2026-02-03',
    moodId: 'creative',
    note: 'Finally finished the painting',
    journalText:
      'Three weeks of picking it up and putting it down again, and tonight it just clicked. Going to let it dry and frame it this weekend.',
    photo: placeholderPhotos[1],
  },
  {
    id: 3,
    isoDate: '2026-03-21',
    moodId: 'content',
    note: 'Slow Sunday, no plans',
    journalText:
      'Made coffee, read on the balcony, did not look at my phone until noon. More of these, please.',
    photo: placeholderPhotos[2],
  },
  {
    id: 4,
    isoDate: '2026-04-09',
    moodId: 'anxious',
    note: 'Presentation went okay I think',
    journalText:
      "Rehearsed too much and still blanked on slide four. Nobody seemed to notice. My hands were shaking the whole time though.",
    photo: placeholderPhotos[3],
  },
  {
    id: 5,
    isoDate: '2026-05-17',
    moodId: 'joyful',
    note: "Mom's birthday dinner",
    journalText:
      'Got the whole family in one room for the first time since the holidays. She cried a little when we brought out the cake.',
    photo: placeholderPhotos[4],
  },
  {
    id: 6,
    isoDate: '2026-06-30',
    moodId: 'sad',
    note: 'Said bye to the apartment',
    journalText:
      'Handed the keys back today. Four years of memories in one small place. Onward, but it stings more than I expected.',
    photo: placeholderPhotos[5],
  },
]

// reactive() on an array makes both the array itself AND every property on
// each object inside it trackable — so a template that reads entry.reactions.like
// re-renders automatically when we mutate it, no extra wiring needed.
export const entries = reactive(
  raw.map((e) => ({
    ...e,
    mood: moodById(e.moodId),
    reactions: reactionTypes.reduce((acc, r) => {
      acc[r.key] = Math.floor(Math.random() * 12)
      return acc
    }, {}),
    myReaction: null,
  })),
)

export function toggleReaction(entry, key) {
  if (entry.myReaction === key) {
    entry.reactions[key]--
    entry.myReaction = null
  } else {
    if (entry.myReaction) entry.reactions[entry.myReaction]--
    entry.reactions[key]++
    entry.myReaction = key
  }
}
