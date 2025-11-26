import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'

const router = Router()

router.post('/login', authController.login)
router.get('/health', authController.health)

export default router
