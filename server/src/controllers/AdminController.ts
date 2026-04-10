import { Request, Response } from 'express'
import { User } from '../models/User'
import { Todo } from '../models/Todo'
import { Document } from '../models/Document'

export class AdminController {
  static getStats(req: Request, res: Response): void {
    const users = User.findAll()
    const userCount = users.length
    res.json({ userCount })
  }

  static listUsers(req: Request, res: Response): void {
    const users = User.findAll().map(u => u.toPublic())
    res.json({ users })
  }

  static createUser(req: Request, res: Response): void {
    const { username, password, email } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }
    if (User.findByUsername(username)) {
      res.status(409).json({ error: 'Username already exists' })
      return
    }
    const user = User.create(username, password, email)
    res.status(201).json({ user: user.toPublic() })
  }

  static deleteUser(req: Request, res: Response): void {
    const id = parseInt(req.params.id)
    const user = User.findById(id)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    User.deleteById(id)
    res.json({ success: true })
  }

  static updateUserPassword(req: Request, res: Response): void {
    const id = parseInt(req.params.id)
    const { password } = req.body
    if (!password) { res.status(400).json({ error: 'Password required' }); return }
    const user = User.findById(id)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    User.updatePassword(id, password)
    res.json({ success: true })
  }

  static getUserTodos(req: Request, res: Response): void {
    const id = parseInt(req.params.id)
    res.json({ todos: Todo.findByUser(id) })
  }

  static getUserDocuments(req: Request, res: Response): void {
    const id = parseInt(req.params.id)
    res.json({ documents: Document.findByUser(id) })
  }
}
