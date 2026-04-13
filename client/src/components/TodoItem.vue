<template>
  <div class="todo-item" :class="{ completed: todo.completed }">
    <div class="todo-check" @click="handleToggle">
      <span class="check-icon">{{ todo.completed ? '✓' : '' }}</span>
    </div>
    <div class="todo-body" @click="editing = !editing">
      <div class="todo-title-row">
        <span class="todo-id">#{{ todo.id }}</span>
        <span class="todo-title">{{ todo.title }}</span>
        <span v-if="todo.tag" class="type-badge">{{ todo.tag }}</span>
      </div>
      <div v-if="todo.description" class="todo-desc">{{ todo.description }}</div>
      <div v-if="todo.notice_enabled && todo.notice_time" class="notice-info">
        <span class="notice-icon">🔔</span>
        {{ formatNoticeTime(todo.notice_time) }}
      </div>
    </div>
    <div class="todo-meta">
      <span class="priority" :class="`p${todo.priority}`">P{{ todo.priority }}</span>
    </div>
    <button class="del-btn" @click="handleDelete">×</button>

    <div v-if="editing" class="inline-edit" @click.stop>
      <input v-model="editTitle" placeholder="标题" />
      <input v-model="editDesc" placeholder="描述（可选）" />
      <div class="edit-row">
        <select v-model="editPriority">
          <option :value="0">普通</option>
          <option :value="1">重要</option>
          <option :value="2">紧急</option>
        </select>
        <input v-model="editTag" placeholder="标签" class="edit-type" />
      </div>
      <div class="edit-notice-row">
        <label class="notice-toggle">
          <input type="checkbox" v-model="editNoticeEnabled" />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">提醒</span>
        </label>
        <input
          v-if="editNoticeEnabled"
          type="datetime-local"
          v-model="editNoticeTimeLocal"
          class="notice-time-input"
        />
      </div>
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
const editTag = ref(props.todo.tag || '')
const editNoticeEnabled = ref(props.todo.notice_enabled)
const editNoticeTimeLocal = ref(
  props.todo.notice_time
    ? new Date(props.todo.notice_time * 1000).toISOString().slice(0, 16)
    : ''
)

function formatNoticeTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

async function handleToggle() {
  await todoStore.toggleTodo(props.todo.id, !props.todo.completed)
}

async function handleDelete() {
  if (!confirm('确认删除？')) return
  await todoStore.removeTodo(props.todo.id)
}

async function handleSave() {
  let noticeTime: number | null = null
  if (editNoticeEnabled.value && editNoticeTimeLocal.value) {
    noticeTime = Math.floor(new Date(editNoticeTimeLocal.value).getTime() / 1000)
  }
  await todoStore.updateTodo(props.todo.id, {
    title: editTitle.value,
    description: editDesc.value,
    priority: editPriority.value,
    tag: editTag.value || undefined,
    notice_enabled: editNoticeEnabled.value,
    notice_time: noticeTime,
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
.todo-body { flex: 1; cursor: pointer; min-width: 0; }
.todo-title-row { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.todo-id { font-size: .72rem; color: var(--text-muted); background: var(--bg-tag); padding: .1rem .35rem; border-radius: 4px; font-family: monospace; flex-shrink: 0; }
.todo-title { font-size: 1rem; font-weight: 500; color: var(--text); }
.todo-item.completed .todo-title { text-decoration: line-through; color: var(--text-muted); }
.type-badge { font-size: .72rem; padding: .1rem .4rem; border-radius: 4px; background: var(--primary); color: #fff; opacity: .85; }
.todo-desc { font-size: .85rem; color: var(--text-muted); margin-top: .2rem; }
.notice-info { font-size: .78rem; color: var(--primary); margin-top: .25rem; display: flex; align-items: center; gap: .25rem; }
.notice-icon { font-size: .85rem; }
.todo-meta { display: flex; align-items: center; }
.priority { font-size: .75rem; padding: .15rem .4rem; border-radius: 4px; background: var(--bg-tag); color: var(--text-muted); }
.priority.p1 { background: #fff3cd; color: #856404; }
.priority.p2 { background: var(--danger-bg); color: var(--danger); }
.del-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.3rem; line-height: 1; padding: 0 .2rem; }
.del-btn:hover { color: var(--danger); }
.inline-edit { width: 100%; display: flex; flex-direction: column; gap: .5rem; padding-top: .5rem; border-top: 1px solid var(--border); margin-top: .5rem; }
.inline-edit input, .inline-edit select { padding: .4rem .6rem; border: 1px solid var(--border-input); border-radius: 6px; font-size: .9rem; outline: none; background: var(--bg-input); color: var(--text); width: 100%; box-sizing: border-box; }
.edit-row { display: flex; gap: .5rem; }
.edit-row select { flex: 0 0 90px; }
.edit-row .edit-type { flex: 1; }
.edit-notice-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.notice-toggle { display: flex; align-items: center; gap: .4rem; cursor: pointer; user-select: none; }
.notice-toggle input[type="checkbox"] { display: none; }
.toggle-track { width: 34px; height: 18px; background: var(--border); border-radius: 9px; position: relative; transition: background .2s; flex-shrink: 0; }
.notice-toggle input:checked ~ .toggle-track { background: var(--primary); }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: left .2s; }
.notice-toggle input:checked ~ .toggle-track .toggle-thumb { left: 18px; }
.toggle-label { font-size: .85rem; color: var(--text-muted); }
.notice-time-input { flex: 1; min-width: 170px; }
.edit-actions { display: flex; gap: .4rem; }
.edit-actions button { padding: .35rem .8rem; border: none; border-radius: 6px; cursor: pointer; font-size: .85rem; }
.edit-actions button:first-child { background: var(--primary); color: #fff; }
.edit-actions button:last-child { background: var(--bg-tag); color: var(--text); }
</style>
