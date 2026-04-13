<template>
  <div class="layout">
    <NavBar />
    <main class="main">
      <div class="container">
        <div class="header">
          <h2>我的待办</h2>
          <button class="btn-primary" @click="showForm = true">+ 新建</button>
        </div>
        <TodoForm v-if="showForm" @created="showForm = false" @cancel="showForm = false" />
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="todos.length === 0" class="empty">暂无待办事项</div>
        <div v-else class="todo-list">
          <TodoItem v-for="todo in todos" :key="todo.id" :todo="todo" />
        </div>
      </div>
    </main>

    <!-- Notification popup -->
    <transition name="notice-fade">
      <div v-if="noticeTodo" class="notice-popup" @click="dismissNotice">
        <div class="notice-content" @click.stop>
          <div class="notice-header">
            <span class="notice-bell">🔔</span>
            <span>待办提醒</span>
            <button class="notice-close" @click="dismissNotice">×</button>
          </div>
          <div class="notice-title">{{ noticeTodo.title }}</div>
          <div v-if="noticeTodo.description" class="notice-desc">{{ noticeTodo.description }}</div>
          <div v-if="noticeTodo.tag" class="notice-type">{{ noticeTodo.tag }}</div>
          <button class="notice-done" @click="handleNoticeDone">标记完成</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import NavBar from '@/components/NavBar.vue'
import TodoItem from '@/components/TodoItem.vue'
import TodoForm from '@/components/TodoForm.vue'
import { useTodoStore } from '@/stores/todo'
import { todoApi } from '@/api'
import type { Todo } from '@/types'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const showForm = ref(false)
const loading = ref(false)
const noticeTodo = ref<Todo | null>(null)

// Track which IDs have already been notified this session
const notifiedIds = new Set<number>(
  JSON.parse(localStorage.getItem('notifiedTodoIds') || '[]')
)

function saveNotifiedIds() {
  localStorage.setItem('notifiedTodoIds', JSON.stringify([...notifiedIds]))
}

async function checkNotifications() {
  try {
    const res = await todoApi.notifications()
    const pending: Todo[] = res.data.todos
    for (const todo of pending) {
      if (!notifiedIds.has(todo.id)) {
        notifiedIds.add(todo.id)
        saveNotifiedIds()
        // Show in-page popup
        noticeTodo.value = todo
        // Also try browser Notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🔔 待办提醒：${todo.title}`, {
            body: todo.description || '',
            icon: '/favicon.ico',
          })
        }
        break // show one at a time
      }
    }
  } catch { /* silently ignore poll errors */ }
}

function dismissNotice() {
  noticeTodo.value = null
}

async function handleNoticeDone() {
  if (!noticeTodo.value) return
  await todoStore.toggleTodo(noticeTodo.value.id, true)
  noticeTodo.value = null
}

let pollTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  loading.value = true
  await todoStore.fetchTodos()
  loading.value = false

  // Request browser notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  // Initial check + poll every 30s
  checkNotifications()
  pollTimer = setInterval(checkNotifications, 30_000)
})

onUnmounted(() => {
  clearInterval(pollTimer)
})
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.main { flex: 1; padding: 2rem 1rem; }
.container { max-width: 720px; margin: 0 auto; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.header h2 { font-size: 1.4rem; color: var(--text); }
.btn-primary { padding: .5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .95rem; }
.btn-primary:hover { background: var(--primary-hover); }
.todo-list { display: flex; flex-direction: column; gap: .75rem; }
.loading, .empty { text-align: center; color: var(--text-muted); padding: 3rem 0; }

/* Notice popup */
.notice-popup { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; z-index: 9999; }
.notice-content { background: var(--bg-card); border-radius: 12px; padding: 1.25rem 1.5rem; width: 340px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.2); }
.notice-header { display: flex; align-items: center; gap: .5rem; font-weight: 600; font-size: 1rem; color: var(--text); margin-bottom: .75rem; }
.notice-bell { font-size: 1.2rem; }
.notice-close { margin-left: auto; background: none; border: none; font-size: 1.4rem; color: var(--text-muted); cursor: pointer; line-height: 1; }
.notice-title { font-size: 1.05rem; font-weight: 500; color: var(--text); margin-bottom: .35rem; }
.notice-desc { font-size: .88rem; color: var(--text-muted); margin-bottom: .35rem; }
.notice-type { display: inline-block; font-size: .75rem; background: var(--primary); color: #fff; padding: .1rem .4rem; border-radius: 4px; margin-bottom: .75rem; opacity: .85; }
.notice-done { width: 100%; padding: .5rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; margin-top: .5rem; }
.notice-done:hover { background: var(--primary-hover); }
.notice-fade-enter-active, .notice-fade-leave-active { transition: opacity .25s; }
.notice-fade-enter-from, .notice-fade-leave-to { opacity: 0; }
</style>
