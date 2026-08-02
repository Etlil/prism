<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DateStrip from '@/components/DateStrip.vue'
import PolaroidPhoto from '@/components/PolaroidPhoto.vue'
import { useMoods } from '@/composables/useMoods'
import { useEntries } from '@/composables/useEntries'
import { useVault } from '@/composables/useVault'
import { toIsoDate } from '@/lib/dates'

const { activeMoods, loadMoods } = useMoods()
// Signing in opens the journal with no prompt. This is false only when the key
// isn't available in this browser — a session restored from before encryption
// existed, or a password reset.
const { isReady, vault } = useVault()
const {
  entries,
  MAX_ENTRIES,
  loadYear,
  signPhotosFor,
  setDayMood,
  savePhotoJournal,
  addEntry,
  attachPhoto,
  removePhoto,
  setPhotoCaption,
  setPhotoMood,
  decryptEntry,
  isEditable,
  clearError,
} = useEntries()

const selectedDate = ref(toIsoDate(new Date()))
const fileInput = ref(null)
const index = ref(0)
const uploading = ref(false)

// Reads through the reactive store rather than caching the entry object, so a
// save anywhere else in the app shows up here immediately.
const entry = computed(() => entries.byDate[selectedDate.value] ?? null)
const photos = computed(() => entry.value?.photos ?? [])
const remaining = computed(() => MAX_ENTRIES - photos.value.length)
const currentPhoto = computed(() => photos.value[index.value])
const dayMoodId = computed(() => entry.value?.mood_id ?? null)

// Only today can be written to. Everything else is browsable but locked.
const editable = computed(() => isEditable(selectedDate.value))
const isPast = computed(() => selectedDate.value < toIsoDate(new Date()))

// Each photo carries its own journal, so these follow the photo being viewed
// rather than the day.
//
// decryptEntry writes plaintext into *_plain, or null when the text is
// encrypted and the vault is locked — which is how "nothing written" is told
// apart from "can't be read right now".
const journalTitle = computed(() => currentPhoto.value?.journal_title_plain ?? '')
const journalText = computed(() => currentPhoto.value?.journal_text_plain ?? '')
// Two ways to be locked: the stored text is ciphertext we can't open, or the
// key isn't available at all so a save would have to be written in the clear.
// Both hide the Edit button.
const journalLocked = computed(
  () =>
    !isReady.value ||
    (!!currentPhoto.value &&
      (currentPhoto.value.journal_title_plain === null ||
        currentPhoto.value.journal_text_plain === null)),
)

onMounted(async () => {
  await Promise.all([loadMoods(), loadYear(new Date().getFullYear())])
  await Promise.all([signPhotosFor(selectedDate.value), decryptEntry(selectedDate.value)])
})

// Start from the first photo whenever the day changes, then fetch signed URLs
// and decrypt that day's journal — both are done per-day rather than for the
// whole year.
watch(selectedDate, async (iso) => {
  index.value = 0
  await Promise.all([signPhotosFor(iso), decryptEntry(iso)])
})

// Creates a blank card and jumps to it, so the next thing you see is the thing
// you just made.
async function handleAddEntry() {
  const result = await addEntry(selectedDate.value)
  if (result.success) index.value = photos.value.length - 1
}

// The file picker is shared by every card; this remembers which one asked.
async function handleAttachPhoto(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !currentPhoto.value) return

  uploading.value = true
  await attachPhoto(selectedDate.value, currentPhoto.value.id, file)
  uploading.value = false
}

// Keeps the index valid when the list shrinks — without this, deleting the
// last photo would leave index pointing past the end of the array.
watch(
  () => photos.value.length,
  (length) => {
    if (index.value >= length) index.value = Math.max(0, length - 1)
  },
)

function step(offset) {
  const count = photos.value.length
  if (!count) return
  // Wraps around, so next on the last photo returns to the first.
  index.value = (index.value + offset + count) % count
}
</script>

