<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useMoods } from '@/composables/useMoods'

const {
  moods,
  activeMoods,
  loadMoods,
  createMood,
  updateMood,
  archiveMood,
  restoreMood,
  reorderMoods,
  clearError,
} = useMoods()

// Editable copies of each row. The composable hands back readonly state, and
// typing straight into it would fight the server anyway — so each row gets a
// draft, and we only save when the field is left.
const drafts = reactive({})
const showArchived = ref(false)

const newMood = reactive({ label: '', emoji: '🙂', colorHex: '#ebb0ff' })
const adding = ref(false)

const archived = computed(() => moods.all.filter((m) => m.is_archived))

watch(
  () => moods.all,
  (list) => {
    for (const mood of list) {
      drafts[mood.id] = {
        label: mood.label,
        emoji: mood.emoji,
        color_hex: mood.color_hex,
      }
    }
  },
  { immediate: true, deep: true },
)

onMounted(loadMoods)

// Reverts the row to whatever the database actually holds — used when a save
// is rejected, so the input never shows a value that wasn't stored.
function resetDraft(mood) {
  drafts[mood.id] = {
    label: mood.label,
    emoji: mood.emoji,
    color_hex: mood.color_hex,
  }
}

async function saveField(mood, field) {
  const draft = drafts[mood.id]
  if (!draft || draft[field] === mood[field]) return

  const result = await updateMood(mood.id, { [field]: draft[field] })
  if (!result.success) resetDraft(mood)
}

// Holds the mood awaiting confirmation. Null means the dialog is closed.
const pendingDelete = ref(null)

// Bound to the window rather than the dialog, because a plain div can't receive
// key events unless it's focusable.
function onKeydown(event) {
  if (event.key === 'Escape') pendingDelete.value = null
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function confirmDelete() {
  const mood = pendingDelete.value
  pendingDelete.value = null
  await archiveMood(mood.id)
}

async function handleAdd() {
  adding.value = true
  const result = await createMood(newMood)
  adding.value = false

  if (result.success) {
    newMood.label = ''
    newMood.emoji = '🙂'
    newMood.colorHex = '#b19cd9'
  }
}

// --- Drag to reorder -------------------------------------------------------
// Pointer events rather than HTML5 drag-and-drop, because the latter doesn't
// fire on touchscreens and this app is heading to phones via Capacitor.

// The list keeps its DOM order for the whole drag. Nothing is actually
// reordered until you let go — the movement you see is CSS transforms, which
// is what makes it slide instead of jump.
const rowsEl = ref(null)
const dragId = ref(null)
const fromIndex = ref(-1)
const toIndex = ref(-1)
const dragOffset = ref(0)
const settling = ref(false)
const settleFrom = ref(0)
const settleTo = ref(0)

// Plain variables, not refs: nothing in the template reads them.
let startY = 0
let rowStep = 0

function startDrag(event, mood, index) {
  dragId.value = mood.id
  fromIndex.value = index
  toIndex.value = index
  dragOffset.value = 0
  startY = event.clientY

  // Distance from one row's top to the next, so gaps are included. Measured
  // once per drag rather than per move.
  const rows = [...rowsEl.value.querySelectorAll('.row')]
  const first = rows[0].getBoundingClientRect()
  rowStep = rows.length > 1 ? rows[1].getBoundingClientRect().top - first.top : first.height + 6

  // Keeps events coming to this handle even if the pointer outruns it.
  event.currentTarget.setPointerCapture(event.pointerId)
}

function onDrag(event) {
  if (!dragId.value) return

  dragOffset.value = event.clientY - startY

  // How many slots the row has travelled, rounded so it settles into place.
  const moved = Math.round(dragOffset.value / rowStep)
  const last = activeMoods.value.length - 1
  toIndex.value = Math.min(last, Math.max(0, fromIndex.value + moved))
}

// Matches the mood-drop keyframes below.
const SETTLE_MS = 340

async function endDrag() {
  if (!dragId.value || settling.value) return

  const list = [...activeMoods.value]
  const [held] = list.splice(fromIndex.value, 1)
  list.splice(toIndex.value, 0, held)
  const orderedIds = list.map((m) => m.id)

  // Hand the start and end positions to the keyframes as custom properties, so
  // the landing animation can drop the row into its slot and squash it in one
  // transform instead of fighting an inline one.
  settleFrom.value = dragOffset.value
  settleTo.value = (toIndex.value - fromIndex.value) * rowStep
  settling.value = true
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))

  // reorderMoods reorders the local list synchronously before it awaits the
  // network, so the new order and the cleared transforms land in the same
  // render — the row stays exactly where it settled instead of snapping back.
  // Dropping `dragging` in that same render also removes the transitions, so
  // the rows that had shifted aside just appear in place.
  const saved = reorderMoods(orderedIds)

  settling.value = false
  dragId.value = null
  dragOffset.value = 0
  fromIndex.value = -1
  toIndex.value = -1

  await saved
}

