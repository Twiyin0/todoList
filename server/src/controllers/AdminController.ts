import { Request, Response } from 'express'
import { User } from '../models/User'
import { Todo } from '../models/Todo'
import { Document } from '../models/Document'

export class AdminController {
  static async getStats(_req: Request, res: Response): Promise<void> {
    const users = await User.findAll()
    res.json({ userCount: users.length })
  }

  static async listUsers(_req: Request, res: Response): Promise<void> {
    const users = (await User.findAll()).map(u => u.toAdmin())
    res.json({ users })
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    const { username, password, email } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }
    if (await User.findByUsername(username)) {
      res.status(409).json({ error: 'Username already exists' })
      return
    }
    const user = await User.create(username, password, email)
    res.status(201).json({ user: user.toPublic() })
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id)
    const user = await User.findById(id)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    await User.deleteById(id)
    res.json({ success: true })
  }

  static async updateUserPassword(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id)
    const { password } = req.body
    if (!password) { res.status(400).json({ error: 'Password required' }); return }
    const user = await User.findById(id)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    await User.updatePassword(id, password)
    res.json({ success: true })
  }

  static async getUserTodos(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id)
    res.json({ todos: await Todo.findByUser(id) })
  }

  static async getUserDocuments(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id)
    res.json({ documents: await Document.findByUser(id) })
  }
}
