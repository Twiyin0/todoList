import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  function setToken(t: string) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  async function fetchMe() {
    try {
      const res = await authApi.me()
      user.value = res.data.user
    } catch {
      logout()
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    setToken(res.data.token)
    user.value = res.data.user
  }

  async function register(username: string, password: string, email?: string) {
    const res = await authApi.register({ username, password, email })
    setToken(res.data.token)
    user.value = res.data.user
  }

  return { user, token, login, register, logout, fetchMe }
})
