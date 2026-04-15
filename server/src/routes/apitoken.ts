import { Router } from 'express'
import { ApiTokenController } from '../controllers/ApiTokenController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.get('/', ApiTokenController.list)
router.post('/', ApiTokenController.create)
router.delete('/:id', ApiTokenController.remove)

export default router
