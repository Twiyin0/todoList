import { DB } from './Database'

export function runMigrations(): void {
  DB.getInstance().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
}
