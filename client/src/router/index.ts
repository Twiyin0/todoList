import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/Login.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('@/views/Register.vue'), meta: { guest: true } },
    { path: '/', component: () => import('@/views/Home.vue'), meta: { auth: true } },
    { path: '/editor', component: () => import('@/views/Editor.vue'), meta: { auth: true } },
    { path: '/editor/:id', component: () => import('@/views/Editor.vue'), meta: { auth: true } },
    { path: '/admin', component: () => import('@/views/Admin.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.token) return '/login'
  if (to.meta.guest && auth.token) return '/'
})

export default router
