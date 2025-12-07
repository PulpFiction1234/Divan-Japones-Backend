import { Router } from 'express'
import * as authorsController from '../controllers/authors.controller.js'

const router = Router()

router.get('/', authorsController.getAuthors)
router.post('/', authorsController.createAuthor)
router.put('/:id', authorsController.updateAuthor)
router.delete('/:id', authorsController.deleteAuthor)

export default router
