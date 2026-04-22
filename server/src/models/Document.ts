import { DB } from '../database/Database'

export interface DocumentRow {
  id: number
  user_id: number
  title: string
  content: string
  created_at: number
  updated_at: number
}

export interface CollaboratorRow {
  id: number
  doc_id: number
  owner_id: number
  user_id: number | null
  invite_token: string
  status: 'pending' | 'accepted'
  created_at: number
  username?: string
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

  static async findSharedWithUser(userId: number): Promise<Document[]> {
    const rows = await DB.all<DocumentRow>(
      `SELECT d.* FROM documents d
       INNER JOIN doc_collaborators c ON c.doc_id = d.id
       WHERE c.user_id = ? AND c.status = 'accepted' ORDER BY d.updated_at DESC`,
      [userId]
    )
    return rows.map(r => new Document(r))
  }

  static async canAccess(docId: number, userId: number): Promise<boolean> {
    const doc = await Document.findById(docId)
    if (!doc) return false
    if (doc.user_id === userId) return true
    const row = await DB.get(
      "SELECT id FROM doc_collaborators WHERE doc_id = ? AND user_id = ? AND user_id != 0 AND status = 'accepted'",
      [docId, userId]
    )
    return !!row
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
    fields.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000), id)
    await DB.run(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values)
    return Document.findById(id)
  }

  static async deleteById(id: number, userId: number): Promise<void> {
    await DB.run('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, userId])
  }

  static async createInvite(docId: number, ownerId: number, inviteToken: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    await DB.run(
      'INSERT INTO doc_collaborators (doc_id, owner_id, invite_token, status, created_at) VALUES (?, ?, ?, ?, ?)',
      [docId, ownerId, inviteToken, 'pending', now]
    )
  }

  static async findInviteByToken(token: string): Promise<CollaboratorRow | null> {
    const row = await DB.get<CollaboratorRow>(
      'SELECT * FROM doc_collaborators WHERE invite_token = ?',
      [token]
    )
    return row ?? null
  }

  static async acceptInvite(token: string, userId: number): Promise<boolean> {
    // Check not already a collaborator
    const invite = await Document.findInviteByToken(token)
    if (!invite || invite.status === 'accepted') return false
    if (invite.user_id !== null && invite.user_id !== userId) return false
    await DB.run(
      "UPDATE doc_collaborators SET user_id = ?, status = 'accepted' WHERE invite_token = ?",
      [userId, token]
    )
    return true
  }

  static async removeCollaborator(docId: number, ownerId: number, userId: number): Promise<void> {
    await DB.run(
      'DELETE FROM doc_collaborators WHERE doc_id = ? AND owner_id = ? AND user_id = ?',
      [docId, ownerId, userId]
    )
  }

  static async getCollaborators(docId: number): Promise<CollaboratorRow[]> {
    return DB.all<CollaboratorRow>(
      `SELECT c.*, u.username FROM doc_collaborators c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.doc_id = ?`,
      [docId]
    )
  }
}
