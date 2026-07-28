import { reactive, watch } from 'vue'

// Same module-level-reactive + localStorage pattern as useTheme.js. This
// whole file is a stand-in for Supabase Auth (Phase 5) — once that exists,
// it gets deleted, not migrated.
const STORAGE_KEY = 'prism-users'

// NOT real hashing — no salt, trivially reversible. Real password hashing
// is Supabase Auth's job later. This just keeps a raw password string out
// of localStorage so it isn't sitting there human-readable.
function hashFake(password) {
  let hash = 0
  for (const char of password) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash.toString(16)
}

function loadSaved() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export const users = reactive(loadSaved())

watch(
  users,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  },
  { deep: true },
)

export function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase()
  return users.find((u) => u.email.toLowerCase() === normalized)
}

export function addUser({ username, email, password }) {
  if (findUserByEmail(email)) return null

  const user = { username: username.trim(), email: email.trim(), password: hashFake(password) }
  users.push(user)
  return user
}

export function verifyPassword(user, password) {
  return user.password === hashFake(password)
}
