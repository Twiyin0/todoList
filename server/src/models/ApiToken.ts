import { DB } from '../database/Database'
import crypto from 'crypto'

function getSecret(): string {
  return process.env.JWT_SECRET ?? 'default-secret'
}

function sign(userId: number, ts: number): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${userId}:${ts}`)
    .digest('base64url')
    .slice(0, 4)
}

export interface ApiTokenRow {
  id: number
  user_id: number
  token: string
  name: string
  expires_at: number | null
  created_at: number
}

export class ApiToken {
  id: number
  user_id: number
  token: string
  name: string
  expires_at: number | null
  created_at: number

  constructor(row: ApiTokenRow) {
    this.id = row.id
    this.user_id = row.user_id
    this.token = row.token
    this.name = row.name
    this.expires_at = row.expires_at
    this.created_at = row.created_at
  }

  isExpired(): boolean {
    if (!this.expires_at) return false
    return Math.floor(Date.now() / 1000) > this.expires_at
  }

  static async create(userId: number, name: string, expiresAt?: number): Promise<ApiToken> {
    const now = Math.floor(Date.now() / 1000)
    const sig = sign(userId, now)
    const token = `${userId}_${now.toString(36)}_${sig}`
    const result = await DB.run(
      'INSERT INTO api_tokens (user_id, token, name, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, token, name, expiresAt ?? null, now]
    )
    return (await ApiToken.findById(Number(result.lastInsertRowid)))!
  }

  static async findById(id: number): Promise<ApiToken | null> {
    const row = await DB.get<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = ?', [id])
    return row ? new ApiToken(row) : null
  }

  static async findByToken(token: string): Promise<ApiToken | null> {
    const parts = token.split('_')
    if (parts.length !== 3) return null
    const userId = parseInt(parts[0], 10)
    const ts = parseInt(parts[1], 36)
    if (isNaN(userId) || isNaN(ts)) return null
    // Verify signature before hitting DB
    if (sign(userId, ts) !== parts[2]) return null
    const row = await DB.get<ApiTokenRow>(
      'SELECT * FROM api_tokens WHERE token = ? AND user_id = ?',
      [token, userId]
    )
    if (!row) return null
    const apiToken = new ApiToken(row)
    // Auto-delete expired tokens
    if (apiToken.isExpired()) {
      await DB.run('DELETE FROM api_tokens WHERE id = ?', [apiToken.id])
      return null
    }
    return apiToken
  }

  static async findByUser(userId: number): Promise<ApiToken[]> {
    const rows = await DB.all<ApiTokenRow>(
      'SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    return rows.map(r => new ApiToken(r))
  }

  static async deleteById(id: number, userId: number): Promise<void> {
    await DB.run('DELETE FROM api_tokens WHERE id = ? AND user_id = ?', [id, userId])
  }
}
