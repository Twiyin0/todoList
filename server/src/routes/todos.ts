import { Router } from 'express'
import { TodoController } from '../controllers/TodoController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.get('/', TodoController.list)
router.get('/notifications', TodoController.notifications)
router.post('/', TodoController.create)
router.put('/:id', TodoController.update)
router.delete('/:id', TodoController.remove)

export default router
