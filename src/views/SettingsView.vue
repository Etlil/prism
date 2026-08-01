<script setup>
import { ref, watch } from 'vue'
import { useTheme, accentOptions, fontOptions, fontSizeOptions } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'
import MoodEditor from '@/components/MoodEditor.vue'
import JournalPrivacy from '@/components/JournalPrivacy.vue'

const { theme, toggleMode, setAccent, setFont, setFontSize } = useTheme()
const { auth, displayName, updateDisplayName } = useAuth()

// A draft copy, same idea as MoodEditor: auth state is readonly, and we only
// want to write when Save is pressed. It starts empty because the profile may
// still be loading when this view mounts — the watch fills it in.
const nameDraft = ref('')
const saving = ref(false)
const nameError = ref('')
const savedNote = ref(false)

watch(displayName, (name) => (nameDraft.value = name), { immediate: true })

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
      <h2>Accent color</h2>
      <div class="swatches">
        <button
          v-for="a in accentOptions"
          :key="a.value"
          type="button"
          class="swatch"
          :class="{ selected: theme.accent === a.value }"
          :style="{ background: a.value }"
          :aria-label="a.name"
          @click="setAccent(a.value)"
        ></button>
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
          :class="{ selected: theme.font === f.value }"
          :style="{ fontFamily: f.value }"
          @click="setFont(f.value)"
        >
          {{ f.name }}
        </button>
      </div>
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

.swatches {
  display: flex;
  gap: 0.75rem;
}

.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.swatch.selected {
  border-color: var(--color-text);
  box-shadow: 0 0 0 2px var(--color-bg);
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
  color: white;
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
</style>
