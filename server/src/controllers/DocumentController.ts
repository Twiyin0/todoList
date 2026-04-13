import { Request, Response } from 'express'
import { Document } from '../models/Document'

export class DocumentController {
  static async list(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    res.json({ documents: await Document.findByUser(userId) })
  }

  static async get(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const doc = await Document.findById(id)
    if (!doc || doc.user_id !== userId) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ document: doc })
  }

  static async create(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const { title, content } = req.body
    const doc = await Document.create(userId, title, content)
    res.status(201).json({ document: doc })
  }

  static async update(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const { title, content } = req.body
    const doc = await Document.update(id, userId, { title, content })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ document: doc })
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    await Document.deleteById(id, userId)
    res.json({ success: true })
  }
}