// The held row tracks the pointer exactly; the rows it passes slide one slot
// up or down to open a gap for it.
function rowStyle(index, mood) {
  if (!dragId.value) return null

  if (mood.id === dragId.value) {
    if (settling.value) {
      return { '--from': `${settleFrom.value}px`, '--to': `${settleTo.value}px` }
    }
    return { transform: `translateY(${dragOffset.value}px)` }
  }

  const from = fromIndex.value
  const to = toIndex.value
  let shift = 0

  if (from < to && index > from && index <= to) shift = -rowStep
  else if (from > to && index >= to && index < from) shift = rowStep

  return shift ? { transform: `translateY(${shift}px)` } : null
}
</script>

<template>
  <div class="mood-editor">
    <p v-if="moods.error" class="banner error">
      {{ moods.error }}
      <button type="button" class="banner-close" @click="clearError">×</button>
    </p>

    <p v-if="moods.loading" class="state">Loading your moods…</p>

    <template v-else>
      <ul ref="rowsEl" class="rows" :class="{ dragging: dragId }">
        <li
          v-for="(mood, i) in activeMoods"
          :key="mood.id"
          class="row"
          :class="{ held: mood.id === dragId, settling }"
          :style="rowStyle(i, mood)"
        >
          <!-- v-if guards against a row rendering before its draft exists,
               which would otherwise throw and blank the whole section. -->
          <template v-if="drafts[mood.id]">
          <input
            v-model="drafts[mood.id].emoji"
            class="emoji-input"
            maxlength="4"
            aria-label="Emoji"
            @blur="saveField(mood, 'emoji')"
          />

          <input
            v-model="drafts[mood.id].label"
            class="label-input"
            maxlength="40"
            aria-label="Mood name"
            @blur="saveField(mood, 'label')"
            @keydown.enter="$event.target.blur()"
          />

          <input
            v-model="drafts[mood.id].color_hex"
            type="color"
            class="color-input"
            aria-label="Colour"
            @change="saveField(mood, 'color_hex')"
          />

          <div class="row-actions">
            <button
              type="button"
              class="icon-btn danger"
              title="Delete"
              :disabled="moods.saving"
              @click="pendingDelete = mood"
            >
              🗑
            </button>

            <!-- touch-action: none in the CSS is what stops a drag on a phone
                 from scrolling the page instead of moving the row. -->
            <span
              class="grip"
              title="Drag to reorder"
              @pointerdown="startDrag($event, mood, i)"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
            >
              ⠿
            </span>
          </div>
          </template>
        </li>
      </ul>

      <p v-if="!activeMoods.length" class="state">
        No moods loaded.
        <button type="button" class="toggle" @click="loadMoods({ force: true })">Retry</button>
      </p>

      <form class="add-row" @submit.prevent="handleAdd">
        <input v-model="newMood.emoji" class="emoji-input" maxlength="4" aria-label="New emoji" />
        <input
          v-model="newMood.label"
          class="label-input"
          maxlength="40"
          placeholder="New mood name"
          aria-label="New mood name"
        />
        <input v-model="newMood.colorHex" type="color" class="color-input" aria-label="New colour" />
        <button type="submit" class="add-btn" :disabled="adding || !newMood.label.trim()">
          {{ adding ? 'Adding…' : 'Add' }}
        </button>
      </form>

      <div v-if="archived.length" class="archived">
        <button type="button" class="toggle" @click="showArchived = !showArchived">
          {{ showArchived ? 'Hide' : 'Show' }} archived ({{ archived.length }})
        </button>

        <ul v-if="showArchived" class="rows">
          <li v-for="mood in archived" :key="mood.id" class="row archived-row">
            <span class="emoji-static">{{ mood.emoji }}</span>
            <span class="label-static">{{ mood.label }}</span>
            <span class="swatch" :style="{ background: mood.color_hex }"></span>
            <button
              type="button"
              class="restore-btn"
              :disabled="moods.saving"
              @click="restoreMood(mood.id)"
            >
              Restore
            </button>
          </li>
        </ul>

        <p v-if="showArchived" class="hint">
          Archived moods stay on old entries so past pixels keep their colour.
        </p>
      </div>
    </template>

    <!-- Confirmation before deleting a mood. -->
    <div
      v-if="pendingDelete"
      class="overlay"
      @click.self="pendingDelete = null"
    >
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h3 id="delete-title" class="dialog-title">
          Delete {{ pendingDelete.emoji }} {{ pendingDelete.label }}?
        </h3>
        <p class="dialog-body">
          It will be removed from your mood pickers. Days you already tagged with it keep their
          colour, and you can restore it later from the archived list.
        </p>
        <div class="dialog-actions">
          <button type="button" class="link-btn" @click="pendingDelete = null">Cancel</button>
          <button type="button" class="danger-btn" :disabled="moods.saving" @click="confirmDelete">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mood-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
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

