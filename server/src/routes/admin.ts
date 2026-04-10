import { Router } from 'express'
import { AdminController } from '../controllers/AdminController'
import { adminMiddleware } from '../middleware/admin'

const router = Router()

router.use(adminMiddleware)
router.get('/stats', AdminController.getStats)
router.get('/users', AdminController.listUsers)
router.post('/users', AdminController.createUser)
router.delete('/users/:id', AdminController.deleteUser)
router.put('/users/:id/password', AdminController.updateUserPassword)
router.get('/users/:id/todos', AdminController.getUserTodos)
router.get('/users/:id/documents', AdminController.getUserDocuments)

export default router
