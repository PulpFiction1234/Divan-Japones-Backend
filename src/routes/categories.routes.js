import { Router } from 'express'
import * as categoriesController from '../controllers/categories.controller.js'

const router = Router()

router.get('/', categoriesController.getCategories)
router.post('/', categoriesController.createCategory)
router.delete('/:id', categoriesController.deleteCategory)

export default router
