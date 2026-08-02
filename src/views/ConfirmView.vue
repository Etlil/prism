<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { openVaultWithPassword, vaultIsUnlocked } from '@/composables/useVault'

const router = useRouter()
const { auth, displayName } = useAuth()

// 'checking' → 'unlock' (needs a password for the journal) → 'done'
//            → 'failed' if the link is stale
const phase = ref('checking')
const password = ref('')
const busy = ref(false)
const error = ref('')

function finish() {
  router.replace({ name: 'dashboard' })
}

onMounted(async () => {
  // Supabase puts the tokens in the URL fragment and the client turns them
  // into a session on load, so by the time this runs there is usually already
  // one. Awaiting getSession turns "probably" into a definite answer.
  const { data, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !data.session) {
    phase.value = 'failed'
    return
  }

  // Keeps the tokens out of the address bar and out of browser history.
  window.history.replaceState({}, '', '/confirm')

  // A confirmation link signs you in WITHOUT a password — and the password is
  // what unwraps the journal key. So unless a key is already cached in this
  // browser, we have to ask for it once, here, or the journal starts locked
  // with no explanation.
  phase.value = vaultIsUnlocked() ? 'done' : 'unlock'
})

async function handleUnlock() {
  busy.value = true
  error.value = ''

  const result = await openVaultWithPassword(auth.user?.id, password.value)
  busy.value = false

  if (!result.success) {
    error.value = result.needsRecovery
      ? "That password doesn't match this account's journal key. You can sort it out in Settings later."
      : 'That password is not right.'
    return
  }

  password.value = ''
  phase.value = 'done'
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-card">
      <img class="brand-mark" src="/icon.png" alt="" width="80" height="80" />

      <template v-if="phase === 'checking'">
        <h1 class="title">Confirming…</h1>
        <p class="subtitle">One moment.</p>
      </template>

      <template v-else-if="phase === 'unlock'">
        <span class="badge">✓ Email confirmed</span>
        <h1 class="title">Welcome{{ displayName ? ', ' + displayName : '' }}</h1>
        <p class="subtitle">
          One last thing — type your password so your journal can be encrypted. Your writing is
          scrambled before it's saved, and your password is the key.
        </p>

        <form class="form" @submit.prevent="handleUnlock">
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="Your password"
            autocomplete="current-password"
            required
          />
          <p v-if="error" class="error">{{ error }}</p>
          <button class="submit" type="submit" :disabled="busy || !password">
            {{ busy ? 'Setting up…' : 'Finish setup' }}
          </button>
        </form>

        <button type="button" class="skip" @click="finish">Skip for now</button>
      </template>

      <template v-else-if="phase === 'done'">
        <span class="badge">✓ All set</span>
        <h1 class="title">You're in</h1>
        <p class="subtitle">Your year is waiting. Let's fill in today.</p>
        <button class="submit" type="button" @click="finish">Open my year</button>
      </template>

      <template v-else>
        <h1 class="title">Link didn't work</h1>
        <p class="subtitle">
          This confirmation link has expired or was already used. Try logging in — the account may
          already be confirmed.
        </p>
        <RouterLink class="submit as-link" to="/login">Go to log in</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-soft);
  padding: calc(1rem + var(--safe-top)) calc(1rem + var(--safe-right))
    calc(1rem + var(--safe-bottom)) calc(1rem + var(--safe-left));
}

.auth-card {
  width: min(360px, 100%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2.4rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.brand-mark {
  margin-bottom: 0.2rem;
}

.badge {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: rgba(62, 196, 109, 0.14);
  color: #2f9d56;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.title {
  color: var(--accent);
  font-size: 1.5rem;
  line-height: 1.2;
}

.subtitle {
  color: var(--color-text-soft);
  font-size: 0.88rem;
  line-height: 1.55;
}

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

.input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.95rem;
  text-align: center;
}

.input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.submit {
  width: 100%;
  margin-top: 0.3rem;
  padding: 0.72rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.submit.as-link {
  display: block;
}

.submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.skip {
  border: none;
  background: none;
  color: var(--color-text-soft);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0.2rem;
  text-decoration: underline;
}

.error {
  font-size: 0.8rem;
  color: #c0392b;
  line-height: 1.45;
}
</style>
