import { createClient, type Client, type InValue } from '@libsql/client'
import path from 'path'
import fs from 'fs'

let _client: Client | null = null

function getClient(): Client {
  if (!_client) {
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (tursoUrl) {
      _client = createClient({ url: tursoUrl, authToken })
    } else {
      // Local dev: use SQLite file
      const dbDir = path.resolve(__dirname, '../../../data')
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
      _client = createClient({ url: `file:${path.join(dbDir, 'app.db')}` })
    }
  }
  return _client
}

function normalizeRow(row: Record<string, InValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    result[k] = typeof v === 'bigint' ? Number(v) : v
  }
  return result
}

export interface RunResult {
  lastInsertRowid: number
  rowsAffected: number
}

export class DB {
  static async run(sql: string, args: unknown[] = []): Promise<RunResult> {
    const rs = await getClient().execute({ sql, args: args as InValue[] })
    return {
      lastInsertRowid: Number(rs.lastInsertRowid ?? 0),
      rowsAffected: rs.rowsAffected,
    }
  }

  static async get<T>(sql: string, args: unknown[] = []): Promise<T | undefined> {
    const rs = await getClient().execute({ sql, args: args as InValue[] })
    if (rs.rows.length === 0) return undefined
    return normalizeRow(rs.rows[0] as unknown as Record<string, InValue>) as unknown as T
  }

  static async all<T>(sql: string, args: unknown[] = []): Promise<T[]> {
    const rs = await getClient().execute({ sql, args: args as InValue[] })
    return rs.rows.map(r => normalizeRow(r as unknown as Record<string, InValue>)) as unknown as T[]
  }

  static async batch(statements: Array<{ sql: string; args?: unknown[] }>): Promise<void> {
    await getClient().batch(
      statements.map(s => ({ sql: s.sql, args: (s.args ?? []) as InValue[] })),
      'write'
    )
  }
}
