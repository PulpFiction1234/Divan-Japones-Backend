import { Router } from 'express'
import * as magazinesController from '../controllers/magazines.controller.js'

const router = Router()

router.get('/', magazinesController.getMagazines)
router.post('/', magazinesController.createMagazine)
router.put('/:id', magazinesController.updateMagazine)
router.delete('/:id', magazinesController.deleteMagazine)

router.get('/:magazineId/articles', magazinesController.getMagazineArticles)
router.post('/:magazineId/articles', magazinesController.createMagazineArticle)
router.put('/:magazineId/articles/:articleId', magazinesController.updateMagazineArticle)
router.delete('/:magazineId/articles/:articleId', magazinesController.deleteMagazineArticle)

export default router
