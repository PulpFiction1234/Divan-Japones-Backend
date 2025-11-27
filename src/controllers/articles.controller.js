import * as articlesService from '../services/articles.service.js'

export async function getArticles(req, res) {
  try {
    const articles = await articlesService.getArticles()
    res.json(articles)
  } catch (error) {
    console.error('Error getting articles:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function createArticle(req, res) {
  try {
    // Temporary debug log: dump incoming body to server logs to help diagnose missing activity fields
    console.log('[DEBUG] createArticle req.body =', JSON.stringify(req.body))
    const article = await articlesService.createArticle(req.body)
    res.status(201).json(article)
  } catch (error) {
    console.error('Error creating article:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function updateArticle(req, res) {
  try {
    // Temporary debug log for update
    console.log('[DEBUG] updateArticle req.body =', JSON.stringify(req.body))
    const article = await articlesService.updateArticle(req.params.id, req.body)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function deleteArticle(req, res) {
  try {
    const success = await articlesService.deleteArticle(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting article:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function incrementArticleViews(req, res) {
  try {
    const article = await articlesService.incrementArticleViews(req.params.id)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json(article)
  } catch (error) {
    console.error('Error incrementing views:', error)
    res.status(500).json({ error: error.message })
  }
}
