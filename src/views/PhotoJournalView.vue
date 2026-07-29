<script setup>
import { ref, computed, watch } from 'vue'
import DateStrip from '@/components/DateStrip.vue'
import PolaroidPhoto from '@/components/PolaroidPhoto.vue'
import { getEntry, addPhotos, removePhoto, setJournal, MAX_PHOTOS } from '@/data/fakeEntries'
import { toIsoDate } from '@/lib/dates'

const selectedDate = ref(toIsoDate(new Date()))
const fileInput = ref(null)
const index = ref(0)

const entry = computed(() => getEntry(selectedDate.value))
const photos = computed(() => entry.value?.photos ?? [])
const remaining = computed(() => MAX_PHOTOS - photos.value.length)
const currentPhoto = computed(() => photos.value[index.value])

// Start from the first photo whenever the day changes.
watch(selectedDate, () => (index.value = 0))

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

function handleFiles(event) {
  addPhotos(selectedDate.value, event.target.files)
  // Clearing lets the same file be picked again if it was removed.
  event.target.value = ''
}
</script>

<template>
  <div class="photo-journal">
    <header class="page-header">
      <h1>Photo Journal</h1>
      <div class="toolbar">
        <p class="count">{{ photos.length }}/{{ MAX_PHOTOS }}</p>
        <button type="button" class="add-btn" :disabled="remaining === 0" @click="fileInput.click()">
          {{ remaining === 0 ? 'Limit reached' : 'Add photos' }}
        </button>
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleFiles"
        />
      </div>
    </header>

    <DateStrip v-model="selectedDate" />

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
            :journal-title="entry.journalTitle"
            :journal-text="entry.journalText"
            @remove="removePhoto(selectedDate, currentPhoto.id)"
            @save-journal="setJournal(selectedDate, $event)"
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

    <p v-else class="empty">No photos for this day yet. Add up to {{ MAX_PHOTOS }}.</p>
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
  color: white;
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
