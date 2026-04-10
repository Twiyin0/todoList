<template>
  <div class="admin-page">
    <div class="admin-card">
      <h1>管理面板</h1>

      <div v-if="!authed" class="login-section">
        <p class="hint">请输入管理员密码</p>
        <div class="field">
          <input v-model="passwordInput" type="password" placeholder="管理员密码" @keyup.enter="handleAuth" />
        </div>
        <p v-if="authError" class="error">{{ authError }}</p>
        <button @click="handleAuth">验证</button>
      </div>

      <template v-else>
        <div class="stats">
          <div class="stat-card">
            <span class="stat-num">{{ stats.userCount }}</span>
            <span class="stat-label">用户总数</span>
          </div>
        </div>

        <div class="section-header">
          <h3>用户管理</h3>
          <button class="btn-primary" @click="showCreate = !showCreate">+ 新建用户</button>
        </div>

        <form v-if="showCreate" class="create-form" @submit.prevent="handleCreateUser">
          <input v-model="newUser.username" placeholder="用户名" required />
          <input v-model="newUser.email" placeholder="邮箱（可选）" type="email" />
          <input v-model="newUser.password" placeholder="密码" type="password" required />
          <button type="submit">创建</button>
          <button type="button" @click="showCreate = false">取消</button>
        </form>

        <table class="user-table">
          <thead>
            <tr><th>ID</th><th>用户名</th><th>邮箱</th><th>注册时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.email || '-' }}</td>
              <td>{{ formatDate(u.created_at) }}</td>
              <td class="actions">
                <button class="btn-danger" @click="handleDelete(u.id)">删除</button>
                <button class="btn-secondary" @click="openResetPwd(u.id)">重置密码</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="resetTarget !== null" class="modal-overlay" @click.self="resetTarget = null">
          <div class="modal">
            <h4>重置密码</h4>
            <input v-model="newPassword" type="password" placeholder="新密码" />
            <div class="modal-actions">
              <button @click="handleResetPwd">确认</button>
              <button @click="resetTarget = null">取消</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { adminApi } from '@/api'
import type { User } from '@/types'
import md5 from 'md5'

const authed = ref(false)
const passwordInput = ref('')
const authError = ref('')
const adminPwd = ref('')

const stats = ref({ userCount: 0 })
const users = ref<User[]>([])
const showCreate = ref(false)
const newUser = ref({ username: '', email: '', password: '' })
const resetTarget = ref<number | null>(null)
const newPassword = ref('')

async function handleAuth() {
  authError.value = ''
  const hashed = md5(passwordInput.value)
  try {
    const res = await adminApi.stats(hashed)
    stats.value = res.data
    adminPwd.value = hashed
    authed.value = true
    loadUsers()
  } catch {
    authError.value = '密码错误'
  }
}

async function loadUsers() {
  const res = await adminApi.listUsers(adminPwd.value)
  users.value = res.data.users
}

async function handleCreateUser() {
  await adminApi.createUser(adminPwd.value, {
    username: newUser.value.username,
    password: newUser.value.password,
    email: newUser.value.email || undefined,
  })
  newUser.value = { username: '', email: '', password: '' }
  showCreate.value = false
  loadUsers()
}

async function handleDelete(id: number) {
  if (!confirm('确认删除该用户？')) return
  await adminApi.deleteUser(adminPwd.value, id)
  loadUsers()
}

function openResetPwd(id: number) {
  resetTarget.value = id
  newPassword.value = ''
}

async function handleResetPwd() {
  if (!resetTarget.value || !newPassword.value) return
  await adminApi.updatePassword(adminPwd.value, resetTarget.value, newPassword.value)
  resetTarget.value = null
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.admin-page { min-height: 100vh; background: var(--bg); padding: 2rem 1rem; }
.admin-card { max-width: 900px; margin: 0 auto; background: var(--bg-card); border-radius: 12px; padding: 2rem; box-shadow: var(--shadow); }
h1 { font-size: 1.5rem; margin-bottom: 1.5rem; color: var(--text); }
.hint { color: var(--text-muted); margin-bottom: .75rem; }
.field { margin-bottom: 1rem; }
.field input { width: 100%; padding: .6rem .8rem; border: 1px solid var(--border-input); border-radius: 8px; font-size: 1rem; outline: none; background: var(--bg-input); color: var(--text); }
input, select { padding: .6rem .8rem; border: 1px solid var(--border-input); border-radius: 8px; font-size: 1rem; outline: none; background: var(--bg-input); color: var(--text); }
button { padding: .5rem 1.2rem; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-danger { background: var(--danger); color: #fff; margin-right: .4rem; }
.btn-secondary { background: var(--bg-tag); color: var(--text); }
.error { color: var(--danger); font-size: .875rem; margin-bottom: .5rem; }
.stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.stat-card { background: var(--primary-bg); border-radius: 10px; padding: 1rem 1.5rem; text-align: center; }
.stat-num { display: block; font-size: 2rem; font-weight: 700; color: var(--primary); }
.stat-label { font-size: .85rem; color: var(--text-muted); }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.section-header h3 { font-size: 1.1rem; color: var(--text); }
.create-form { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px; }
.create-form input { flex: 1; min-width: 140px; }
.user-table { width: 100%; border-collapse: collapse; font-size: .9rem; color: var(--text); }
.user-table th, .user-table td { padding: .6rem .8rem; border-bottom: 1px solid var(--border); text-align: left; }
.user-table th { background: var(--bg); font-weight: 600; }
.actions { white-space: nowrap; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 1.5rem; min-width: 300px; }
.modal h4 { margin-bottom: 1rem; color: var(--text); }
.modal input { width: 100%; margin-bottom: 1rem; }
.modal-actions { display: flex; gap: .5rem; }
</style>
