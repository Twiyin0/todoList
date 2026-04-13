import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const todoApi = {
  list: () => api.get('/todos'),
  notifications: () => api.get('/todos/notifications'),
  create: (data: {
    title: string
    description?: string
    priority?: number
    tag?: string
    notice_enabled?: boolean
    notice_time?: number | null
  }) => api.post('/todos', data),
  update: (id: number, data: Partial<{
    title: string
    description: string
    completed: boolean
    priority: number
    type: string
    notice_enabled: boolean
    notice_time: number | null
  }>) => api.put(`/todos/${id}`, data),
  remove: (id: number) => api.delete(`/todos/${id}`),
}

export const documentApi = {
  list: () => api.get('/documents'),
  get: (id: number) => api.get(`/documents/${id}`),
  create: (data: { title?: string; content?: string }) =>
    api.post('/documents', data),
  update: (id: number, data: { title?: string; content?: string }) =>
    api.put(`/documents/${id}`, data),
  remove: (id: number) => api.delete(`/documents/${id}`),
}

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const adminApi = {
  stats: (password: string) =>
    api.get('/admin/stats', { headers: { 'x-admin-password': password } }),
  listUsers: (password: string) =>
    api.get('/admin/users', { headers: { 'x-admin-password': password } }),
  createUser: (password: string, data: { username: string; password: string; email?: string }) =>
    api.post('/admin/users', data, { headers: { 'x-admin-password': password } }),
  deleteUser: (password: string, id: number) =>
    api.delete(`/admin/users/${id}`, { headers: { 'x-admin-password': password } }),
  updatePassword: (password: string, id: number, newPassword: string) =>
    api.put(`/admin/users/${id}/password`, { password: newPassword }, { headers: { 'x-admin-password': password } }),
}

export default api
