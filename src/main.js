import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Imported for its side effect only: loading this module reads the saved theme
// from localStorage and paints it onto <html>. Without this, it would only run
// when SettingsView is lazy-loaded, so a refresh on any other page shows the
// default theme until you visit Settings.
import './composables/useTheme'

createApp(App).use(router).mount('#app')
