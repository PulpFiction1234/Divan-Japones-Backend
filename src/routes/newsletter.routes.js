import { Router } from 'express'
import * as newsletterController from '../controllers/newsletter.controller.js'

const router = Router()

router.post('/subscribe', newsletterController.subscribe)
router.get('/subscribers', newsletterController.list)

export default router
