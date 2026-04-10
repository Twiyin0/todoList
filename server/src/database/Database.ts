import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export class DB {
  private static instance: Database.Database

  static getInstance(): Database.Database {
    if (!DB.instance) {
      const dbDir = path.resolve(__dirname, '../../../data')
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
      DB.instance = new Database(path.join(dbDir, 'app.db'))
      DB.instance.pragma('journal_mode = WAL')
      DB.instance.pragma('foreign_keys = ON')
    }
    return DB.instance
  }

  static run(sql: string, params: unknown[] = []): Database.RunResult {
    return DB.getInstance().prepare(sql).run(...params)
  }

  static get<T>(sql: string, params: unknown[] = []): T | undefined {
    return DB.getInstance().prepare(sql).get(...params) as T | undefined
  }

  static all<T>(sql: string, params: unknown[] = []): T[] {
    return DB.getInstance().prepare(sql).all(...params) as T[]
  }

  static transaction<T>(fn: () => T): T {
    return DB.getInstance().transaction(fn)()
  }
}
