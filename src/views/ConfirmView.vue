<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { auth } = useAuth()

// 'working' → 'done' → (redirect) · 'failed' if the link is stale
const phase = ref('working')
const message = ref('')

onMounted(async () => {
  // Supabase puts the tokens in the URL fragment (#access_token=…) and the
  // client picks them up on load, so by the time this runs there is usually
  // already a session. Waiting on getSession is what turns "probably signed
  // in" into a definite answer.
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    phase.value = 'failed'
    message.value =
      'This confirmation link has expired or was already used. Try logging in — the account may already be confirmed.'
    return
  }

  phase.value = 'done'

  // Clears the tokens out of the address bar so the link isn't left sitting in
  // history for anyone who opens the browser later.
  window.history.replaceState({}, '', '/confirm')

  setTimeout(() => router.replace({ name: 'dashboard' }), 1200)
})
</script>

<template>
  <div class="confirm-screen">
    <div class="card">
      <img class="mark" src="/icon.png" alt="" width="72" height="72" />

      <template v-if="phase === 'working'">
        <h1>Confirming…</h1>
        <p class="body">One moment.</p>
      </template>

      <template v-else-if="phase === 'done'">
        <h1>You're in</h1>
        <p class="body">
          Welcome{{ auth.user?.email ? ', ' + auth.user.email.split('@')[0] : '' }}. Taking you to
          your year…
        </p>
      </template>

      <template v-else>
        <h1>Link didn't work</h1>
        <p class="body">{{ message }}</p>
        <RouterLink class="btn" to="/login">Go to log in</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.confirm-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-soft);
  /* Keeps the card clear of the notch and the gesture bar on a phone. */
  padding: calc(1rem + var(--safe-top)) calc(1rem + var(--safe-right))
    calc(1rem + var(--safe-bottom)) calc(1rem + var(--safe-left));
}

.card {
  width: min(360px, 100%);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

h1 {
  color: var(--accent);
  font-size: 1.5rem;
}

.body {
  color: var(--color-text-soft);
  font-size: 0.88rem;
  line-height: 1.55;
}

.btn {
  margin-top: 0.6rem;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
