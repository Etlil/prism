<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const info = ref('')
const loading = ref(false)
const { signup } = useAuth()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  info.value = ''
  loading.value = true
  const result = await signup(username.value, email.value, password.value)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  // Supabase's default project setting requires clicking a confirmation
  // email before the account can log in — there's no session yet to send
  // them straight to the dashboard with.
  if (result.needsConfirmation) {
    info.value = 'Account created — check your email to confirm it, then log in.'
    return
  }
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="login-screen">
    <form class="login-card" @submit.prevent="handleSubmit">
      <h1 class="title">Prism</h1>
      <p class="subtitle">Create your account.</p>

      <label class="field">
        <span>Username</span>
        <input v-model="username" type="text" placeholder="yourname" required />
      </label>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" placeholder="you@example.com" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" placeholder="••••••••" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="info">{{ info }}</p>

      <button class="submit" type="submit" :disabled="loading">
        {{ loading ? 'Signing up…' : 'Sign up' }}
      </button>

      <p class="hint">
        Already have an account? <RouterLink class="link" to="/login">Log in</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-soft);
}

.login-card {
  width: min(360px, 90vw);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.title {
  color: var(--accent);
  font-size: 2rem;
  text-align: center;
}

.subtitle {
  color: var(--color-text-soft);
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
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
  margin-top: 0.5rem;
  padding: 0.7rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.submit:hover {
  filter: brightness(1.05);
}

.submit:disabled {
  opacity: 0.7;
  cursor: default;
}

.hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.error {
  text-align: center;
  font-size: 0.82rem;
  color: #e2574c;
}

.info {
  text-align: center;
  font-size: 0.82rem;
  color: var(--accent);
}

.link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
}
</style>
