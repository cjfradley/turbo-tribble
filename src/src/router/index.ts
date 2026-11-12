import { createRouter, createWebHistory } from 'vue-router'
import { account } from '@/auth/msal'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/files' },
    {
      // Supports the Teams deep link /files?name=<blob name> (FR-2.6).
      path: '/files',
      name: 'files',
      component: () => import('@/views/FilesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/signin',
      name: 'signin',
      component: () => import('@/views/SignInView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/files' },
  ],
})

// FR-1.2: only the sign-in page is reachable without an account.
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !account.value) {
    return { name: 'signin', query: { returnTo: to.fullPath } }
  }
  if (to.name === 'signin' && account.value) {
    return { name: 'files' }
  }
})

export default router
