import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'vue-todo-secret-key-2024'

export interface JwtPayload {
  userId: number
  username: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    ;(req as Request & { user: JwtPayload }).user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
