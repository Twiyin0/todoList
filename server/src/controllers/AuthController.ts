import { Request, Response } from 'express'
import { User } from '../models/User'
import { signToken } from '../middleware/auth'

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { username, password, email } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }
    if (await User.findByUsername(username)) {
      res.status(409).json({ error: 'Username already exists' })
      return
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      || req.socket.remoteAddress
      || null
    const ua = req.headers['user-agent'] || null
    const user = await User.create(username, password, email, ip ?? undefined, ua ?? undefined)
    const token = signToken({ userId: user.id, username: user.username })
    res.json({ token, user: user.toPublic() })
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }
    const user = await User.findByUsername(username)
    if (!user || !user.verifyPassword(password)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const token = signToken({ userId: user.id, username: user.username })
    res.json({ token, user: user.toPublic() })
  }

  static async me(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user
    const user = await User.findById(userId)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user: user.toPublic() })
  }
}
