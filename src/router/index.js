import { createRouter, createWebHistory } from 'vue-router'
import { useAuth, authReady } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
    },
    {
      // Where the confirmation email lands. Public on purpose — the guard
      // below would bounce it to /login before the session had been read out
      // of the URL fragment.
      path: '/confirm',
      name: 'confirm',
      component: () => import('@/views/ConfirmView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
      // Where the reset email lands. The recovery link brings its own session,
      // so this must stay public — and must NOT be treated like /login below,
      // which would redirect an already-signed-in visitor away from it.
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/journal',
      name: 'journal',
      component: () => import('@/views/PhotoJournalView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Real Supabase session check now. authReady resolves once the initial
// getSession() call has finished — awaiting it (even after it's already
// resolved, that's instant) stops the very first navigation from bouncing
// to /login before we've had a chance to see an existing session.
router.beforeEach(async (to) => {
  await authReady
  const { auth } = useAuth()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }
  if ((to.name === 'login' || to.name === 'signup') && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }
})

export default router