<template>
  <div class="photo-journal">
    <header class="page-header">
      <h1>Photo Journal</h1>
      <div class="toolbar">
        <p class="count">{{ photos.length }}/{{ MAX_ENTRIES }}</p>
        <button
          type="button"
          class="add-btn"
          :disabled="!editable || remaining === 0 || entries.saving"
          @click="handleAddEntry"
        >
          {{ !editable ? 'Locked' : remaining === 0 ? 'Limit reached' : 'Add entry' }}
        </button>
        <!-- One picker for the whole page; the card being viewed is the one it
             attaches to. -->
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="image/*"
          @change="handleAttachPhoto"
        />
      </div>
    </header>

    <p v-if="entries.error" class="banner error">
      {{ entries.error }}
      <button type="button" class="banner-close" @click="clearError">×</button>
    </p>

    <!-- Writing is blocked rather than saved unencrypted, so this has to say
         plainly what to do about it. -->
    <p v-if="!isReady" class="locked-note warn">
      🔒 Journal writing is locked, so it can't be saved right now. Photos, captions and moods still
      work.
      <template v-if="vault.error">
        <br /><span class="reason">{{ vault.error }}</span>
      </template>
      <br /><RouterLink to="/settings">Fix this in Settings → Journal privacy</RouterLink>
    </p>

    <DateStrip v-model="selectedDate" />

    <p v-if="!editable" class="locked-note">
      {{ isPast ? 'This day is closed.' : 'This day has not arrived yet.' }}
      You can only record today.
    </p>

    <!-- The day's own mood, separate from the per-photo ones. Without this a
         day with no photo could never be logged, and the streak would break
         every time you didn't take a picture. -->
    <div class="day-mood">
      <span class="day-mood-label">{{ editable ? 'How was this day?' : 'How this day felt' }}</span>
      <div class="day-mood-picker">
        <button
          v-for="mood in activeMoods"
          :key="mood.id"
          type="button"
          class="day-mood-btn"
          :class="{ active: dayMoodId === mood.id }"
          :title="mood.label"
          :disabled="!editable"
          :style="dayMoodId === mood.id ? { borderColor: mood.color_hex } : null"
          @click="setDayMood(selectedDate, mood.id)"
        >
          {{ mood.emoji }}
        </button>
      </div>
    </div>

    <div v-if="currentPhoto" class="viewer">
      <div class="stage">
        <button
          type="button"
          class="arrow"
          aria-label="Previous photo"
          :disabled="photos.length < 2"
          @click="step(-1)"
        >
          ‹
        </button>

        <div class="card-slot">
          <PolaroidPhoto
            :key="currentPhoto.id"
            :photo="currentPhoto"
            :journal-title="journalTitle"
            :journal-text="journalText"
            :journal-locked="journalLocked"
            :readonly="!editable"
            :uploading="uploading"
            @add-photo="fileInput.click()"
            @remove="removePhoto(selectedDate, currentPhoto.id)"
            @save-journal="savePhotoJournal(selectedDate, currentPhoto.id, $event)"
            @set-caption="setPhotoCaption(selectedDate, currentPhoto.id, $event)"
            @set-mood="setPhotoMood(selectedDate, currentPhoto.id, $event)"
          />
        </div>

        <button
          type="button"
          class="arrow"
          aria-label="Next photo"
          :disabled="photos.length < 2"
          @click="step(1)"
        >
          ›
        </button>
      </div>

      <div class="dots">
        <button
          v-for="(photo, i) in photos"
          :key="photo.id"
          type="button"
          class="dot"
          :class="{ active: i === index }"
          :aria-label="`Go to photo ${i + 1}`"
          @click="index = i"
        ></button>
      </div>

      <p class="position">
        Photo {{ index + 1 }} of {{ photos.length }} · tap photo to read journal
      </p>
    </div>

    <p v-else-if="entries.loading" class="empty">Loading…</p>
    <p v-else-if="!editable" class="empty">No photos were added on this day.</p>
    <p v-else-if="!editable" class="empty">Nothing was written on this day.</p>
    <p v-else class="empty">
      Nothing here yet. Add an entry — a photo is optional, writing is the point.
    </p>
  </div>
</template>

<style scoped>
.photo-journal {
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

h1 {
  font-size: 1.25rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.count {
  font-size: 0.82rem;
  color: var(--color-text-soft);
}

.add-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.file-input {
  display: none;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  margin-bottom: 0.8rem;
}

.banner.error {
  background: rgba(226, 87, 76, 0.12);
  border: 1px solid rgba(226, 87, 76, 0.4);
  color: #c0392b;
}

.banner-close {
  border: none;
  background: none;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.locked-note {
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-soft);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.2rem;
}

.locked-note.warn {
  background: rgba(226, 87, 76, 0.1);
  border-color: rgba(226, 87, 76, 0.35);
  color: #c0392b;
  line-height: 1.6;
}

.locked-note .reason {
  opacity: 0.85;
  font-size: 0.75rem;
}

.day-mood {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.8rem;
  margin: 0.9rem 0 0.2rem;
}

.day-mood-label {
  font-size: 0.82rem;
  color: var(--color-text-soft);
}

.day-mood-picker {
  display: flex;
  gap: 0.35rem;
}

.day-mood-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-bg-card);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  /* Dimmed until picked, so the chosen mood reads at a glance. */
  filter: grayscale(1);
  opacity: 0.55;
  transition:
    filter 0.15s,
    opacity 0.15s;
}

.day-mood-btn:hover:not(:disabled),
.day-mood-btn.active {
  filter: none;
  opacity: 1;
}

/* Locked days still show which mood was picked — the rest just go quiet. */
.day-mood-btn:disabled {
  cursor: default;
}

.day-mood-btn:disabled:not(.active) {
  opacity: 0.3;
}

.viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}

/* Sized from the leftover viewport height rather than a fixed width, so the
   whole card fits on screen without scrolling. The card is 3:4, so its width
   is three-quarters of the height available to it. */
.card-slot {
  flex: 0 1 auto;
  width: clamp(150px, calc((100dvh - 300px) * 0.75), 300px);
  min-width: 0;
}

.arrow {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}

.arrow:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.dots {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.7rem;
}

.dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: var(--color-border);
  cursor: pointer;
}

.dot.active {
  background: var(--accent);
}

.position {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.empty {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  padding: 2rem 0;
}

@media (max-width: 768px) {
  h1 {
    font-size: 1.1rem;
  }

  .stage {
    gap: 0.35rem;
  }

  .arrow {
    width: 32px;
    height: 32px;
    font-size: 1.1rem;
  }

  .toolbar {
    gap: 0.5rem;
  }

  /* Taller allowance: the shell adds top padding for the hamburger button. */
  .card-slot {
    width: clamp(150px, calc((100dvh - 330px) * 0.75), 300px);
  }
}
</style>
