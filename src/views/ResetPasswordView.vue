<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { updatePassword } = useAuth()

// 'checking' → 'ready' → 'done' · 'invalid' if the link is stale
const phase = ref('checking')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const journalKept = ref(false)

const canSubmit = computed(
  () => password.value.length >= 6 && password.value === confirm.value && !loading.value,
)

onMounted(async () => {
  // The recovery link puts tokens in the URL fragment and supabase-js turns
  // them into a session on load. No session here means the link expired or was
  // already used.
  const { data } = await supabase.auth.getSession()
  phase.value = data.session ? 'ready' : 'invalid'
})

async function handleSubmit() {
  loading.value = true
  error.value = ''

  const result = await updatePassword(password.value)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }

  journalKept.value = result.journalKept
  phase.value = 'done'
  window.history.replaceState({}, '', '/reset-password')
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-card">
      <img class="brand-mark" src="/icon.png" alt="" width="72" height="72" />

      <template v-if="phase === 'checking'">
        <h1 class="title">One moment</h1>
        <p class="subtitle">Checking your link…</p>
      </template>

      <template v-else-if="phase === 'invalid'">
        <h1 class="title">Link expired</h1>
        <p class="subtitle">
          Reset links last an hour and only work once. Request a fresh one and try again.
        </p>
        <RouterLink class="submit as-link" to="/forgot-password">Send a new link</RouterLink>
      </template>

      <template v-else-if="phase === 'ready'">
        <h1 class="title">New password</h1>
        <p class="subtitle">Pick something you'll remember.</p>

        <form class="form" @submit.prevent="handleSubmit">
          <label class="field">
            <span>New password</span>
            <input
              v-model="password"
              type="password"
              placeholder="At least 6 characters"
              autocomplete="new-password"
              required
            />
          </label>

          <label class="field">
            <span>Type it again</span>
            <input
              v-model="confirm"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
            />
          </label>

          <p v-if="confirm && password !== confirm" class="error">Those two don't match.</p>
          <p v-else-if="error" class="error">{{ error }}</p>

          <button class="submit" type="submit" :disabled="!canSubmit">
            {{ loading ? 'Saving…' : 'Set new password' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h1 class="title">Password changed</h1>

        <!-- The journal key is wrapped by the password, so this is the one
             thing a reset can quietly break. Say which happened. -->
        <p v-if="journalKept" class="subtitle">
          Your journal came with you — nothing to do.
        </p>
        <template v-else>
          <p class="subtitle">You can log in with your new password now.</p>
          <p class="warn">
            Your written journals were locked by this reset, because the old password is what
            opened them. Log in, go to <strong>Settings → Journal privacy</strong> and enter your
            recovery code — that's all it needs. Photos, moods and streaks are unaffected.
          </p>
        </template>

        <button class="submit" type="button" @click="router.replace({ name: 'login' })">
          Go to log in
        </button>
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
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.brand-mark {
  align-self: center;
  margin-bottom: -0.6rem;
}

.title {
  color: var(--accent);
  font-size: 1.5rem;
  text-align: center;
}

.subtitle {
  color: var(--color-text-soft);
  text-align: center;
  font-size: 0.9rem;
  line-height: 1.5;
}

.warn {
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--color-text);
  background: rgba(226, 87, 76, 0.1);
  border: 1px solid rgba(226, 87, 76, 0.35);
  border-radius: var(--radius-sm);
  padding: 0.7rem 0.8rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-text-soft);
}

.field input {
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
}

.field input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.submit {
  padding: 0.7rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.submit.as-link {
  display: block;
  text-decoration: none;
}

.submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  text-align: center;
  font-size: 0.82rem;
  color: #c0392b;
}
</style>
