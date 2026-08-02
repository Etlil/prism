// Where a confirmation email should send someone back to.
//
// On the web this is just a URL on the same origin. Inside a Capacitor build
// the app is not on a public origin at all, so the link has to be a custom
// scheme that Android hands back to the app — otherwise the browser opens,
// confirms the account, and leaves the person staring at a web page with no
// way into the app they just installed.
//
// Kept in its own file so switching to the deep link at Phase 9 is one
// constant, not a hunt through the auth code.

// Set this to the same value in the Capacitor config and in Supabase's
// Redirect URLs list when the app is wrapped.
export const APP_SCHEME = 'prism'

// True once the app is running inside the native shell. Capacitor injects this
// global; on the web it is simply absent.
export function isNativeApp() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

export function confirmRedirectUrl() {
  if (isNativeApp()) return `${APP_SCHEME}://confirm`
  return `${window.location.origin}/confirm`
}

// Where the "reset your password" email lands.
export function resetRedirectUrl() {
  if (isNativeApp()) return `${APP_SCHEME}://reset-password`
  return `${window.location.origin}/reset-password`
}
