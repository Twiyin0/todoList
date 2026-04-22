import { Request, Response } from 'express'
import { Document } from '../models/Document'

export class DocumentController {
  static async list(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const [owned, shared] = await Promise.all([
      Document.findByUser(userId),
      Document.findSharedWithUser(userId),
    ])
    res.json({ documents: owned, sharedDocuments: shared })
  }

  static async get(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    const doc = await Document.findById(id)
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const canAccess = await Document.canAccess(id, userId)
    if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return }
    const collaborators = await Document.getCollaborators(id)
    res.json({ document: doc, isOwner: doc.user_id === userId, collaborators })
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
    const canAccess = await Document.canAccess(id, userId)
    if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return }
    const { title, content } = req.body
    // Only owner can rename
    const doc = await Document.findById(id)
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const data: Partial<{ title: string; content: string }> = {}
    if (content !== undefined) data.content = content
    if (title !== undefined && doc.user_id === userId) data.title = title
    const updated = await Document.update(id, userId, data)
    res.json({ document: updated })
  }

  static async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    await Document.deleteById(id, userId)
    res.json({ success: true })
  }
}
