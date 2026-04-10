import { DB } from '../database/Database'

export interface TodoRow {
  id: number
  user_id: number
  title: string
  description: string | null
  completed: number
  priority: number
  created_at: number
  updated_at: number
}

export class Todo {
  id: number
  user_id: number
  title: string
  description: string | null
  completed: boolean
  priority: number
  created_at: number
  updated_at: number

  constructor(row: TodoRow) {
    this.id = row.id
    this.user_id = row.user_id
    this.title = row.title
    this.description = row.description
    this.completed = row.completed === 1
    this.priority = row.priority
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }

  static create(userId: number, title: string, description?: string, priority = 0): Todo {
    const result = DB.run(
      'INSERT INTO todos (user_id, title, description, priority) VALUES (?, ?, ?, ?)',
      [userId, title, description ?? null, priority]
    )
    return Todo.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): Todo | null {
    const row = DB.get<TodoRow>('SELECT * FROM todos WHERE id = ?', [id])
    return row ? new Todo(row) : null
  }

  static findByUser(userId: number): Todo[] {
    return DB.all<TodoRow>(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY completed ASC, priority DESC, created_at DESC',
      [userId]
    ).map(r => new Todo(r))
  }

  static update(id: number, userId: number, data: Partial<Pick<TodoRow, 'title' | 'description' | 'completed' | 'priority'>>): Todo | null {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0) }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
    if (!fields.length) return Todo.findById(id)
    fields.push("updated_at = strftime('%s','now')")
    values.push(id, userId)
    DB.run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values)
    return Todo.findById(id)
  }

  static deleteById(id: number, userId: number): void {
    DB.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId])
  }
}
