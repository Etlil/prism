<script setup>
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { auth, logout } = useAuth()
const router = useRouter()

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="app-nav">
    <div class="brand">Prism</div>

    <p class="greeting">Hi, {{ auth.currentUser?.username }}</p>

    <!-- RouterLink auto-adds a `router-link-active` class to whichever link
         matches the current route, which is what .nav-link.router-link-active
         below hooks into for the highlight. -->
    <ul class="links">
      <li>
        <RouterLink to="/" class="nav-link">
          <span class="icon">◱</span> Dashboard
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/journal" class="nav-link">
          <span class="icon">🖼</span> Photo Journal
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/settings" class="nav-link">
          <span class="icon">⚙</span> Settings
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/about" class="nav-link">
          <span class="icon">◍</span> About Me
        </RouterLink>
      </li>
    </ul>

    <button class="logout" type="button" @click="handleLogout">
      <span class="icon">⏻</span> Log out
    </button>
  </nav>
</template>

<style scoped>
.app-nav {
  display: flex;
  flex-direction: column;
  width: 220px;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  padding: 1.5rem 1rem;
  background: var(--color-bg-soft);
  border-right: 1px solid var(--color-border);
}

.brand {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent);
  padding: 0 0.5rem;
}

.greeting {
  color: var(--color-text-soft);
  font-size: 0.85rem;
  padding: 0.5rem 0.5rem 1.5rem;
}

.links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.95rem;
}

.nav-link:hover {
  background: var(--color-bg-card);
}

.nav-link.router-link-active {
  background: var(--accent);
  color: white;
}

.icon {
  font-size: 1.1rem;
  width: 1.2rem;
  text-align: center;
}

.logout {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text-soft);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.95rem;
  text-align: left;
}

.logout:hover {
  background: var(--color-bg-card);
  color: var(--color-text);
}
</style>
