import { DB } from '../database/Database'
import md5 from 'md5'

export interface UserRow {
  id: number
  username: string
  password: string
  email: string | null
  register_ip: string | null
  register_ua: string | null
  created_at: number
  updated_at: number
}

export class User {
  id: number
  username: string
  password: string
  email: string | null
  register_ip: string | null
  register_ua: string | null
  created_at: number
  updated_at: number

  constructor(row: UserRow) {
    this.id = row.id
    this.username = row.username
    this.password = row.password
    this.email = row.email
    this.register_ip = row.register_ip
    this.register_ua = row.register_ua
    this.created_at = row.created_at
    this.updated_at = row.updated_at
  }

  static async create(username: string, password: string, email?: string, registerIp?: string, registerUa?: string): Promise<User> {
    const hashed = md5(password)
    const result = await DB.run(
      'INSERT INTO users (username, password, email, register_ip, register_ua) VALUES (?, ?, ?, ?, ?)',
      [username, hashed, email ?? null, registerIp ?? null, registerUa ?? null]
    )
    return (await User.findById(result.lastInsertRowid))!
  }

  static async findById(id: number): Promise<User | null> {
    const row = await DB.get<UserRow>('SELECT * FROM users WHERE id = ?', [id])
    return row ? new User(row) : null
  }

  static async findByUsername(username: string): Promise<User | null> {
    const row = await DB.get<UserRow>('SELECT * FROM users WHERE username = ?', [username])
    return row ? new User(row) : null
  }

  static async findAll(): Promise<User[]> {
    const rows = await DB.all<UserRow>('SELECT * FROM users ORDER BY created_at DESC')
    return rows.map(r => new User(r))
  }

  static async deleteById(id: number): Promise<void> {
    await DB.run('DELETE FROM users WHERE id = ?', [id])
  }

  static async updatePassword(id: number, password: string): Promise<void> {
    await DB.run(
      "UPDATE users SET password = ?, updated_at = strftime('%s','now') WHERE id = ?",
      [md5(password), id]
    )
  }

  verifyPassword(password: string): boolean {
    return this.password === md5(password)
  }

  toPublic() {
    return { id: this.id, username: this.username, email: this.email, created_at: this.created_at }
  }

  toAdmin() {
    return { ...this.toPublic(), register_ip: this.register_ip, register_ua: this.register_ua }
  }
}
