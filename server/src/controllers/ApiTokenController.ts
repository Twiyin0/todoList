import { Request, Response } from 'express'
import { ApiToken } from '../models/ApiToken'

export class ApiTokenController {
  /** GET /api/apitoken */
  static async list(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const tokens = await ApiToken.findByUser(userId)
    res.json({
      tokens: tokens.map(t => ({
        id: t.id,
        name: t.name,
        token: t.token,
        expires_at: t.expires_at,
        created_at: t.created_at,
        expired: t.isExpired(),
      })),
    })
  }

  /** POST /api/apitoken */
  static async create(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const { name, expires_at } = req.body

    let expiresAt: number | undefined
    if (expires_at !== undefined && expires_at !== null) {
      const ts = typeof expires_at === 'number'
        ? expires_at
        : Math.floor(new Date(expires_at).getTime() / 1000)
      if (isNaN(ts)) { res.status(400).json({ error: 'Invalid expires_at' }); return }
      expiresAt = ts
    }

    const token = await ApiToken.create(userId, name ?? '', expiresAt)
    res.status(201).json({
      token: {
        id: token.id,
        name: token.name,
        token: token.token,
        expires_at: token.expires_at,
        created_at: token.created_at,
      },
    })
  }

  /** DELETE /api/apitoken/:id */
  static async remove(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    const id = parseInt(req.params.id)
    await ApiToken.deleteById(id, userId)
    res.json({ success: true })
  }
}