.state {
  font-size: 0.85rem;
  color: var(--color-text-soft);
  padding: 0.5rem 0;
}

.rows {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.row,
.add-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
}

.add-row {
  border-style: dashed;
}

.emoji-input,
.label-input {
  padding: 0.4rem 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
}

.emoji-input {
  width: 2.6rem;
  text-align: center;
  flex-shrink: 0;
}

.label-input {
  flex: 1;
  min-width: 0;
}

.emoji-input:hover,
.label-input:hover {
  border-color: var(--color-border);
}

.emoji-input:focus,
.label-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--color-bg);
}

.color-input {
  width: 34px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}

.grip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-soft);
  font-size: 1rem;
  line-height: 1;
  cursor: grab;
  /* Without this a drag on a touchscreen scrolls the page instead. */
  touch-action: none;
  user-select: none;
}

.grip:hover {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.grip:active {
  cursor: grabbing;
}

/* Stops text selecting as the pointer sweeps across other rows mid-drag. */
.rows.dragging {
  user-select: none;
}


.row {
  position: relative;
}

/* Scoped to an active drag on purpose. Outside one there is no transition at
   all, so when the drop clears every transform and the list reorders in the
   same render, the rows simply appear in their final places — there is no
   transition left to fire and nothing to race against. */
.rows.dragging .row {
  transition: transform 0.18s cubic-bezier(0.2, 0, 0.2, 1);
}

/* The held row tracks the pointer, so it must not lag behind a transition. */
.rows.dragging .row.held {
  transition: none;
}

.row.held {
  z-index: 2;
  border-color: var(--accent);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

/* On release the row lands: it drops into its slot, squashes on impact, then
   rebounds past its size before settling. A CSS animation beats an inline
   style, which is why the travel is baked into the keyframes via --from/--to
   rather than left on the element's own transform. */
.row.held.settling {
  transition: none;
  animation: mood-drop 0.34s cubic-bezier(0.25, 0.1, 0.25, 1);
}

@keyframes mood-drop {
  0% {
    transform: translateY(var(--from)) scale(1.02);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  }
  45% {
    transform: translateY(var(--to)) scale(0.93);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  72% {
    transform: translateY(var(--to)) scale(1.05);
  }
  100% {
    transform: translateY(var(--to)) scale(1);
    box-shadow: none;
  }
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.icon-btn.danger:hover:not(:disabled) {
  border-color: #e2574c;
}

.add-btn {
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.archived {
  margin-top: 0.5rem;
}

.toggle {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.3rem 0;
}

.archived-row {
  opacity: 0.7;
}

.emoji-static {
  width: 2.6rem;
  text-align: center;
  flex-shrink: 0;
}

.label-static {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
}

.swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.restore-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.restore-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}

.dialog {
  width: min(340px, 100%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}

.dialog-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.dialog-body {
  font-size: 0.83rem;
  color: var(--color-text-soft);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.1rem;
}

.link-btn {
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
}

.link-btn:hover {
  border-color: var(--color-text-soft);
}

.danger-btn {
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: var(--radius-sm);
  background: #e2574c;
  color: white;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.danger-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
