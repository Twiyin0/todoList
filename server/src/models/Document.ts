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

  static async create(userId: number, title = 'Untitled', content = ''): Promise<Document> {
    const result = await DB.run(
      'INSERT INTO documents (user_id, title, content) VALUES (?, ?, ?)',
      [userId, title, content]
    )
    return (await Document.findById(result.lastInsertRowid))!
  }

  static async findById(id: number): Promise<Document | null> {
    const row = await DB.get<DocumentRow>('SELECT * FROM documents WHERE id = ?', [id])
    return row ? new Document(row) : null
  }

  static async findByUser(userId: number): Promise<Document[]> {
    const rows = await DB.all<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    )
    return rows.map(r => new Document(r))
  }

  static async update(
    id: number,
    userId: number,
    data: Partial<Pick<DocumentRow, 'title' | 'content'>>
  ): Promise<Document | null> {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
    if (!fields.length) return Document.findById(id)
    fields.push("updated_at = strftime('%s','now')")
    values.push(id, userId)
    await DB.run(`UPDATE documents SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values)
    return Document.findById(id)
  }

  static async deleteById(id: number, userId: number): Promise<void> {
    await DB.run('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, userId])
  }
}
