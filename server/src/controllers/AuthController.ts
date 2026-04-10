import { Request, Response } from 'express'
import { User } from '../models/User'
import { signToken } from '../middleware/auth'

export class AuthController {
  static register(req: Request, res: Response): void {
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
    const token = signToken({ userId: user.id, username: user.username })
    res.json({ token, user: user.toPublic() })
  }

  static login(req: Request, res: Response): void {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' })
      return
    }
    const user = User.findByUsername(username)
    if (!user || !user.verifyPassword(password)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const token = signToken({ userId: user.id, username: user.username })
    res.json({ token, user: user.toPublic() })
  }

  static me(req: Request, res: Response): void {
    const { userId } = (req as any).user
    const user = User.findById(userId)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user: user.toPublic() })
  }
}
