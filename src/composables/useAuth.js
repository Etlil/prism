import { reactive, readonly, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const state = reactive({
  isLoggedIn: false,
  user: null, // { id, email } from Supabase Auth
  profile: null, // the matching row from the `profiles` table
})

async function loadProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  state.profile = error ? null : data
}

async function applySession(session) {
  if (session?.user) {
    state.isLoggedIn = true
    state.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.user_metadata?.username || '',
    }
    await loadProfile(session.user.id)
  } else {
    state.isLoggedIn = false
    state.user = null
    state.profile = null
  }
}

// Supabase stores the session in localStorage and reads it back
// asynchronously, so on a fresh page load we have to wait for this before
// deciding whether someone is logged in. The router guard awaits it.
export const authReady = supabase.auth.getSession().then(({ data }) => applySession(data.session))

supabase.auth.onAuthStateChange((_event, session) => {
  // Deliberately not awaited, and deferred to the next tick: supabase-js
  // holds an internal lock while this callback runs, and calling back into
  // the client (loadProfile's query) from inside it can deadlock.
  setTimeout(() => applySession(session), 0)
})

export function useAuth() {
  // Prefers the profiles table, then the username saved on the auth user at
  // signup, then the email's local-part. The middle step means the greeting
  // still shows the right name if the profile row is missing.
  const displayName = computed(
    () =>
      state.profile?.display_name || state.user?.username || state.user?.email?.split('@')[0] || '',
  )

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }

    // Applied here rather than left to onAuthStateChange so the profile is
    // loaded before the caller navigates to a guarded route.
    await applySession(data.session)
    return { success: true }
  }

  async function signup(username, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) return { success: false, error: error.message }

    // The profile row and the six default moods are created by the
    // on_auth_user_created trigger (see supabase/handle_new_user.sql), which
    // reads this username out of raw_user_meta_data.
    if (!data.session) {
      return { success: true, needsConfirmation: true }
    }
    await applySession(data.session)
    return { success: true }
  }

  async function logout() {
    await supabase.auth.signOut()
    await applySession(null)
  }

  return { auth: readonly(state), displayName, login, signup, logout }
}
