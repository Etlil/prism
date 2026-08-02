<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme, fontOptions, fontSizeOptions } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'
import MoodEditor from '@/components/MoodEditor.vue'
import JournalPrivacy from '@/components/JournalPrivacy.vue'
import { useReminders } from '@/composables/useReminders'

const { theme, themes, activeFont, toggleMode, setThemeId, setFont, setFontSize } = useTheme()
const { auth, displayName, updateDisplayName, deleteAccount } = useAuth()
const router = useRouter()
const { reminders, REMINDERS, setRemindersEnabled } = useReminders()

const reminderError = ref('')

async function toggleReminders() {
  reminderError.value = ''
  const ok = await setRemindersEnabled(!reminders.enabled)
  if (!ok) {
    reminderError.value =
      'Android blocked notifications for Prism. Turn them on in your phone settings: Apps → Prism → Notifications.'
  }
}

// 24h → "6:00 PM"
function formatTime({ hour, minute }) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${String(minute).padStart(2, '0')} ${suffix}`
}

// A draft copy, same idea as MoodEditor: auth state is readonly, and we only
// want to write when Save is pressed. It starts empty because the profile may
// still be loading when this view mounts — the watch fills it in.
const nameDraft = ref('')
const saving = ref(false)
const nameError = ref('')
const savedNote = ref(false)

watch(displayName, (name) => (nameDraft.value = name), { immediate: true })

// --- Delete account --------------------------------------------------------
// Two steps, and the second needs the email typed exactly. A plain "are you
// sure?" is one reflex click away from destroying everything, and there is no
// undo for this.
const confirmingDelete = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)
const deleteError = ref('')

const canDelete = computed(
  () => deleteConfirmText.value.trim().toLowerCase() === (auth.user?.email ?? '').toLowerCase(),
)

async function handleDeleteAccount() {
  deleting.value = true
  deleteError.value = ''

  const result = await deleteAccount()
  deleting.value = false

  if (!result.success) {
    deleteError.value = result.error
    return
  }
  router.replace({ name: 'login' })
}

async function saveName() {
  saving.value = true
  nameError.value = ''
  savedNote.value = false

  const result = await updateDisplayName(nameDraft.value)
  saving.value = false

  if (result.success) {
    savedNote.value = true
    setTimeout(() => (savedNote.value = false), 2000)
  } else {
    nameError.value = result.error
    nameDraft.value = displayName.value
  }
}
</script>

<template>
  <div class="settings">
    <header class="page-header">
      <h1>Settings</h1>
      <p class="subtitle">Changes apply immediately and are remembered next time.</p>
    </header>

    <section class="group">
      <h2>Moods</h2>
      <p class="group-note">
        Your mood list. Renaming or recolouring one updates every pixel that uses it.
      </p>
      <MoodEditor />
    </section>

    <section class="group">
      <h2>Appearance</h2>
      <div class="mode-toggle">
        <span>{{ theme.mode === 'dark' ? 'Dark mode' : 'Light mode' }}</span>
        <button
          type="button"
          class="switch"
          :class="{ on: theme.mode === 'dark' }"
          role="switch"
          :aria-checked="theme.mode === 'dark'"
          @click="toggleMode"
        >
          <span class="knob"></span>
        </button>
      </div>
    </section>

    <section class="group">
      <h2>Theme</h2>
      <p class="group-note">
        Each theme changes the whole look — colours, corners and lettering. The light/dark switch
        above works with all of them.
      </p>

      <div class="themes">
        <button
          v-for="t in themes"
          :key="t.id"
          type="button"
          class="theme-card"
          :class="{ selected: theme.themeId === t.id }"
          @click="setThemeId(t.id)"
        >
          <!-- A miniature of the theme, painted in its own tokens rather than
               a flat swatch, so the card shows what you'd actually get. -->
          <span
            class="preview"
            :style="{
              background: t[theme.mode].bg,
              borderColor: t[theme.mode].border,
              borderRadius: t.radius.sm,
            }"
          >
            <span
              class="preview-card"
              :style="{ background: t[theme.mode].bgCard, borderRadius: t.radius.sm }"
            >
              <span class="preview-line" :style="{ background: t[theme.mode].text }"></span>
              <span class="preview-line short" :style="{ background: t[theme.mode].textSoft }"></span>
            </span>
            <span
              class="preview-dot"
              :style="{ background: t[theme.mode].accent, borderRadius: t.radius.sm }"
            ></span>
          </span>

          <span class="theme-name" :style="{ fontFamily: t.font }">{{ t.name }}</span>
          <span class="theme-blurb">{{ t.blurb }}</span>
        </button>
      </div>
    </section>

    <section class="group">
      <h2>Font size</h2>
      <div class="sizes">
        <button
          v-for="size in fontSizeOptions"
          :key="size.value"
          type="button"
          class="size-option"
          :class="{ selected: theme.fontSize === size.value }"
          @click="setFontSize(size.value)"
        >
          {{ size.name }}
        </button>
      </div>
    </section>

    <section class="group">
      <h2>Font</h2>
      <div class="fonts">
        <button
          v-for="f in fontOptions"
          :key="f.value"
          type="button"
          class="font-option"
          :class="{ selected: activeFont === f.value }"
          :style="{ fontFamily: f.value }"
          @click="setFont(f.value)"
        >
          {{ f.name }}
        </button>
      </div>
    </section>

    <section class="group">
      <h2>Streak reminders</h2>

      <template v-if="reminders.supported">
        <div class="mode-toggle">
          <span>{{ reminders.enabled ? 'Reminders on' : 'Reminders off' }}</span>
          <button
            type="button"
            class="switch"
            :class="{ on: reminders.enabled }"
            role="switch"
            :aria-checked="reminders.enabled"
            @click="toggleReminders"
          >
            <span class="knob"></span>
          </button>
        </div>

        <ul class="reminder-list">
          <li v-for="r in REMINDERS" :key="r.slot">
            <span class="reminder-time">{{ formatTime(r) }}</span>
            <span class="reminder-body">“{{ r.body }}”</span>
          </li>
        </ul>

        <p class="group-note reminder-note">
          Only on days you haven't logged yet — once you record a mood, the rest of that night's
          reminders are cancelled.
        </p>
        <p v-if="reminderError" class="field-error">{{ reminderError }}</p>
      </template>

      <p v-else class="group-note reminder-note">
        Reminders only work in the installed Android app, not in a browser tab.
      </p>
    </section>

    <section class="group">
      <h2>Journal privacy</h2>
      <JournalPrivacy />
    </section>

    <section class="group">
      <h2>Account</h2>

      <div class="account">
        <label class="field">
          <span class="field-label">Display name</span>
          <div class="field-row">
            <input
              v-model="nameDraft"
              class="text-input"
              maxlength="40"
              autocomplete="nickname"
              @keydown.enter="saveName"
            />
            <button
              type="button"
              class="save-btn"
              :disabled="saving || !nameDraft.trim() || nameDraft.trim() === displayName"
              @click="saveName"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p v-if="nameError" class="field-error">{{ nameError }}</p>
          <p v-else-if="savedNote" class="field-ok">Saved.</p>
          <p v-else class="field-hint">This is the name shown in the greeting.</p>
        </label>

        <label class="field">
          <span class="field-label">Email</span>
          <input class="text-input" :value="auth.user?.email ?? ''" disabled />
        </label>
      </div>
    </section>

    <section class="group danger-zone">
      <h2>Delete account</h2>

      <template v-if="!confirmingDelete">
        <p class="danger-note">
          Permanently removes your account, every entry, every photo and every journal you've
          written. This cannot be undone and there is no backup.
        </p>
        <button type="button" class="danger-btn" @click="confirmingDelete = true">
          Delete my account
        </button>
      </template>

      <template v-else>
        <p class="danger-note strong">
          This will delete <strong>{{ auth.user?.email }}</strong> and everything in it:
        </p>
        <ul class="danger-list">
          <li>Every day you've logged and its moods</li>
          <li>Every photo you've uploaded</li>
          <li>Everything you've written in your journals</li>
          <li>Your custom moods and settings</li>
        </ul>
        <p class="danger-note">
          Type <strong>{{ auth.user?.email }}</strong> below to confirm.
        </p>

        <input
          v-model="deleteConfirmText"
          class="text-input"
          placeholder="Type your email"
          autocomplete="off"
          spellcheck="false"
        />

        <div class="danger-actions">
          <button
            type="button"
            class="cancel-btn"
            @click="confirmingDelete = false; deleteConfirmText = ''; deleteError = ''"
          >
            Cancel
          </button>
          <button
            type="button"
            class="danger-btn"
            :disabled="!canDelete || deleting"
            @click="handleDeleteAccount"
          >
            {{ deleting ? 'Deleting…' : 'Delete forever' }}
          </button>
        </div>

        <p v-if="deleteError" class="field-error">{{ deleteError }}</p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: 560px;
}

.page-header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.6rem;
}

.subtitle {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.group {
  margin-bottom: 2rem;
}

.group h2 {
  font-size: 0.95rem;
  margin-bottom: 0.9rem;
}

.group-note {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  margin: -0.6rem 0 0.8rem;
}

.mode-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.9rem 1.1rem;
}

.switch {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  position: relative;
  cursor: pointer;
  padding: 0;
}

.switch.on {
  background: var(--accent);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}

.switch.on .knob {
  transform: translateX(20px);
}

.reminder-list {
  list-style: none;
  padding: 0;
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.reminder-list li {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.82rem;
}

.reminder-time {
  min-width: 4.6rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.reminder-body {
  color: var(--color-text-soft);
}

.reminder-note {
  margin: 0.7rem 0 0;
}

.themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.2rem;
  padding: 0.6rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.theme-card:hover {
  border-color: var(--color-text-soft);
}

.theme-card.selected {
  border-color: var(--accent);
}

/* Painted in the theme's own tokens, so the card is a real sample rather than
   a coloured square. */
.preview {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 46px;
  padding: 7px;
  border: 1px solid;
  margin-bottom: 0.4rem;
  overflow: hidden;
}

.preview-card {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.preview-line {
  height: 3px;
  border-radius: 2px;
  width: 100%;
}

.preview-line.short {
  width: 60%;
}

.preview-dot {
  width: 14px;
  height: 100%;
  flex-shrink: 0;
}

.theme-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.theme-blurb {
  font-size: 0.7rem;
  color: var(--color-text-soft);
  line-height: 1.35;
}

.sizes {
  display: flex;
  gap: 0.5rem;
}

.size-option {
  flex: 1;
  padding: 0.7rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 0.95rem;
  cursor: pointer;
}

.size-option.selected {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.fonts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.font-option {
  text-align: left;
  padding: 0.7rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
}

.font-option.selected {
  border-color: var(--accent);
  color: var(--accent);
}

.account {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.field-row {
  display: flex;
  gap: 0.5rem;
}

.text-input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.95rem;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.text-input:disabled {
  opacity: 0.6;
  cursor: default;
}

.save-btn {
  padding: 0.45rem 1.1rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.field-hint,
.field-ok,
.field-error {
  font-size: 0.75rem;
}

.field-hint {
  color: var(--color-text-soft);
}

.field-ok {
  color: var(--accent);
}

.field-error {
  color: #c0392b;
}

/* Visually separated from the rest of Settings — this is not a preference. */
.danger-zone {
  border: 1px solid rgba(226, 87, 76, 0.4);
  border-radius: var(--radius-md);
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.7rem;
}

.danger-zone h2 {
  color: #c0392b;
  margin-bottom: 0;
}

.danger-note {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  line-height: 1.55;
}

.danger-note.strong {
  color: var(--color-text);
}

.danger-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.danger-list li::before {
  content: '– ';
}

.danger-zone .text-input {
  width: 100%;
  max-width: 320px;
}

.danger-actions {
  display: flex;
  gap: 0.5rem;
}

.danger-btn {
  padding: 0.55rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  background: #c0392b;
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.danger-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.cancel-btn {
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-text-soft);
}
</style>
