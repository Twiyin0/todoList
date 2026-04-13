import { Router } from 'express'
import { ExternalController } from '../controllers/ExternalController'

const router = Router()

router.post('/todo/add', ExternalController.addTodo)
router.post('/todo/delete', ExternalController.deleteTodo)
router.post('/todo/undodelete', ExternalController.undoDelete)
router.post('/todo/complete', ExternalController.completeTodo)
router.post('/todo/listTodoList', ExternalController.listTodoList)
router.post('/todo/getTodo', ExternalController.getTodo)
router.post('/todo/todoStatus', ExternalController.todoStatus)
router.post('/todo/updateTodo', ExternalController.updateTodo)
router.post('/todo/notifications', ExternalController.getNotifications)

export default router
