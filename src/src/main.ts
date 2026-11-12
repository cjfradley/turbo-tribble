import './assets/main.css'
import './fluent'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initAuth } from '@/auth/msal'

async function start() {
  // Finish any sign-in redirect before the router runs its auth guard.
  const returnTo = await initAuth()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)

  if (returnTo) await router.replace(returnTo)
  app.mount('#app')
}

void start()
