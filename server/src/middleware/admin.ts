import { Request, Response, NextFunction } from 'express'
import { config } from '../config'

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const password = req.headers['x-admin-password'] as string
  if (!password || password.toLowerCase() !== config.adminPassword.toLowerCase()) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
