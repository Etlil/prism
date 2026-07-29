<script setup>
import { ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter, useRoute } from 'vue-router'

const { displayName, logout } = useAuth()
const router = useRouter()
const route = useRoute()

const open = ref(false)

// Close the drawer whenever the page changes, so tapping a link on mobile
// doesn't leave the menu covering the page you just opened.
watch(() => route.fullPath, () => (open.value = false))

async function handleLogout() {
  await logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <button
    class="nav-toggle"
    type="button"
    aria-label="Toggle menu"
    :aria-expanded="open"
    @click="open = !open"
  >
    <span class="bar"></span>
    <span class="bar"></span>
    <span class="bar"></span>
  </button>

  <div v-if="open" class="backdrop" @click="open = false"></div>

  <nav class="app-nav" :class="{ open }">
    <div class="nav-header">
      <div class="brand">
        <img class="brand-mark" src="/icon.svg" alt="" width="26" height="26" />
        <span>Prism</span>
      </div>
      <p class="greeting">Hi, {{ displayName }}</p>
    </div>

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
  padding: 1.5rem 0.6rem;
  background: var(--color-bg-soft);
  border-right: 1px solid var(--color-border);
  /* Lets the menu scroll instead of clipping on short screens. */
  overflow-y: auto;
}

/* Hidden on desktop, where the sidebar is always visible. */
.nav-toggle {
  display: none;
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  width: 40px;
  height: 40px;
  padding: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  cursor: pointer;
}

.bar {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-text);
}

.backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 25;
  background: rgba(0, 0, 0, 0.4);
}

/* Padded to match .nav-link below, so the logo lines up with the link icons. */
.nav-header {
  padding: 0 0.55rem;
  margin-bottom: 1.25rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.brand-mark {
  flex-shrink: 0;
}

.greeting {
  color: var(--color-text-soft);
  font-size: 0.85rem;
  margin-top: 0.4rem;
  overflow-wrap: anywhere;
}

.links {
  list-style: none;
  /* Browsers indent <ul> by 40px by default; base.css resets margin but not
     padding, so this is what was pushing the links right of the logo. */
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.55rem;
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
  gap: 0.55rem;
  padding: 0.6rem 0.55rem;
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

@media (max-width: 768px) {
  .nav-toggle,
  .backdrop {
    display: flex;
  }

  /* Slides off-screen to the left, and back in when .open is added. */
  .app-nav {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 30;
    width: 75%;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .app-nav.open {
    transform: translateX(0);
  }
}
</style>
