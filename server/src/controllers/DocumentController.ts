import { Request, Response } from 'express'
import { Document } from '../models/Document'

export class DocumentController {
  static list(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    res.json({ documents: Document.findByUser(userId) })
  }

  static get(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const doc = Document.findById(id)
    if (!doc || doc.user_id !== userId) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ document: doc })
  }

  static create(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const { title, content } = req.body
    const doc = Document.create(userId, title, content)
    res.status(201).json({ document: doc })
  }

  static update(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const { title, content } = req.body
    const doc = Document.update(id, userId, { title, content })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ document: doc })
  }

  static remove(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    Document.deleteById(id, userId)
    res.json({ success: true })
  }
}
