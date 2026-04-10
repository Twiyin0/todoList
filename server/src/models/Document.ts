import { DB } from '../database/Database'

export interface DocumentRow {
  id: number
  user_id: number
  title: string
  content: string
  created_at: number
  updated_at: number
}

export class Document {
  id: number
  user_id: number
  title: string
  content: string
  created_at: number
  updated_at: number

  constructor(row: DocumentRow) {
    this.id = row.id
    this.user_id = row.user_id
    this.title = row.title
    this.content = row.content
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }

  static create(userId: number, title = 'Untitled', content = ''): Document {
    const result = DB.run(
      'INSERT INTO documents (user_id, title, content) VALUES (?, ?, ?)',
      [userId, title, content]
    )
    return Document.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): Document | null {
    const row = DB.get<DocumentRow>('SELECT * FROM documents WHERE id = ?', [id])
    return row ? new Document(row) : null
  }

  static findByUser(userId: number): Document[] {
    return DB.all<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    ).map(r => new Document(r))
  }

  static update(id: number, userId: number, data: Partial<Pick<DocumentRow, 'title' | 'content'>>): Document | null {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
    if (!fields.length) return Document.findById(id)
    fields.push("updated_at = strftime('%s','now')")
    values.push(id, userId)
    DB.run(`UPDATE documents SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values)
    return Document.findById(id)
  }

  static deleteById(id: number, userId: number): void {
    DB.run('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, userId])
  }
}
