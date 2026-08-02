<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { login } = useAuth()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  const result = await login(email.value, password.value)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="login-screen">
    <form class="login-card" @submit.prevent="handleSubmit">
      <!-- Decorative: the heading right below already says "Prism", so an alt
           here would just make a screen reader announce the name twice. -->
      <img class="brand-mark" src="/icon.png" alt="" width="88" height="88" />
      <h1 class="title">Prism</h1>
      <p class="subtitle">Your year, one day at a time.</p>

      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" placeholder="you@example.com" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" placeholder="••••••••" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="submit" type="submit" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>

      <p class="hint">
        <RouterLink class="link" to="/forgot-password">Forgot your password?</RouterLink>
      </p>

      <p class="hint">
        No account yet? <RouterLink class="link" to="/signup">Sign up</RouterLink>
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
  /* Keeps the card clear of the notch and the gesture bar on a phone. */
  padding: calc(1rem + var(--safe-top)) calc(1rem + var(--safe-right))
    calc(1rem + var(--safe-bottom)) calc(1rem + var(--safe-left));
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

/* The card is a flex column, whose default align-items is stretch — without
   align-self the image would be pulled to the full card width. */
.brand-mark {
  align-self: center;
  /* Pulls the title up against the logo, since the card's 1rem gap is too
     much between a mark and the name it belongs to. */
  margin-bottom: -0.6rem;
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
  color: var(--on-accent);
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

.link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
}
</style>
