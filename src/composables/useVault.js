import { reactive, readonly, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encryptText,
  decryptText,
  isEncrypted,
  generateRecoveryCode,
  normalizeRecoveryCode,
  exportKeyB64,
  importKeyB64,
} from '@/lib/crypto'

// Journal encryption with no passphrase to remember.
//
// The key is wrapped by the LOGIN password, so signing in is what opens the
// journal — there is no second secret and no unlock prompt. The server still
// only ever stores the wrapped key, so the database (and anyone reading it in
// the Supabase dashboard) holds nothing that can be opened.
//
// A restored session does not include the password, so after a page reload
// there is nothing to re-derive from. The unwrapped key is therefore cached in
// this browser's localStorage. That is the deliberate trade for zero friction:
// protected against the server, not against someone holding the unlocked
// device. Logging out clears it.
//
// This module must NOT import useAuth — useAuth drives it, and importing back
// would make the two circular.

let dataKey = null

const state = reactive({
  // 'unknown' → 'ready' (open) · 'locked' = a key exists but this browser
  // can't open it, which only happens after a password reset.
  status: 'unknown',
  busy: false,
  error: '',
})

const cacheKeyFor = (userId) => `prism-journal-key-${userId}`

async function cacheDataKey(userId, key) {
  try {
    localStorage.setItem(cacheKeyFor(userId), await exportKeyB64(key))
  } catch {
    // Private mode or a full quota — the journal still works for this session,
    // it just won't survive a reload.
  }
}

function forgetCachedKey(userId) {
  try {
    localStorage.removeItem(cacheKeyFor(userId))
  } catch {
    /* nothing to do */
  }
}

// Returns { row, error }. The error is kept rather than collapsed to null:
// "no key yet" and "the table doesn't exist" both look like an empty result,
// and treating the second as the first sends the code down the create path
// where it fails again for a reason nobody ever sees.
async function fetchKeyRow() {
  const { data, error } = await supabase.from('journal_keys').select('*').maybeSingle()
  return { row: data ?? null, error }
}

function describeKeyError(error) {
  // 42P01 undefined_table · PGRST205 not in the schema cache — both mean the
  // migration hasn't been run.
  if (['42P01', 'PGRST205'].includes(error.code)) {
    return 'The journal_keys table is missing — run supabase/journal_keys.sql in the SQL editor.'
  }
  if (error.code === '42501') {
    return 'The database refused access to journal_keys — its RLS policies are missing. Re-run supabase/journal_keys.sql.'
  }
  if (error.code === '23505') {
    return 'A journal key already exists but could not be read. Check the RLS policies on journal_keys.'
  }
  return error.message || 'Could not reach the journal key.'
}

// ── called by useAuth ──────────────────────────────────────────────────────

