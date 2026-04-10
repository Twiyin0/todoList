import { DB } from '../database/Database'
import md5 from 'md5'

export interface UserRow {
  id: number
  username: string
  password: string
  email: string | null
  created_at: number
  updated_at: number
}

export class User {
  id: number
  username: string
  password: string
  email: string | null
  created_at: number
  updated_at: number

  constructor(row: UserRow) {
    this.id = row.id
    this.username = row.username
    this.password = row.password
    this.email = row.email
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }

  static create(username: string, password: string, email?: string): User {
    const hashed = md5(password)
    const result = DB.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashed, email ?? null]
    )
    return User.findById(result.lastInsertRowid as number)!
  }

  static findById(id: number): User | null {
    const row = DB.get<UserRow>('SELECT * FROM users WHERE id = ?', [id])
    return row ? new User(row) : null
  }

  static findByUsername(username: string): User | null {
    const row = DB.get<UserRow>('SELECT * FROM users WHERE username = ?', [username])
    return row ? new User(row) : null
  }

  static findAll(): User[] {
    return DB.all<UserRow>('SELECT * FROM users ORDER BY created_at DESC').map(r => new User(r))
  }

  static deleteById(id: number): void {
    DB.run('DELETE FROM users WHERE id = ?', [id])
  }

  static updatePassword(id: number, password: string): void {
    DB.run(
      'UPDATE users SET password = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?',
      [md5(password), id]
    )
  }

  verifyPassword(password: string): boolean {
    return this.password === md5(password)
  }

  toPublic() {
    return { id: this.id, username: this.username, email: this.email, created_at: this.created_at }
  }
}
