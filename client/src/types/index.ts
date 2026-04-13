export interface User {
  id: number
  username: string
  email: string | null
  created_at: number
}

export interface Todo {
  id: number
  user_id: number
  title: string
  description: string | null
  tag: string | null
  completed: boolean
  priority: number
  notice_enabled: boolean
  notice_time: number | null
  created_at: number
  updated_at: number
}

export interface Document {
  id: number
  user_id: number
  title: string
  content: string
  created_at: number
  updated_at: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}
