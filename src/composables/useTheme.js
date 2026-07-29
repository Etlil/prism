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
  mode: saved?.mode ?? 'light',
  accent: saved?.accent ?? accentOptions[0].value,
  font: saved?.font ?? fontOptions[0].value,
  fontSize: saved?.fontSize ?? fontSizeOptions[1].value,
})

function applyToDocument() {
  const root = document.documentElement
  root.setAttribute('data-theme', theme.mode)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--font-family', theme.font)
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

  function setAccent(value) {
    theme.accent = value
  }

  function setFont(value) {
    theme.font = value
  }

  function setFontSize(value) {
    theme.fontSize = value
  }

  return { theme, toggleMode, setAccent, setFont, setFontSize }
}
