<template>
  <div class="todo-item" :class="{ completed: todo.completed }">
    <div class="todo-check" @click="handleToggle">
      <span class="check-icon">{{ todo.completed ? '✓' : '' }}</span>
    </div>
    <div class="todo-body" @click="editing = !editing">
      <div class="todo-title">{{ todo.title }}</div>
      <div v-if="todo.description" class="todo-desc">{{ todo.description }}</div>
    </div>
    <div class="todo-meta">
      <span class="priority" :class="`p${todo.priority}`">P{{ todo.priority }}</span>
    </div>
    <button class="del-btn" @click="handleDelete">×</button>

    <div v-if="editing" class="inline-edit" @click.stop>
      <input v-model="editTitle" placeholder="标题" />
      <input v-model="editDesc" placeholder="描述（可选）" />
      <select v-model="editPriority">
        <option :value="0">普通</option>
        <option :value="1">重要</option>
        <option :value="2">紧急</option>
      </select>
      <div class="edit-actions">
        <button @click="handleSave">保存</button>
        <button @click="editing = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todo'

const props = defineProps<{ todo: Todo }>()
const todoStore = useTodoStore()

const editing = ref(false)
const editTitle = ref(props.todo.title)
const editDesc = ref(props.todo.description || '')
const editPriority = ref(props.todo.priority)

async function handleToggle() {
  await todoStore.toggleTodo(props.todo.id, !props.todo.completed)
}

async function handleDelete() {
  if (!confirm('确认删除？')) return
  await todoStore.removeTodo(props.todo.id)
}

async function handleSave() {
  await todoStore.updateTodo(props.todo.id, {
    title: editTitle.value,
    description: editDesc.value,
    priority: editPriority.value,
  })
  editing.value = false
}
</script>

<style scoped>
.todo-item { background: var(--bg-card); border-radius: 10px; padding: .75rem 1rem; display: flex; align-items: flex-start; gap: .75rem; box-shadow: var(--shadow-sm); transition: opacity .2s; position: relative; flex-wrap: wrap; }
.todo-item.completed { opacity: .55; }
.todo-check { width: 24px; height: 24px; border: 2px solid var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-top: 2px; background: var(--bg-card); transition: background .15s; }
.todo-item.completed .todo-check { background: var(--primary); }
.check-icon { color: #fff; font-size: .8rem; font-weight: 700; }
.todo-body { flex: 1; cursor: pointer; }
.todo-title { font-size: 1rem; font-weight: 500; color: var(--text); }
.todo-item.completed .todo-title { text-decoration: line-through; color: var(--text-light); }
.todo-desc { font-size: .85rem; color: var(--text-muted); margin-top: .2rem; }
.todo-meta { display: flex; align-items: center; }
.priority { font-size: .75rem; padding: .15rem .4rem; border-radius: 4px; background: var(--bg-tag); color: var(--text-muted); }
.priority.p1 { background: #fff3cd; color: #856404; }
.priority.p2 { background: var(--danger-bg); color: var(--danger); }
.del-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1.3rem; line-height: 1; padding: 0 .2rem; }
.del-btn:hover { color: var(--danger); }
.inline-edit { width: 100%; display: flex; flex-wrap: wrap; gap: .5rem; padding-top: .5rem; border-top: 1px solid var(--border); margin-top: .5rem; }
.inline-edit input, .inline-edit select { flex: 1; min-width: 120px; padding: .4rem .6rem; border: 1px solid var(--border-input); border-radius: 6px; font-size: .9rem; outline: none; background: var(--bg-input); color: var(--text); }
.edit-actions { display: flex; gap: .4rem; }
.edit-actions button { padding: .35rem .8rem; border: none; border-radius: 6px; cursor: pointer; font-size: .85rem; }
.edit-actions button:first-child { background: var(--primary); color: #fff; }
.edit-actions button:last-child { background: var(--bg-tag); color: var(--text); }
</style>
