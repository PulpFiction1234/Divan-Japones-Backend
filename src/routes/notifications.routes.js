import { Router } from 'express'
import { flushPending } from '../controllers/notifications.controller.js'

const router = Router()

// Manual endpoint to send pending scheduled notifications
router.post('/flush-pending', flushPending)

export default router
