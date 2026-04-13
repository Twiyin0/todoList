import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { config } from '../config'

// Lazy-init upyun client only when env vars are present
let _upyunClient: any = null
function getUpyunClient(): any {
  if (_upyunClient) return _upyunClient
  const { UPYUN_BUCKET, UPYUN_OPERATOR, UPYUN_PASSWORD } = process.env
  if (!UPYUN_BUCKET || !UPYUN_OPERATOR || !UPYUN_PASSWORD) return null
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const upyun = require('upyun')
  const service = new upyun.Service(UPYUN_BUCKET, UPYUN_OPERATOR, UPYUN_PASSWORD)
  _upyunClient = new upyun.Client(service)
  return _upyunClient
}

function getUpyunUrl(remotePath: string): string {
  const domain = process.env.UPYUN_DOMAIN
    || `https://${process.env.UPYUN_BUCKET}.test.upcdn.net`
  return `${domain.replace(/\/$/, '')}${remotePath}`
}

function sanitizeName(originalname: string): string {
  const decoded = Buffer.from(originalname, 'latin1').toString('utf8')
  return decoded.replace(/[^\w.\-]/g, '_')
}

export class MediaController {
  static async upload(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user.userId
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }

    const ext = path.extname(req.file.originalname)
    const safeName = `${Date.now()}_${sanitizeName(req.file.originalname)}`
    const filename = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`
    const basePath = (process.env.UPYUN_BASE_PATH || '/media').replace(/\/$/, '')
    const remotePath = `${basePath}/${userId}/${filename}`

    const upyunClient = getUpyunClient()

    if (upyunClient) {
      // Production: upload to upyun
      try {
        await upyunClient.putFile(remotePath, req.file.buffer, {
          'Content-Type': req.file.mimetype,
        })
        res.json({ url: getUpyunUrl(remotePath) })
      } catch (err: any) {
        res.status(500).json({ error: `Upload failed: ${err.message}` })
      }
    } else {
      // Local dev: save to disk
      const userDir = path.join(config.mediaPath, String(userId))
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })
      const dest = path.join(userDir, filename)
      fs.writeFileSync(dest, req.file.buffer)
      res.json({ url: `/api/media/${userId}/${filename}` })
    }
  }

  static serve(req: Request, res: Response): void {
    const { userId, filename } = req.params
    const filePath = path.join(config.mediaPath, userId, filename)
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Not found' }); return }
    res.sendFile(filePath)
  }
}
