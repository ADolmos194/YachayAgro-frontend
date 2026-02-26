import './assets/css/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'

const app = createApp(App)
const head = createHead()

const router = createRouter({
  routes: [
    { path: '/', component: () => import('./pages/index.vue') },
    { path: '/login', component: () => import('./pages/login.vue') },
    { path: '/register', component: () => import('./pages/register.vue') },
    { path: '/verify', component: () => import('./pages/verify.vue') },
    {
      path: '/config/master/country',
      component: () => import('./pages/config/master/country.vue')
    },
    {
      path: '/config/master/department',
      component: () => import('./pages/config/master/department.vue')
    },
    {
      path: '/settings',
      component: () => import('./pages/settings.vue'),
      children: [
        { path: '', component: () => import('./pages/settings/index.vue') },
        { path: 'members', component: () => import('./pages/settings/members.vue') },
        { path: 'notifications', component: () => import('./pages/settings/notifications.vue') },
        { path: 'security', component: () => import('./pages/settings/security.vue') }
      ]
    }
  ],
  history: createWebHistory()
})

import { useAuth } from './composables/useAuth'
const { isLoggedIn } = useAuth()

router.beforeEach((to) => {
  const publicPages = ['/login', '/register', '/verify']
  const authRequired = !publicPages.includes(to.path)

  if (authRequired && !isLoggedIn.value) {
    return '/login'
  }

  if (isLoggedIn.value && publicPages.includes(to.path)) {
    return '/'
  }
})

app.use(router)
app.use(head)
app.use(ui)

app.mount('#app')
