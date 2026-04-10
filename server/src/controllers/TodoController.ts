import { Request, Response } from 'express'
import { Todo } from '../models/Todo'

export class TodoController {
  static list(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    res.json({ todos: Todo.findByUser(userId) })
  }

  static create(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const { title, description, priority } = req.body
    if (!title) { res.status(400).json({ error: 'Title required' }); return }
    const todo = Todo.create(userId, title, description, priority)
    res.status(201).json({ todo })
  }

  static update(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const { title, description, completed, priority } = req.body
    const todo = Todo.update(id, userId, { title, description, completed, priority })
    if (!todo) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ todo })
  }

  static remove(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    Todo.deleteById(id, userId)
    res.json({ success: true })
  }
}
