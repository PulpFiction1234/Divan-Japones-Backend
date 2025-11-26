import * as authorsService from '../services/authors.service.js'

export async function getAuthors(req, res) {
  try {
    const authors = await authorsService.getAuthors()
    res.json(authors)
  } catch (error) {
    console.error('Error getting authors:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function createAuthor(req, res) {
  try {
    const author = await authorsService.createAuthor(req.body)
    res.status(201).json(author)
  } catch (error) {
    console.error('Error creating author:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function deleteAuthor(req, res) {
  try {
    const success = await authorsService.deleteAuthor(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Author not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting author:', error)
    res.status(500).json({ error: error.message })
  }
}
