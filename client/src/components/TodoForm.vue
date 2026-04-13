<template>
  <div class="todo-form">
    <input v-model="title" placeholder="待办标题" @keyup.enter="handleSubmit" />
    <input v-model="description" placeholder="描述（可选）" />
    <div class="form-row">
      <select v-model="priority">
        <option :value="0">普通</option>
        <option :value="1">重要</option>
        <option :value="2">紧急</option>
      </select>
      <input v-model="tag" placeholder="标签（可选）" class="type-input" />
    </div>
    <div class="notice-row">
      <label class="notice-toggle">
        <input type="checkbox" v-model="noticeEnabled" />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">提醒</span>
      </label>
      <input
        v-if="noticeEnabled"
        type="datetime-local"
        v-model="noticeTimeLocal"
        class="notice-time-input"
      />
    </div>
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
const tag = ref('')
const noticeEnabled = ref(false)
const noticeTimeLocal = ref('')

async function handleSubmit() {
  if (!title.value.trim()) return
  let noticeTime: number | undefined
  if (noticeEnabled.value && noticeTimeLocal.value) {
    noticeTime = Math.floor(new Date(noticeTimeLocal.value).getTime() / 1000)
  }
  await todoStore.createTodo(
    title.value.trim(),
    description.value || undefined,
    priority.value,
    tag.value || undefined,
    noticeEnabled.value,
    noticeTime ?? null
  )
  title.value = ''
  description.value = ''
  priority.value = 0
  tag.value = ''
  noticeEnabled.value = false
  noticeTimeLocal.value = ''
  emit('created')
}
</script>

<style scoped>
.todo-form { background: var(--bg-card); border-radius: 10px; padding: 1rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: .5rem; margin-bottom: 1rem; }
.todo-form input, .todo-form select { padding: .5rem .75rem; border: 1px solid var(--border-input); border-radius: 8px; font-size: .95rem; outline: none; background: var(--bg-input); color: var(--text); width: 100%; box-sizing: border-box; }
.todo-form input:focus { border-color: var(--primary); }
.form-row { display: flex; gap: .5rem; }
.form-row select { flex: 0 0 100px; }
.form-row .type-input { flex: 1; }
.notice-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.notice-toggle { display: flex; align-items: center; gap: .4rem; cursor: pointer; user-select: none; }
.notice-toggle input[type="checkbox"] { display: none; }
.toggle-track { width: 36px; height: 20px; background: var(--border); border-radius: 10px; position: relative; transition: background .2s; flex-shrink: 0; }
.notice-toggle input:checked ~ .toggle-track { background: var(--primary); }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left .2s; }
.notice-toggle input:checked ~ .toggle-track .toggle-thumb { left: 18px; }
.toggle-label { font-size: .9rem; color: var(--text-muted); }
.notice-time-input { flex: 1; min-width: 180px; padding: .4rem .6rem !important; }
.form-actions { display: flex; gap: .5rem; }
.btn-primary { padding: .5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel { padding: .5rem 1rem; background: var(--bg-tag); color: var(--text); border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
</style>
