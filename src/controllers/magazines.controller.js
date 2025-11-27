import * as magazinesService from '../services/magazines.service.js'

export async function getMagazines(req, res) {
  try {
    const magazines = await magazinesService.getMagazines()
    res.json(magazines)
  } catch (error) {
    console.error('Error getting magazines:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function createMagazine(req, res) {
  try {
    const magazine = await magazinesService.createMagazine(req.body)
    res.status(201).json(magazine)
  } catch (error) {
    console.error('Error creating magazine:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function updateMagazine(req, res) {
  try {
    const magazine = await magazinesService.updateMagazine(req.params.id, req.body)
    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' })
    }
    res.json(magazine)
  } catch (error) {
    console.error('Error updating magazine:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function deleteMagazine(req, res) {
  try {
    const success = await magazinesService.deleteMagazine(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Magazine not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting magazine:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function getMagazineArticles(req, res) {
  try {
    const articles = await magazinesService.getMagazineArticles(req.params.magazineId)
    res.json(articles)
  } catch (error) {
    console.error('Error getting magazine articles:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function createMagazineArticle(req, res) {
  try {
    const article = await magazinesService.createMagazineArticle(req.params.magazineId, req.body)
    res.status(201).json(article)
  } catch (error) {
    console.error('Error creating magazine article:', error)
    const status = error.status && Number.isInteger(error.status) ? error.status : 500
    res.status(status).json({ error: error.message })
  }
}

export async function updateMagazineArticle(req, res) {
  try {
    const article = await magazinesService.updateMagazineArticle(
      req.params.magazineId,
      req.params.articleId,
      req.body
    )
    if (!article) {
      return res.status(404).json({ error: 'Magazine article not found' })
    }
    res.json(article)
  } catch (error) {
    console.error('Error updating magazine article:', error)
    const status = error.status && Number.isInteger(error.status) ? error.status : 500
    res.status(status).json({ error: error.message })
  }
}

export async function deleteMagazineArticle(req, res) {
  try {
    const success = await magazinesService.deleteMagazineArticle(req.params.articleId)
    if (!success) {
      return res.status(404).json({ error: 'Magazine article not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting magazine article:', error)
    res.status(500).json({ error: error.message })
  }
}
