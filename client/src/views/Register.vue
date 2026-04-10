<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册</h1>
      <form @submit.prevent="handleRegister">
        <div class="field">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="请输入用户名" required />
        </div>
        <div class="field">
          <label>邮箱（可选）</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
      </form>
      <p class="link">已有账号？<router-link to="/login">立即登录</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ username: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(form.value.username, form.value.password, form.value.email || undefined)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.error || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
.auth-card { background: var(--bg-card); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow); width: 100%; max-width: 400px; }
h1 { margin-bottom: 1.5rem; font-size: 1.5rem; text-align: center; color: var(--text); }
.field { margin-bottom: 1rem; }
.field label { display: block; margin-bottom: .4rem; font-size: .9rem; color: var(--text-muted); }
.field input { width: 100%; padding: .6rem .8rem; border: 1px solid var(--border-input); border-radius: 8px; font-size: 1rem; outline: none; background: var(--bg-input); color: var(--text); transition: border-color .2s; }
.field input:focus { border-color: var(--primary); }
button { width: 100%; padding: .75rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: .5rem; }
button:disabled { opacity: .6; cursor: not-allowed; }
.error { color: var(--danger); font-size: .875rem; margin-bottom: .5rem; }
.link { text-align: center; margin-top: 1rem; font-size: .9rem; color: var(--text-muted); }
.link a { color: var(--primary); }
</style>
