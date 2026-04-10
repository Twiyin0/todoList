<template>
  <div class="todo-form">
    <input v-model="title" placeholder="待办标题" @keyup.enter="handleSubmit" />
    <input v-model="description" placeholder="描述（可选）" />
    <select v-model="priority">
      <option :value="0">普通</option>
      <option :value="1">重要</option>
      <option :value="2">紧急</option>
    </select>
    <div class="form-actions">
      <button class="btn-primary" @click="handleSubmit" :disabled="!title.trim()">添加</button>
      <button class="btn-cancel" @click="$emit('cancel')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '@/stores/todo'

const emit = defineEmits<{ (e: 'created'): void; (e: 'cancel'): void }>()
const todoStore = useTodoStore()

const title = ref('')
const description = ref('')
const priority = ref(0)

async function handleSubmit() {
  if (!title.value.trim()) return
  await todoStore.createTodo(title.value.trim(), description.value || undefined, priority.value)
  title.value = ''
  description.value = ''
  priority.value = 0
  emit('created')
}
</script>

<style scoped>
.todo-form { background: var(--bg-card); border-radius: 10px; padding: 1rem; box-shadow: var(--shadow-sm); display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
.todo-form input, .todo-form select { flex: 1; min-width: 140px; padding: .5rem .75rem; border: 1px solid var(--border-input); border-radius: 8px; font-size: .95rem; outline: none; background: var(--bg-input); color: var(--text); }
.todo-form input:focus { border-color: var(--primary); }
.form-actions { display: flex; gap: .5rem; }
.btn-primary { padding: .5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel { padding: .5rem 1rem; background: var(--bg-tag); color: var(--text); border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
</style>
