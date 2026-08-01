<script setup>
import { useAuth } from '@/composables/useAuth'
import AppNav from '@/components/AppNav.vue'

const { auth } = useAuth()
</script>

<template>
  <div class="shell" :class="{ 'shell--bare': !auth.isLoggedIn }">
    <AppNav v-if="auth.isLoggedIn" />
    <main class="content">
      <!-- router-view swaps in whichever view matches the current route -->
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
}

.content {
  flex: 1;
  min-width: 0;
  padding: 2rem;
}

.shell--bare .content {
  padding: 0;
}

@media (max-width: 768px) {
  .content {
    /* Extra top padding clears the fixed hamburger button, which is itself
       pushed down by the status bar inset — so this has to clear both. */
    padding: calc(4rem + var(--safe-top)) calc(1rem + var(--safe-right))
      calc(1.5rem + var(--safe-bottom)) calc(1rem + var(--safe-left));
  }

  /* The auth screens draw their own full-bleed background, so they handle
     their own insets rather than being padded here. */
  .shell--bare .content {
    padding: 0;
  }
}
</style>
