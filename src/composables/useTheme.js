import { reactive, watch, computed } from 'vue'
import { themes, themeById, defaultThemeId, inkOn } from '@/data/themes'

export { themes }

// Defined outside the function body, so every component that calls useTheme()
// gets the *same* reactive object instead of its own private copy. That's the
// whole trick behind a "store" in Vue before you reach for Pinia: a module-level
// ref/reactive, closed over by the exported functions.
const STORAGE_KEY = 'prism-theme'

// The standalone accent picker is gone — each theme in data/themes.js brings
// its own accent, chosen to work with that theme's background rather than
// being mixed and matched into combinations that clash.

// Applied to the root element, so every rem-based size in the app scales with
// it. Medium is 16px, the browser default, which keeps the current look.
export const fontSizeOptions = [
  { name: 'Small', value: '14px' },
  { name: 'Medium', value: '16px' },
  { name: 'Large', value: '18px' },
]

// First entry is the default for anyone who hasn't picked a font yet.
// The custom families are declared as @font-face rules in assets/base.css.
export const fontOptions = [
  { name: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { name: 'Baby Doll', value: "'Baby Doll', cursive" },
  { name: 'Elegant Bloom', value: "'Elegant Bloom', cursive" },
  { name: 'Internet Friends', value: "'Internet Friends', sans-serif" },
  { name: 'Magic Crush', value: "'Magic Crush', cursive" },
  { name: 'Omori', value: "'Omori', sans-serif" },
]

function loadSaved() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const saved = loadSaved()

const theme = reactive({
  themeId: saved?.themeId ?? defaultThemeId,
  mode: saved?.mode ?? 'light',
  font: saved?.font ?? null, // null = use the theme's own font
  fontSize: saved?.fontSize ?? fontSizeOptions[1].value,
})

function applyToDocument() {
  const root = document.documentElement
  const preset = themeById(theme.themeId)
  const tokens = preset[theme.mode] ?? preset.light

  // data-theme still drives the light/dark switch; the tokens below are what
  // actually repaint the app.
  root.setAttribute('data-theme', theme.mode)
  root.setAttribute('data-preset', preset.id)

  root.style.setProperty('--color-bg', tokens.bg)
  root.style.setProperty('--color-bg-soft', tokens.bgSoft)
  root.style.setProperty('--color-bg-card', tokens.bgCard)
  root.style.setProperty('--color-border', tokens.border)
  root.style.setProperty('--color-text', tokens.text)
  root.style.setProperty('--color-text-soft', tokens.textSoft)
  root.style.setProperty('--accent', tokens.accent)

  // Whatever reads legibly on the accent — white for the dark accents, near
  // black for the pale ones. Buttons use var(--on-accent) instead of assuming
  // white, which was unreadable on every dark theme.
  root.style.setProperty('--on-accent', inkOn(tokens.accent))

  root.style.setProperty('--radius-sm', preset.radius.sm)
  root.style.setProperty('--radius-md', preset.radius.md)
  root.style.setProperty('--radius-lg', preset.radius.lg)

  // An explicit font choice wins; otherwise the theme's own font is used, so
  // picking a theme gives a complete look without extra steps.
  root.style.setProperty('--font-family', theme.font ?? preset.font)
  root.style.setProperty('--font-size-base', theme.fontSize)
}

// Runs once immediately (because `immediate: true`) to paint the saved theme
// on load, then again any time a property on `theme` changes.
watch(theme, () => {
  applyToDocument()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
}, { immediate: true })

export function useTheme() {
  function toggleMode() {
    theme.mode = theme.mode === 'light' ? 'dark' : 'light'
  }

  function setThemeId(id) {
    theme.themeId = id
    // Clearing the font override lets the new theme's own font come through.
    // Picking a font afterwards pins it again.
    theme.font = null
  }

  function setFont(value) {
    theme.font = value
  }

  function setFontSize(value) {
    theme.fontSize = value
  }

  // What the font buttons highlight: the explicit choice, or whatever the
  // current theme supplies.
  const activeFont = computed(() => theme.font ?? themeById(theme.themeId).font)

  return { theme, themes, activeFont, toggleMode, setThemeId, setFont, setFontSize }
}
