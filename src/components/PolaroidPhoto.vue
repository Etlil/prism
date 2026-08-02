<script setup>
import { ref, computed, nextTick } from 'vue'
import { useMoods } from '@/composables/useMoods'

const { activeMoods } = useMoods()

const props = defineProps({
  photo: { type: Object, required: true },
  journalTitle: { type: String, default: '' },
  journalText: { type: String, default: '' },
  // Past and future days can be read but not changed. The card still flips so
  // old entries stay browsable.
  readonly: { type: Boolean, default: false },
  // The journal text is encrypted and the vault hasn't been unlocked this
  // session. Distinct from "nothing written yet".
  journalLocked: { type: Boolean, default: false },
  uploading: { type: Boolean, default: false },
})

// A card can exist with no picture — some days there's nothing to photograph
// and plenty to say.
const hasPhoto = computed(() => !!props.photo.storage_path)

// The card no longer writes anything itself — saving goes through the network,
// so the page that owns the data does it and this component just reports what
// was clicked.
const emit = defineEmits(['remove', 'save-journal', 'set-caption', 'set-mood', 'add-photo'])

// Local to each card, so flipping one doesn't affect the others.
const flipped = ref(false)
const editing = ref(false)
const titleDraft = ref('')
const draft = ref('')

const editingCaption = ref(false)
const captionDraft = ref('')
const captionInput = ref(null)

async function startCaption() {
  if (props.readonly) return
  captionDraft.value = props.photo.caption ?? ''
  editingCaption.value = true
  // The input doesn't exist until Vue re-renders, so focus has to wait a tick.
  await nextTick()
  captionInput.value?.focus()
}

function saveCaption() {
  emit('set-caption', captionDraft.value)
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
// wall looks scattered but doesn't jump around when the list updates. Ids are
// uuids now, so the arithmetic runs on a hash of the string rather than the
// id itself — `'abc' % 2` is NaN, which would silently drop the rotation.
function hash(text) {
  let value = 0
  for (const char of String(text)) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

const seed = hash(props.photo.id)
const tilt = (seed % 2 === 0 ? 1 : -1) * (1 + (seed % 3))
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
          <!-- The bucket is private, so photo.url is a signed link that arrives
               a moment after the row does. The pulse covers that gap. -->
          <img v-if="photo.url" class="photo" :src="photo.url" alt="" />
          <span v-else-if="hasPhoto" class="photo photo-loading"></span>

          <!-- No picture on this card. Tapping still flips to the journal;
               the button below is what adds an image. -->
          <span v-else class="photo photo-empty">
            <span class="empty-mark">✎</span>
            <span class="empty-text">Tap to write</span>
          </span>
        </button>

        <button
          v-if="!hasPhoto && !readonly"
          type="button"
          class="attach"
          :disabled="uploading"
          @click="$emit('add-photo')"
        >
          {{ uploading ? 'Uploading…' : '+ Add a photo' }}
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
        <button
          v-else
          type="button"
          class="caption"
          :class="{ locked: readonly }"
          :title="readonly ? '' : 'Click to rename'"
          :disabled="readonly"
          @click="startCaption"
        >
          {{ photo.caption || (readonly ? '' : 'Add a title…') }}
        </button>

        <!-- Inside the card frame, below the photo — not overlaying it. On a
             locked day the moods still show which was picked, just unclickable. -->
        <div class="moods">
          <button
            v-for="mood in activeMoods"
            :key="mood.id"
            type="button"
            class="mood"
            :class="{ active: photo.mood_id === mood.id }"
            :title="mood.label"
            :disabled="readonly"
            @click="$emit('set-mood', mood.id)"
          >
            {{ mood.emoji }}
          </button>
        </div>

        <button
          v-if="!readonly"
          type="button"
          class="remove"
          title="Remove photo"
          @click="$emit('remove')"
        >
          ×
        </button>
      </div>

      <!-- Back: the journal entry for the day. -->
      <div class="face back">
        <p v-if="!editing" class="back-title">
          {{ journalLocked ? '🔒 Locked' : journalTitle || 'Journal' }}
        </p>

        <template v-if="editing && !readonly">
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
          <p v-if="journalLocked" class="journal-text muted">
            Unlock your journal with your passphrase to read this.
          </p>
          <p v-else class="journal-text">
            {{ journalText || 'Nothing written for this day yet.' }}
          </p>
          <div class="back-actions">
            <button type="button" class="link-btn" @click="flipBack">Back</button>
            <!-- Editing while locked would overwrite text that can't be read. -->
            <button
              v-if="!readonly && !journalLocked"
              type="button"
              class="save-btn"
              @click="startEdit"
            >
              Edit
            </button>
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

.journal-text.muted {
  opacity: 0.65;
  font-style: italic;
}

/* On a locked day the controls stay visible but inert — the point is to show
   what was recorded, not to hide that anything is there. */
.mood:disabled {
  cursor: default;
}

.mood:disabled:not(.active) {
  opacity: 0.3;
}

.caption.locked {
  cursor: default;
  /* Keeps the row's height when there is no caption, so the card doesn't
     change shape between an empty locked day and a filled one. */
  min-height: 1.2em;
}

/* A card with nothing attached. Dashed so it reads as a slot rather than a
   broken image. */
.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #f4f2ef;
  border: 2px dashed #cfc9c2;
  color: #a39b92;
}

.empty-mark {
  font-size: 26px;
  line-height: 1;
}

.empty-text {
  font-size: 11px;
  letter-spacing: 0.02em;
}

.attach {
  margin-top: 4px;
  padding: 5px 8px;
  border: 1px solid #d8d3cc;
  border-radius: 4px;
  background: #fdfdfd;
  color: #6b635a;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.attach:hover:not(:disabled) {
  border-color: #b7afa4;
  color: #3f3931;
}

.attach:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Shown while the signed URL is being fetched. */
.photo-loading {
  background: #ebebeb;
  animation: photo-pulse 1.2s ease-in-out infinite;
}

@keyframes photo-pulse {
  50% {
    background: #f5f5f5;
  }
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
  color: var(--on-accent);
}
</style>
