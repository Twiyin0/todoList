import { DB } from '../database/Database'

export interface TodoRow {
  id: number
  user_id: number
  title: string
  description: string | null
  tag: string | null
  completed: number
  priority: number
  notice_enabled: number
  notice_time: number | null
  deleted_at: number | null
  undo_keep_days: number
  created_at: number
  updated_at: number
}

export class Todo {
  id: number
  user_id: number
  title: string
  description: string | null
  tag: string | null
  completed: boolean
  priority: number
  notice_enabled: boolean
  notice_time: number | null
  deleted_at: number | null
  undo_keep_days: number
  created_at: number
  updated_at: number

  constructor(row: TodoRow) {
    this.id = row.id
    this.user_id = row.user_id
    this.title = row.title
    this.description = row.description
    this.tag = row.tag
    this.completed = row.completed === 1
    this.priority = row.priority
    this.notice_enabled = row.notice_enabled === 1
    this.notice_time = row.notice_time
    this.deleted_at = row.deleted_at
    this.undo_keep_days = row.undo_keep_days
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }

  static async create(
    userId: number,
    title: string,
    description?: string,
    priority = 0,
    tag?: string,
    noticeEnabled = false,
    noticeTime?: number
  ): Promise<Todo> {
    const result = await DB.run(
      'INSERT INTO todos (user_id, title, description, priority, tag, notice_enabled, notice_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, title, description ?? null, priority, tag ?? null, noticeEnabled ? 1 : 0, noticeTime ?? null]
    )
    return (await Todo.findById(result.lastInsertRowid))!
  }

  static async findById(id: number): Promise<Todo | null> {
    const row = await DB.get<TodoRow>('SELECT * FROM todos WHERE id = ?', [id])
    return row ? new Todo(row) : null
  }

  static async findByUser(userId: number): Promise<Todo[]> {
    const rows = await DB.all<TodoRow>(
      'SELECT * FROM todos WHERE user_id = ? AND deleted_at IS NULL ORDER BY completed ASC, priority DESC, created_at DESC',
      [userId]
    )
    return rows.map(r => new Todo(r))
  }

  static async findByUserFiltered(userId: number, filter: {
    tag?: string
    completed?: boolean
    priority?: number
    keyword?: string
    includeDeleted?: boolean
  } = {}): Promise<Todo[]> {
    const conditions: string[] = ['user_id = ?']
    const args: unknown[] = [userId]

    if (!filter.includeDeleted) conditions.push('deleted_at IS NULL')
    if (filter.tag !== undefined) { conditions.push('tag = ?'); args.push(filter.tag) }
    if (filter.completed !== undefined) { conditions.push('completed = ?'); args.push(filter.completed ? 1 : 0) }
    if (filter.priority !== undefined) { conditions.push('priority = ?'); args.push(filter.priority) }
    if (filter.keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      args.push(`%${filter.keyword}%`, `%${filter.keyword}%`)
    }

    const sql = `SELECT * FROM todos WHERE ${conditions.join(' AND ')} ORDER BY completed ASC, priority DESC, created_at DESC`
    const rows = await DB.all<TodoRow>(sql, args)
    return rows.map(r => new Todo(r))
  }

  static async update(
    id: number,
    userId: number,
    data: Partial<Pick<TodoRow, 'title' | 'description' | 'priority' | 'tag' | 'notice_time'> & {
      completed: boolean
      notice_enabled: boolean
    }>
  ): Promise<Todo | null> {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0) }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
    if (data.tag !== undefined) { fields.push('tag = ?'); values.push(data.tag) }
    if (data.notice_enabled !== undefined) { fields.push('notice_enabled = ?'); values.push(data.notice_enabled ? 1 : 0) }
    if (data.notice_time !== undefined) { fields.push('notice_time = ?'); values.push(data.notice_time) }
    if (!fields.length) return Todo.findById(id)
    fields.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000), id, userId)
    await DB.run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, values)
    return Todo.findById(id)
  }

  static async deleteById(id: number, userId: number): Promise<void> {
    await DB.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId])
  }

  static async softDelete(id: number, userId: number, keepDays = 7): Promise<Todo | null> {
    const now = Math.floor(Date.now() / 1000)
    const result = await DB.run(
      'UPDATE todos SET deleted_at = ?, undo_keep_days = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [now, keepDays, id, userId]
    )
    if (result.rowsAffected === 0) return null
    return Todo.findById(id)
  }

  static async restore(id: number, userId: number): Promise<{ todo: Todo | null; status: 'Remain' | 'Expired' | 'NotFound' }> {
    const row = await DB.get<TodoRow>('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, userId])
    if (!row) return { todo: null, status: 'NotFound' }
    if (!row.deleted_at) return { todo: new Todo(row), status: 'Remain' }
    const expiresAt = row.deleted_at + row.undo_keep_days * 86400
    const now = Math.floor(Date.now() / 1000)
    if (now >= expiresAt) return { todo: null, status: 'Expired' }
    await DB.run(
      'UPDATE todos SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?',
      [Math.floor(Date.now() / 1000), id, userId]
    )
    return { todo: await Todo.findById(id), status: 'Remain' }
  }

  static async findPendingNotifications(userId: number): Promise<Todo[]> {
    const now = Math.floor(Date.now() / 1000)
    const rows = await DB.all<TodoRow>(
      'SELECT * FROM todos WHERE user_id = ? AND notice_enabled = 1 AND notice_time <= ? AND deleted_at IS NULL AND completed = 0',
      [userId, now]
    )
    return rows.map(r => new Todo(r))
  }

  static async purgeExpired(): Promise<void> {
    await DB.run(
      "DELETE FROM todos WHERE deleted_at IS NOT NULL AND (deleted_at + undo_keep_days * 86400) < strftime('%s','now')"
    )
  }
}
