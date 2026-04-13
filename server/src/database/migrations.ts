import { DB } from './Database'

export async function runMigrations(): Promise<void> {
  await DB.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        register_ip TEXT,
        register_ua TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        tag TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 0,
        notice_enabled INTEGER NOT NULL DEFAULT 0,
        notice_time INTEGER,
        deleted_at INTEGER,
        undo_keep_days INTEGER NOT NULL DEFAULT 7,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    },
  ])

  // Add columns to existing tables (ignored if already exists)
  for (const sql of [
    'ALTER TABLE users ADD COLUMN register_ip TEXT',
    'ALTER TABLE users ADD COLUMN register_ua TEXT',
    'ALTER TABLE todos ADD COLUMN tag TEXT',
    // Migrate data from old `type` column to `tag` if it existed
    'UPDATE todos SET tag = type WHERE tag IS NULL AND type IS NOT NULL',
    'ALTER TABLE todos ADD COLUMN notice_enabled INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE todos ADD COLUMN notice_time INTEGER',
    'ALTER TABLE todos ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE todos ADD COLUMN undo_keep_days INTEGER NOT NULL DEFAULT 7',
  ]) {
    try { await DB.run(sql) } catch { /* column already exists */ }
  }
}