// Sign-in and sign-up both land here. Creates the key on first use, opens it
// every time after. Failure is never fatal to logging in: the journal shows as
// locked rather than blocking the whole app.
export async function openVaultWithPassword(userId, password) {
  if (!userId || !password) return { success: false }

  state.busy = true
  state.error = ''

  try {
    const { row, error: readError } = await fetchKeyRow()

    // Stop here rather than falling through to the create path, which would
    // fail again and report the wrong cause.
    if (readError) {
      state.busy = false
      state.status = 'locked'
      state.error = describeKeyError(readError)
      return { success: false, error: state.error }
    }

    if (!row) {
      // First time: make a key, wrap it under the password and under a fresh
      // recovery code. The recovery code is not shown here — Settings can mint
      // a new one on demand, which is friendlier than a one-time reveal buried
      // in the signup flow.
      const key = await generateDataKey()
      const byPassword = await wrapDataKey(key, password)
      const byRecovery = await wrapDataKey(key, normalizeRecoveryCode(generateRecoveryCode()))

      const { error } = await supabase.from('journal_keys').insert({
        user_id: userId,
        passphrase_salt: byPassword.salt,
        passphrase_iv: byPassword.iv,
        passphrase_key: byPassword.key,
        recovery_salt: byRecovery.salt,
        recovery_iv: byRecovery.iv,
        recovery_key: byRecovery.key,
      })

      if (error) {
        state.busy = false
        state.status = 'locked'
        state.error = describeKeyError(error)
        return { success: false, error: state.error }
      }

      dataKey = key
      await cacheDataKey(userId, key)
      state.status = 'ready'
      state.busy = false

      // Anything written before the key existed is sitting in plaintext.
      await encryptExisting()
      return { success: true, created: true }
    }

    dataKey = await unwrapDataKey(
      { salt: row.passphrase_salt, iv: row.passphrase_iv, key: row.passphrase_key },
      password,
    )
    await cacheDataKey(userId, dataKey)
    state.status = 'ready'
    state.busy = false

    await encryptExisting()
    return { success: true }
  } catch {
    // The stored wrap doesn't open with this password — the password was reset,
    // or the key predates automatic encryption.
    //
    // But this browser may still hold a working key: restoreVault runs first
    // and loads the cached one, and a recovery-code unlock leaves it there too.
    // In that case re-wrap under the password being used right now, so the
    // stale wrap heals itself and the recovery code is never needed twice.
    // (The failed unwrap threw before assigning, so dataKey is untouched.)
    if (dataKey) {
      const repair = await rewrapForNewPassword(userId, password)
      if (repair.success) {
        state.status = 'ready'
        state.busy = false
        return { success: true, repaired: true }
      }
    }

    state.busy = false
    state.status = 'locked'
    state.error =
      'A journal key exists but your password does not open it — your password changed, or the key was set up with a separate passphrase. Enter your recovery code below, or start over.'
    return { success: false, needsRecovery: true }
  }
}

// Throws away the existing key and makes a new one from the current password.
//
// Anything already encrypted under the old key becomes permanently unreadable,
// which is why this asks the caller to have confirmed first. It exists because
// the alternative — being stuck behind a key nobody has the secret for — has no
// other way out from inside the app.
export async function resetVault(userId, password) {
  if (!userId || !password) return { success: false, error: 'Sign in again first.' }

  state.busy = true
  state.error = ''

  const { error: deleteError } = await supabase
    .from('journal_keys')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    state.busy = false
    state.error = describeKeyError(deleteError)
    return { success: false, error: state.error }
  }

  dataKey = null
  forgetCachedKey(userId)
  state.busy = false

  // With the row gone this takes the create path and wraps a fresh key under
  // the current login password.
  return openVaultWithPassword(userId, password)
}

// Page reload: the session comes back from localStorage but the password does
// not, so the cached key is the only way to stay open without a prompt.
export async function restoreVault(userId) {
  if (!userId) return
  if (dataKey) return

  let cached = null
  try {
    cached = localStorage.getItem(cacheKeyFor(userId))
  } catch {
    /* storage unavailable */
  }

  if (cached) {
    try {
      dataKey = await importKeyB64(cached)
      state.status = 'ready'
      return
    } catch {
      forgetCachedKey(userId)
    }
  }

  // No usable cached key. Locked either way: with a key row we can't open it
  // without the password, and without one there's nothing to encrypt new
  // writing with. Both are fixed by signing in again, and until then the app
  // must refuse to save journal text rather than store it readable.
  state.status = 'locked'
}

export function clearVault(userId) {
  dataKey = null
  state.status = 'unknown'
  state.error = ''
  if (userId) forgetCachedKey(userId)
}

// ── recovery ───────────────────────────────────────────────────────────────

// Opens the journal with the recovery code alone.
//
// It deliberately does NOT ask for the password. The password wrap is left
// stale for now and repaired automatically on the next sign-in — see the catch
// in openVaultWithPassword. Asking for two secrets to fix one problem is a
// worse experience for no extra safety: the recovery code already proves
// ownership of the journal.
export async function recoverWithCode(userId, code) {
  state.busy = true
  state.error = ''

  const { row } = await fetchKeyRow()
  if (!row) {
    state.busy = false
    const message = 'No journal key found for this account.'
    state.error = message
    return { success: false, error: message }
  }

  try {
    // AES-GCM authenticates, so a wrong code throws here rather than handing
    // back a key that decrypts to nonsense.
    dataKey = await unwrapDataKey(
      { salt: row.recovery_salt, iv: row.recovery_iv, key: row.recovery_key },
      normalizeRecoveryCode(code),
    )

    await cacheDataKey(userId, dataKey)
    state.status = 'ready'
    state.busy = false
    return { success: true }
  } catch {
    state.busy = false
    const message = 'That recovery code is not right. Check for typos and try again.'
    state.error = message
    return { success: false, error: message }
  }
}

