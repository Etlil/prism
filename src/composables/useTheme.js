import { reactive, watch } from 'vue'

// Defined outside the function body, so every component that calls useTheme()
// gets the *same* reactive object instead of its own private copy. That's the
// whole trick behind a "store" in Vue before you reach for Pinia: a module-level
// ref/reactive, closed over by the exported functions.
const STORAGE_KEY = 'prism-theme'

export const accentOptions = [
  { name: 'Rose', value: '#e0607e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Sky', value: '#3b82f6' },
]

export const fontOptions = [
  { name: 'System', value: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
  { name: 'Serif', value: "'Iowan Old Style', Georgia, 'Times New Roman', serif" },
  { name: 'Rounded', value: "'Baloo 2', 'Comic Sans MS', ui-rounded, sans-serif" },
  { name: 'Mono', value: "'Cascadia Code', 'Courier New', monospace" },
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
  mode: saved?.mode ?? 'light',
  accent: saved?.accent ?? accentOptions[0].value,
  font: saved?.font ?? fontOptions[0].value,
})

function applyToDocument() {
  const root = document.documentElement
  root.setAttribute('data-theme', theme.mode)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--font-family', theme.font)
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

  function setAccent(value) {
    theme.accent = value
  }

  function setFont(value) {
    theme.font = value
  }

  return { theme, toggleMode, setAccent, setFont }
}
