import { Router } from 'express'
import { DocumentController } from '../controllers/DocumentController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.get('/', DocumentController.list)
router.get('/:id', DocumentController.get)
router.post('/', DocumentController.create)
router.put('/:id', DocumentController.update)
router.delete('/:id', DocumentController.remove)

export default router
