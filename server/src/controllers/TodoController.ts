import { Request, Response } from 'express'
import { Todo } from '../models/Todo'

export class TodoController {
  static async list(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    res.json({ todos: await Todo.findByUser(userId) })
  }

  static async create(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const { title, description, priority, tag, notice_enabled, notice_time } = req.body
    if (!title) { res.status(400).json({ error: 'Title required' }); return }
    const todo = await Todo.create(
      userId, title, description, priority,
      tag, !!notice_enabled, notice_time ?? undefined
    )
    res.status(201).json({ todo })
  }

  static async update(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const { title, description, completed, priority, tag, notice_enabled, notice_time } = req.body
    const todo = await Todo.update(id, userId, {
      title, description, completed, priority, tag, notice_enabled, notice_time,
    })
    if (!todo) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ todo })
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    await Todo.deleteById(id, userId)
    res.json({ success: true })
  }

  static async notifications(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    res.json({ todos: await Todo.findPendingNotifications(userId) })
  }
}
