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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import NavBar from '@/components/NavBar.vue'
import TodoItem from '@/components/TodoItem.vue'
import TodoForm from '@/components/TodoForm.vue'
import { useTodoStore } from '@/stores/todo'

const todoStore = useTodoStore()
const { todos } = storeToRefs(todoStore)
const showForm = ref(false)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  await todoStore.fetchTodos()
  loading.value = false
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
.loading, .empty { text-align: center; color: var(--text-light); padding: 3rem 0; }
</style>
