import { reactive, readonly } from 'vue'
import { findUserByEmail, addUser, verifyPassword } from '@/data/fakeUsers'

// Same module-level-state trick as useTheme. The user *directory* now lives
// in fakeUsers.js (and persists), but the *session* here stays in-memory —
// closing the tab or logging out should not silently log you back in.
const state = reactive({
  isLoggedIn: false,
  currentUser: null, // { username, email } | null
})

export function useAuth() {
  function login(email, password) {
    const user = findUserByEmail(email)
    if (!user || !verifyPassword(user, password)) {
      return { success: false, error: 'Invalid email or password' }
    }
    state.currentUser = { username: user.username, email: user.email }
    state.isLoggedIn = true
    return { success: true }
  }

  function signup(username, email, password) {
    if (!username.trim() || !email.trim() || !password) {
      return { success: false, error: 'All fields are required' }
    }
    const user = addUser({ username, email, password })
    if (!user) {
      return { success: false, error: 'Email already registered' }
    }
    state.currentUser = { username: user.username, email: user.email }
    state.isLoggedIn = true
    return { success: true }
  }

  function logout() {
    state.isLoggedIn = false
    state.currentUser = null
  }

  // readonly() so components can read auth.isLoggedIn but can't do
  // auth.isLoggedIn = true directly — they have to go through login()/logout().
  return { auth: readonly(state), login, signup, logout }
}
