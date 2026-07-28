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
</style>
