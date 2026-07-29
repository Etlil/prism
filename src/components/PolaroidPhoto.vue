<script setup>
import { ref, nextTick } from 'vue'
import { useMoods } from '@/composables/useMoods'
import { setPhotoMood, setPhotoCaption } from '@/data/fakeEntries'

const { activeMoods } = useMoods()

const props = defineProps({
  photo: { type: Object, required: true },
  journalTitle: { type: String, default: '' },
  journalText: { type: String, default: '' },
})

const emit = defineEmits(['remove', 'save-journal'])

// Local to each card, so flipping one doesn't affect the others.
const flipped = ref(false)
const editing = ref(false)
const titleDraft = ref('')
const draft = ref('')

const editingCaption = ref(false)
const captionDraft = ref('')
const captionInput = ref(null)

async function startCaption() {
  captionDraft.value = props.photo.caption
  editingCaption.value = true
  // The input doesn't exist until Vue re-renders, so focus has to wait a tick.
  await nextTick()
  captionInput.value?.focus()
}

function saveCaption() {
  // The photo object is reactive, so this is enough — same as the mood picker.
  setPhotoCaption(props.photo, captionDraft.value)
  editingCaption.value = false
}

function startEdit() {
  titleDraft.value = props.journalTitle
  draft.value = props.journalText
  editing.value = true
}

function save() {
  // The parent owns the entry data, so the card just reports the new values.
  emit('save-journal', { title: titleDraft.value.trim(), text: draft.value })
  editing.value = false
}

function flipBack() {
  editing.value = false
  flipped.value = false
}

// A fixed tilt per photo (derived from its id, not random per render) so the
// wall looks scattered but doesn't jump around when the list updates.
const tilt = (props.photo.id % 2 === 0 ? 1 : -1) * (1 + ((props.photo.id * 7) % 3))
</script>

<template>
  <figure class="polaroid" :style="{ '--tilt': tilt + 'deg' }">
    <div class="flip-inner" :class="{ flipped }">
      <!-- Front: the photo, its caption, and the mood picker. -->
      <div class="face front">
        <button
          type="button"
          class="photo-btn"
          :aria-label="flipped ? 'Show photo' : 'Read journal entry'"
          @click="flipped = true"
        >
          <img v-if="photo.url" class="photo" :src="photo.url" alt="" />
          <span v-else class="photo" :style="{ background: photo.gradient }"></span>
        </button>

        <input
          v-if="editingCaption"
          ref="captionInput"
          v-model="captionDraft"
          class="caption-input"
          maxlength="40"
          placeholder="Add a title"
          @blur="saveCaption"
          @keydown.enter="saveCaption"
          @keydown.esc="editingCaption = false"
        />
        <button v-else type="button" class="caption" title="Click to rename" @click="startCaption">
          {{ photo.caption || 'Add a title…' }}
        </button>

        <!-- Inside the card frame, below the photo — not overlaying it. -->
        <div class="moods">
          <button
            v-for="mood in activeMoods"
            :key="mood.id"
            type="button"
            class="mood"
            :class="{ active: photo.moodId === mood.id }"
            :title="mood.label"
            @click="setPhotoMood(photo, mood.id)"
          >
            {{ mood.emoji }}
          </button>
        </div>

        <button type="button" class="remove" title="Remove photo" @click="$emit('remove')">×</button>
      </div>

      <!-- Back: the journal entry for the day. -->
      <div class="face back">
        <p v-if="!editing" class="back-title">{{ journalTitle || 'Journal' }}</p>

        <template v-if="editing">
          <input
            v-model="titleDraft"
            class="title-input"
            maxlength="60"
            placeholder="Journal title"
          />
          <textarea
            v-model="draft"
            class="journal-input"
            placeholder="How did this day feel?"
          ></textarea>
          <div class="back-actions">
            <button type="button" class="link-btn" @click="editing = false">Cancel</button>
            <button type="button" class="save-btn" @click="save">Save</button>
          </div>
        </template>

        <template v-else>
          <p class="journal-text">{{ journalText || 'Nothing written for this day yet.' }}</p>
          <div class="back-actions">
            <button type="button" class="link-btn" @click="flipBack">Back</button>
            <button type="button" class="save-btn" @click="startEdit">Edit</button>
          </div>
        </template>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.polaroid {
  perspective: 1200px;
  transform: rotate(var(--tilt));
  transition: transform 0.2s;
}

.polaroid:hover {
  transform: rotate(0deg);
}

.flip-inner {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  transform-style: preserve-3d;
  transition: transform 0.55s ease;
}

.flip-inner.flipped {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
}

.front {
  background: #fdfdfd;
  padding: 8px 8px 6px;
}

.photo-btn {
  flex: 1;
  min-height: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  display: block;
}

/* object-fit keeps uploaded photos from stretching — they fill the frame and
   crop instead. */
.photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 1px;
}

.caption {
  display: block;
  width: 100%;
  padding: 6px 2px 4px;
  border: none;
  background: none;
  text-align: center;
  font-family: inherit;
  font-size: 0.72rem;
  color: #2c2c2c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
  border-radius: 3px;
}

.caption:hover {
  background: #efefef;
}

.caption-input {
  width: 100%;
  margin: 4px 0 2px;
  padding: 2px 4px;
  border: 1px solid #cbb8e0;
  border-radius: 3px;
  background: #fff;
  text-align: center;
  font-family: inherit;
  font-size: 0.72rem;
  color: #2c2c2c;
}

.caption-input:focus {
  outline: none;
  border-color: #a98ac9;
}

.moods {
  display: flex;
  justify-content: center;
  gap: 1px;
  flex-wrap: nowrap;
}

.mood {
  flex: 1 1 0;
  min-width: 0;
  padding: 2px 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  font-size: 0.8rem;
  line-height: 1.3;
  cursor: pointer;
  opacity: 0.4;
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.mood:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.mood.active {
  opacity: 1;
  background: #efeaf5;
  border-color: #cbb8e0;
}

.remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.polaroid:hover .remove {
  opacity: 1;
}

.back {
  transform: rotateY(180deg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 0.9rem;
  gap: 0.4rem;
}

.back-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  font-weight: 700;
}

.journal-text {
  font-size: 0.82rem;
  overflow-y: auto;
  flex: 1;
}

.title-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
}

.title-input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.journal-input {
  flex: 1;
  width: 100%;
  min-height: 0;
  resize: none;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.8rem;
  line-height: 1.5;
}

.journal-input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.back-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

.link-btn,
.save-btn {
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.link-btn {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-soft);
}

.link-btn:hover {
  color: var(--color-text);
}

.save-btn {
  border: none;
  background: var(--accent);
  color: white;
}
</style>
