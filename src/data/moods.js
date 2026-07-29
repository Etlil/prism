// Hardcoded for now, per CLAUDE.md Phase 1 ("Grid, faked"). Once Supabase
// exists these become rows in the `moods` table, seeded on signup — but the
// shape (label + color_hex + sort_order) is designed to match already.
export const moods = [
  { id: 'content', label: 'Content', emoji: '😌', colorHex: '#b19cd9', sortOrder: 0 },
  { id: 'creative', label: 'Creative', emoji: '🎨', colorHex: '#f2a6c9', sortOrder: 1 },
  { id: 'joyful', label: 'Joyful', emoji: '😄', colorHex: '#f5d547', sortOrder: 2 },
  { id: 'angry', label: 'Angry', emoji: '😠', colorHex: '#e2574c', sortOrder: 3 },
  { id: 'anxious', label: 'Anxious', emoji: '😰', colorHex: '#6fcf97', sortOrder: 4 },
  { id: 'sad', label: 'Sad', emoji: '😢', colorHex: '#2e3a87', sortOrder: 5 },
]

export function moodById(id) {
  return moods.find((m) => m.id === id)
}
