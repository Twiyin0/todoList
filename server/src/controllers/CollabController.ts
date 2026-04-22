import { Request, Response } from 'express'
import { Document } from '../models/Document'
import crypto from 'crypto'

export class CollabController {
  /** POST /api/documents/:id/collab/invite — owner generates invite link */
  static async invite(req: Request, res: Response): Promise<void> {
    const ownerId = (req as any).user.userId
    const docId = parseInt(req.params.id)
    const doc = await Document.findById(docId)
    if (!doc || doc.user_id !== ownerId) { res.status(403).json({ error: 'Forbidden' }); return }
    const token = crypto.randomBytes(16).toString('hex')
    await Document.createInvite(docId, ownerId, token)
    res.json({ token })
  }

  /** GET /api/collab/invite/:token — get invite info (public, no auth needed) */
  static async getInvite(req: Request, res: Response): Promise<void> {
    const { token } = req.params
    const invite = await Document.findInviteByToken(token)
    if (!invite) { res.status(404).json({ error: 'Invite not found or expired' }); return }
    const doc = await Document.findById(invite.doc_id)
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return }
    res.json({
      docId: invite.doc_id,
      docTitle: doc.title,
      status: invite.status,
    })
  }

  /** POST /api/collab/invite/:token/accept — logged-in user accepts invite */
  static async acceptInvite(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const { token } = req.params
    const invite = await Document.findInviteByToken(token)
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return }
    if (invite.owner_id === userId) { res.status(400).json({ error: 'Cannot accept your own invite' }); return }
    if (invite.status === 'accepted') { res.json({ success: true, docId: invite.doc_id, alreadyAccepted: true }); return }
    const ok = await Document.acceptInvite(token, userId)
    if (!ok) { res.status(400).json({ error: 'Failed to accept invite' }); return }
    res.json({ success: true, docId: invite.doc_id })
  }

  /** DELETE /api/documents/:id/collab/invite/:inviteId — owner revokes pending invite */
  static async revokeInvite(req: Request, res: Response): Promise<void> {
    const ownerId = (req as any).user.userId
    const docId = parseInt(req.params.id)
    const inviteId = parseInt(req.params.inviteId)
    const doc = await Document.findById(docId)
    if (!doc || doc.user_id !== ownerId) { res.status(403).json({ error: 'Forbidden' }); return }
    await Document.revokeInvite(inviteId, ownerId)
    res.json({ success: true })
  }

  /** DELETE /api/documents/:id/collab/:userId — owner removes collaborator */
  static async remove(req: Request, res: Response): Promise<void> {
    const ownerId = (req as any).user.userId
    const docId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)
    const doc = await Document.findById(docId)
    if (!doc || doc.user_id !== ownerId) { res.status(403).json({ error: 'Forbidden' }); return }
    await Document.removeCollaborator(docId, ownerId, userId)
    res.json({ success: true })
  }

  /** GET /api/documents/:id/collab — list collaborators */
  static async list(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const docId = parseInt(req.params.id)
    const canAccess = await Document.canAccess(docId, userId)
    if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return }
    const collaborators = await Document.getCollaborators(docId)
    res.json({ collaborators })
  }

  /** GET /api/documents/:id/collab/poll — polling: returns doc if updated after ?since= */
  static async poll(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const docId = parseInt(req.params.id)
    const since = parseInt(req.query.since as string) || 0
    const canAccess = await Document.canAccess(docId, userId)
    if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return }
    const doc = await Document.findById(docId)
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    if (doc.updated_at > since) {
      res.json({ updated: true, content: doc.content, title: doc.title, updated_at: doc.updated_at })
    } else {
      res.json({ updated: false })
    }
  }
}
