import { reactive, readonly, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { confirmRedirectUrl } from '@/lib/authRedirect'
import { openVaultWithPassword, restoreVault, clearVault } from '@/composables/useVault'
import { runSessionReset } from '@/composables/sessionReset'

const state = reactive({
  isLoggedIn: false,
  user: null, // { id, email } from Supabase Auth
  profile: null, // the matching row from the `profiles` table
})

// Tracks who the caches currently belong to, so a change can be detected.
let lastUserId = null

async function loadProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  state.profile = error ? null : data
}

async function applySession(session) {
  // Every cache in the app is keyed to whoever is signed in. If that changes —
  // logout, or a different account signing in on the same tab — the old data
  // must go before anything renders, or the new user is shown the previous
  // one's entries, photos and moods straight out of memory.
  const nextUserId = session?.user?.id ?? null
  if (nextUserId !== lastUserId) {
    runSessionReset()
    lastUserId = nextUserId
  }

  if (session?.user) {
    state.isLoggedIn = true
    state.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.user_metadata?.username || '',
    }
    await loadProfile(session.user.id)
    // A restored session carries no password, so the journal key comes from
    // this browser's cache. login()/signup() open it from the password
    // instead and will already have set it.
    await restoreVault(session.user.id)
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

  // Supabase's own messages are written for developers. These are the ones a
  // person actually hits.
  function friendlyAuthError(error) {
    const code = error.code || ''
    const message = error.message || ''

    // The built-in email service is test-only and allows a few sends per hour
    // PER PROJECT — not per account, which is why deleting the account and
    // trying again changes nothing.
    if (code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) {
      return "Too many confirmation emails have been sent from this project in the last hour. This is Supabase's free email quota, not your account — deleting it and retrying won't help. Wait an hour, or turn off email confirmation in the Supabase dashboard."
    }
    if (code === 'user_already_exists' || /already registered/i.test(message)) {
      return 'There is already an account with that email. Try logging in instead.'
    }
    if (code === 'weak_password' || /password should be/i.test(message)) {
      return 'That password is too short — use at least 6 characters.'
    }
    if (code === 'invalid_credentials' || /invalid login/i.test(message)) {
      return 'That email and password do not match an account.'
    }
    if (code === 'email_not_confirmed') {
      return 'This account still needs confirming — check your email for the link.'
    }
    return message || 'Something went wrong. Please try again.'
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: friendlyAuthError(error) }

    // Applied here rather than left to onAuthStateChange so the profile is
    // loaded before the caller navigates to a guarded route.
    await applySession(data.session)

    // The password is only in hand right here — it is what unwraps the journal
    // key, and a restored session can never re-derive it. Not awaited for its
    // result: a locked journal must not stop someone logging in.
    const vault = await openVaultWithPassword(data.session.user.id, password)
    return { success: true, needsRecovery: vault.needsRecovery === true }
  }

  async function signup(username, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        // Where the confirmation email's link sends them back to. Without
        // this, Supabase uses the project's Site URL — which on a phone means
        // the browser opens some other page and there is no way back into the
        // app. See CONFIRM_REDIRECT in lib/authRedirect.js for the Capacitor
        // deep-link version.
        emailRedirectTo: confirmRedirectUrl(),
      },
    })
    if (error) return { success: false, error: friendlyAuthError(error) }

    // The profile row and the six default moods are created by the
    // on_auth_user_created trigger (see supabase/handle_new_user.sql), which
    // reads this username out of raw_user_meta_data.
    if (!data.session) {
      return { success: true, needsConfirmation: true }
    }
    await applySession(data.session)
    await openVaultWithPassword(data.session.user.id, password)
    return { success: true }
  }

  async function logout() {
    // Cleared before signOut, while the user id is still known — it is part of
    // the cache key.
    clearVault(state.user?.id)
    await supabase.auth.signOut()
    await applySession(null)
  }

  // Writes the new name and puts the returned row straight into state, so the
  // nav greeting updates without a second read. .select() is what makes
  // update() hand the row back — by default it returns nothing.
  //
  // maybeSingle(), not single(): if the update matches no rows, single() throws
  // a confusing "0 rows" error, but that case isn't really an error — it means
  // there was no row to update, which needs its own explanation.
  async function updateDisplayName(name) {
    const trimmed = name.trim()
    if (!trimmed) return { success: false, error: 'Name cannot be empty.' }
    if (!state.user) return { success: false, error: 'You are not signed in.' }

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', state.user.id)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: error.message }

    // No row came back. Either the profile row is missing, or RLS is blocking
    // the update — an UPDATE with no matching policy doesn't raise an error,
    // it just quietly matches nothing. Both are fixed in the SQL editor, so
    // say so rather than leaving a silent no-op.
    if (!data) {
      return {
        success: false,
        error:
          "Couldn't save — no profile row was updated. Run supabase/profiles_policies.sql, then check_and_backfill.sql.",
      }
    }

    state.profile = data
    return { success: true }
  }

  return { auth: readonly(state), displayName, login, signup, logout, updateDisplayName }
}
