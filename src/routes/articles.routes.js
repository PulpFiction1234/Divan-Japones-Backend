import { Router } from 'express'
import * as articlesController from '../controllers/articles.controller.js'

const router = Router()

router.get('/', articlesController.getArticles)
router.post('/', articlesController.createArticle)
router.put('/:id', articlesController.updateArticle)
router.delete('/:id', articlesController.deleteArticle)
router.post('/:id/increment-views', articlesController.incrementArticleViews)

export default router
