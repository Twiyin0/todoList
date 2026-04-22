import { Router } from 'express'
import { DocumentController } from '../controllers/DocumentController'
import { CollabController } from '../controllers/CollabController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)
router.get('/', DocumentController.list)
router.get('/:id', DocumentController.get)
router.post('/', DocumentController.create)
router.put('/:id', DocumentController.update)
router.delete('/:id', DocumentController.remove)

// Collab routes
router.get('/:id/collab', CollabController.list)
router.get('/:id/collab/poll', CollabController.poll)
router.post('/:id/collab/invite', CollabController.invite)
router.delete('/:id/collab/invite/:inviteId', CollabController.revokeInvite)
router.delete('/:id/collab/:userId', CollabController.remove)

export default router


