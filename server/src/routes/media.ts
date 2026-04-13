import { Router } from 'express'
import multer from 'multer'
import { MediaController } from '../controllers/MediaController'
import { authMiddleware } from '../middleware/auth'
import { config } from '../config'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadFileSizeMax * 1024 * 1024 },
})

const router = Router()

router.post('/upload', authMiddleware, upload.single('file') as any, MediaController.upload)
router.get('/:userId/:filename', MediaController.serve)

export default router
