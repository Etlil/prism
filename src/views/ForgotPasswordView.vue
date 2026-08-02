<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { requestPasswordReset } = useAuth()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function handleSubmit() {
  loading.value = true
  error.value = ''

  const result = await requestPasswordReset(email.value)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  sent.value = true
}
</script>

<template>
  <div class="auth-screen">
    <form class="auth-card" @submit.prevent="handleSubmit">
      <img class="brand-mark" src="/icon.png" alt="" width="72" height="72" />

      <template v-if="!sent">
        <h1 class="title">Forgot password</h1>
        <p class="subtitle">We'll email you a link to set a new one.</p>

        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="submit" type="submit" :disabled="loading || !email">
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </template>

      <template v-else>
        <h1 class="title">Check your email</h1>
        <!-- Worded so it says the same thing whether or not the address has an
             account — confirming which emails are registered would tell a
             stranger who uses the app. -->
        <p class="subtitle sent">
          If there's an account for <strong>{{ email }}</strong
          >, a reset link is on its way. It expires in an hour.
        </p>
        <p class="warn">
          Heads up: changing your password locks your written journals unless you reset from this
          same device. Your recovery code from Settings gets them back.
        </p>
      </template>

      <p class="hint">
        <RouterLink class="link" to="/login">Back to log in</RouterLink>
      </p>
    </form>
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
  font-size: 1.6rem;
  text-align: center;
}

.subtitle {
  color: var(--color-text-soft);
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
  line-height: 1.5;
}

.subtitle.sent strong {
  color: var(--color-text);
}

.warn {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text-soft);
  background: var(--color-bg-soft);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.7rem;
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
  margin-top: 0.3rem;
  padding: 0.7rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.hint {
  text-align: center;
  font-size: 0.78rem;
  color: var(--color-text-soft);
}

.error {
  text-align: center;
  font-size: 0.82rem;
  color: #c0392b;
}

.link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
}
</style>