// Mints a fresh recovery code and rewraps the key under it, retiring whatever
// the previous one was. Only possible while the journal is open — which is the
// point: nobody can generate a way in without already having a way in.
export async function newRecoveryCode(userId) {
  if (!dataKey) return { success: false, error: 'Sign in again first.' }

  state.busy = true
  const code = generateRecoveryCode()
  const wrapped = await wrapDataKey(dataKey, normalizeRecoveryCode(code))

  const { error } = await supabase
    .from('journal_keys')
    .update({
      recovery_salt: wrapped.salt,
      recovery_iv: wrapped.iv,
      recovery_key: wrapped.key,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  state.busy = false

  if (error) {
    state.error = error.message
    return { success: false, error: error.message }
  }
  return { success: true, code }
}

// Rewraps the key under a new password. Call this alongside changing the
// Supabase password, or the next sign-in won't be able to open the journal.
export async function rewrapForNewPassword(userId, newPassword) {
  if (!dataKey) return { success: false, error: 'Sign in again first.' }

  const wrapped = await wrapDataKey(dataKey, newPassword)
  const { error } = await supabase
    .from('journal_keys')
    .update({
      passphrase_salt: wrapped.salt,
      passphrase_iv: wrapped.iv,
      passphrase_key: wrapped.key,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return error ? { success: false, error: error.message } : { success: true }
}

// ── migration ──────────────────────────────────────────────────────────────

// Rewrites anything still in plaintext as ciphertext. Safe to interrupt and
// safe to re-run: decryptText passes plaintext straight through, so a
// half-migrated account still reads correctly.
async function encryptExisting() {
  return (await encryptTable('photos')) + (await encryptTable('entries'))
}

async function encryptTable(table) {
  const { data, error } = await supabase.from(table).select('id, journal_title, journal_text')
  if (error || !data) return 0

  let count = 0
  for (const row of data) {
    const needsTitle = row.journal_title && !isEncrypted(row.journal_title)
    const needsText = row.journal_text && !isEncrypted(row.journal_text)
    if (!needsTitle && !needsText) continue

    const patch = {}
    if (needsTitle) patch.journal_title = await encryptText(dataKey, row.journal_title)
    if (needsText) patch.journal_text = await encryptText(dataKey, row.journal_text)

    const { error: updateError } = await supabase.from(table).update(patch).eq('id', row.id)
    if (!updateError) count++
  }
  return count
}

// ── used by useEntries ─────────────────────────────────────────────────────

export function vaultIsUnlocked() {
  return dataKey !== null
}

// Throws rather than returning the plaintext. An earlier version fell back to
// storing it unencrypted, which meant a locked journal quietly wrote readable
// text to the database — the exact thing this feature exists to prevent.
// Callers must check vaultIsUnlocked() first and refuse the save.
export async function encryptOrThrow(text) {
  if (!dataKey) throw new Error('Journal is locked — refusing to store plaintext.')
  return encryptText(dataKey, text)
}

// Returns null when the value is ciphertext that can't be read right now, so
// the UI can say "locked" instead of showing gibberish.
export async function decryptIfPossible(value) {
  if (!isEncrypted(value)) return value ?? ''
  if (!dataKey) return null

  try {
    return await decryptText(dataKey, value)
  } catch {
    return null
  }
}

export function clearVaultError() {
  state.error = ''
}

export function useVault() {
  return {
    vault: readonly(state),
    isReady: computed(() => state.status === 'ready'),
    isLocked: computed(() => state.status === 'locked'),
    recoverWithCode,
    newRecoveryCode,
    rewrapForNewPassword,
    resetVault,
    clearVaultError,
  }
}
