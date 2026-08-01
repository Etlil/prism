<script setup>
import { ref } from 'vue'
import { useVault } from '@/composables/useVault'
import { useAuth } from '@/composables/useAuth'
import { useEntries } from '@/composables/useEntries'

const { vault, isReady, isLocked, newRecoveryCode, recoverWithCode, resetVault, clearVaultError } =
  useVault()
const { auth } = useAuth()
const { decryptLoadedEntries } = useEntries()

// Shown once, right after it's generated. Only the wrapped key is stored, so
// there is no way to display an old code again — generating a new one is the
// only option, and it retires the previous.
const code = ref('')
const copied = ref(false)

const recoveryInput = ref('')
const passwordInput = ref('')
const restored = ref(false)

async function handleNewCode() {
  clearVaultError()
  copied.value = false
  const result = await newRecoveryCode(auth.user?.id)
  if (result.success) code.value = result.code
}

async function handleRestore() {
  clearVaultError()
  const result = await recoverWithCode(auth.user?.id, recoveryInput.value, passwordInput.value)
  if (!result.success) return

  recoveryInput.value = ''
  passwordInput.value = ''
  restored.value = true
  await decryptLoadedEntries()
}

async function copyCode() {
  await navigator.clipboard.writeText(code.value)
  copied.value = true
}

// Last resort: discard the key nobody can open and start again from the login
// password. Two steps on purpose — this destroys anything already encrypted.
const confirmingReset = ref(false)
const resetPassword = ref('')

async function handleReset() {
  clearVaultError()
  const result = await resetVault(auth.user?.id, resetPassword.value)
  if (result.success) {
    confirmingReset.value = false
    resetPassword.value = ''
  }
}
</script>

<template>
  <div class="privacy">
    <!-- Normal state: nothing to do. -->
    <template v-if="isReady">
      <p class="status">🔒 Your journal writing is encrypted.</p>
      <p class="note">
        Journal titles and text are scrambled in your browser before they're saved, using a key
        unlocked by your login password. Nobody reading the database — not even from the Supabase
        dashboard — can read them. There's no extra passphrase: signing in is what opens it.
      </p>
      <p class="warn">
        This covers journal titles and text only. Photos, photo captions and mood names are stored
        normally.
      </p>

      <div v-if="code" class="code-panel">
        <p class="code-title">Your recovery code</p>
        <p class="code-body">
          You only need this if you ever reset your password — a reset leaves the journal locked,
          and this is the way back in. Shown once. Write it somewhere safe.
        </p>
        <p class="code">{{ code }}</p>
        <div class="code-actions">
          <button type="button" class="ghost-btn" @click="copyCode">
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
          <button type="button" class="primary-btn" @click="code = ''">Done</button>
        </div>
      </div>

      <template v-else>
        <button type="button" class="ghost-btn" :disabled="vault.busy" @click="handleNewCode">
          {{ vault.busy ? 'Generating…' : 'Generate a recovery code' }}
        </button>
        <p class="hint">Generating a new one replaces any previous code.</p>
      </template>
    </template>

    <!-- Either a session that predates encryption, or a password reset. -->
    <template v-else-if="isLocked">
      <p class="status locked">🔒 Journal locked on this device</p>
      <p class="note">
        The key that unlocks your journal isn't available here, so journal writing can't be saved —
        it would have to be stored as readable text, which defeats the point.
      </p>
      <p class="note">
        <strong>Log out and log back in.</strong> That's almost always the fix: your password is
        what unlocks the key, and a restored session doesn't carry it.
      </p>
      <!-- The real reason, straight from the failure. Without this the advice
           above is a guess. -->
      <p v-if="vault.error" class="error boxed">{{ vault.error }}</p>

      <p class="warn">
        Only if that doesn't work — meaning your password was reset, or the key was made with a
        separate passphrase — use your recovery code below.
      </p>

      <form class="form" @submit.prevent="handleRestore">
        <input
          v-model="recoveryInput"
          class="input code-input"
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          autocomplete="off"
          spellcheck="false"
        />
        <input
          v-model="passwordInput"
          type="password"
          class="input"
          placeholder="Your current password"
          autocomplete="current-password"
        />
        <button
          class="primary-btn"
          type="submit"
          :disabled="vault.busy || !recoveryInput || !passwordInput"
        >
          {{ vault.busy ? 'Restoring…' : 'Restore my journal' }}
        </button>
        <p v-if="restored" class="ok">Restored. Your journals are readable again.</p>
      </form>

      <!-- No password, no recovery code, no way in. This is the exit. -->
      <div class="reset">
        <button
          v-if="!confirmingReset"
          type="button"
          class="link-danger"
          @click="confirmingReset = true"
        >
          I don't have a recovery code — start over
        </button>

        <form v-else class="form" @submit.prevent="handleReset">
          <p class="warn danger">
            This throws away the old key and makes a new one from your password. Any journal text
            already encrypted under the old key becomes <strong>permanently unreadable</strong>.
            Photos, captions and moods are not affected.
          </p>
          <input
            v-model="resetPassword"
            type="password"
            class="input"
            placeholder="Confirm your password"
            autocomplete="current-password"
          />
          <div class="row">
            <button type="button" class="ghost-btn" @click="confirmingReset = false">Cancel</button>
            <button class="danger-btn" type="submit" :disabled="vault.busy || !resetPassword">
              {{ vault.busy ? 'Resetting…' : 'Start over' }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <p v-else class="note">Sign in to set up journal encryption.</p>
  </div>
</template>

<style scoped>
.privacy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.7rem;
}

.note,
.hint,
.warn,
.status,
.error,
.ok {
  font-size: 0.8rem;
  line-height: 1.55;
}

.note,
.hint {
  color: var(--color-text-soft);
}

.warn {
  color: var(--color-text-soft);
  border-left: 2px solid var(--color-border);
  padding-left: 0.7rem;
}

.status {
  font-weight: 600;
  font-size: 0.88rem;
}

.status.locked {
  color: #c0392b;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
}

.input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.code-input {
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.primary-btn {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
}

.ghost-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.error {
  color: #c0392b;
}

.boxed {
  background: rgba(226, 87, 76, 0.1);
  border: 1px solid rgba(226, 87, 76, 0.35);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.7rem;
}

.reset {
  width: 100%;
  max-width: 320px;
  margin-top: 0.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border);
}

.link-danger {
  border: none;
  background: none;
  color: #c0392b;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0.2rem 0;
  text-decoration: underline;
}

.warn.danger {
  border-left-color: #c0392b;
  color: var(--color-text);
}

.row {
  display: flex;
  gap: 0.5rem;
}

.danger-btn {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  background: #c0392b;
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.danger-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ok {
  color: var(--accent);
}

.code-panel {
  width: 100%;
  border: 2px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 1.1rem;
  background: var(--color-bg-card);
}

.code-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.code-body {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  line-height: 1.55;
}

.code {
  margin: 0.9rem 0 0.5rem;
  padding: 0.7rem;
  background: var(--color-bg-soft);
  border-radius: var(--radius-sm);
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1rem;
  letter-spacing: 0.06em;
  user-select: all;
  overflow-wrap: anywhere;
}

.code-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.9rem;
}
</style>
