import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Todo } from '@/types'
import { todoApi } from '@/api'

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])

  async function fetchTodos() {
    const res = await todoApi.list()
    todos.value = res.data.todos
  }

  async function createTodo(
    title: string,
    description?: string,
    priority = 0,
    tag?: string,
    noticeEnabled = false,
    noticeTime?: number | null
  ) {
    const res = await todoApi.create({ title, description, priority, tag, notice_enabled: noticeEnabled, notice_time: noticeTime })
    todos.value.unshift(res.data.todo)
  }

  async function toggleTodo(id: number, completed: boolean) {
    const res = await todoApi.update(id, { completed })
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) todos.value[idx] = res.data.todo
  }

  async function updateTodo(id: number, data: Partial<{
    title: string
    description: string
    priority: number
    tag: string
    notice_enabled: boolean
    notice_time: number | null
  }>) {
    const res = await todoApi.update(id, data)
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) todos.value[idx] = res.data.todo
  }

  async function removeTodo(id: number) {
    await todoApi.remove(id)
    todos.value = todos.value.filter(t => t.id !== id)
  }

  return { todos, fetchTodos, createTodo, toggleTodo, updateTodo, removeTodo }
})
