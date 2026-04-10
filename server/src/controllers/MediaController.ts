import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { config } from '../config'

export class MediaController {
  static upload(req: Request, res: Response): void {
    const userId = (req as any).user.userId
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
    const userDir = path.join(config.mediaPath, String(userId))
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })
    const ext = path.extname(req.file.originalname)
    const safeName = `${Date.now()}_${Buffer.from(req.file.originalname, 'latin1').toString('utf8').replace(/[^\w.\-]/g, '_')}`
    const filename = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`
    const dest = path.join(userDir, filename)
    fs.copyFileSync(req.file.path, dest)
    fs.unlinkSync(req.file.path)
    res.json({ url: `/api/media/${userId}/${filename}` })
  }

  static serve(req: Request, res: Response): void {
    const { userId, filename } = req.params
    const filePath = path.join(config.mediaPath, userId, filename)
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Not found' }); return }
    res.sendFile(filePath)
  }
}
