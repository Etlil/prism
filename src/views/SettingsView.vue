<script setup>
import { useTheme, accentOptions, fontOptions, fontSizeOptions } from '@/composables/useTheme'
import MoodEditor from '@/components/MoodEditor.vue'

const { theme, toggleMode, setAccent, setFont, setFontSize } = useTheme()
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
</style>
