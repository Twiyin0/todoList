<template>
  <nav class="navbar">
    <div class="nav-left">
      <router-link to="/" class="brand">TodoList</router-link>
    </div>
    <div class="nav-right">
      <span class="username">{{ auth.user?.username }}</span>
      <router-link to="/editor" class="nav-btn">在线编辑</router-link>
      <button class="nav-btn theme-btn" @click="themeStore.toggle()" :title="themeStore.theme === 'dark' ? '切换亮色' : '切换暗色'">
        {{ themeStore.theme === 'dark' ? '☀️' : '🌙' }}
      </button>
      <button class="nav-btn logout" @click="handleLogout">退出</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar { display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; height: 56px; background: var(--bg-nav); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); }
.brand { font-size: 1.2rem; font-weight: 700; color: var(--primary); }
.nav-right { display: flex; align-items: center; gap: .75rem; }
.username { font-size: .9rem; color: var(--text-muted); }
.nav-btn { padding: .4rem .9rem; border-radius: 8px; font-size: .9rem; cursor: pointer; background: var(--primary-bg); color: var(--primary); border: none; transition: background .15s; }
.nav-btn:hover { background: var(--bg-hover); }
.theme-btn { font-size: 1rem; padding: .4rem .6rem; }
.logout { background: var(--danger-bg); color: var(--danger); }
.logout:hover { background: var(--danger-bg); opacity: .8; }
</style>
