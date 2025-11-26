import * as categoriesService from '../services/categories.service.js'

export async function getCategories(req, res) {
  try {
    const categories = await categoriesService.getCategories()
    res.json(categories)
  } catch (error) {
    console.error('Error getting categories:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function createCategory(req, res) {
  try {
    const category = await categoriesService.createCategory(req.body)
    res.status(201).json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function deleteCategory(req, res) {
  try {
    const success = await categoriesService.deleteCategory(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting category:', error)
    res.status(500).json({ error: error.message })
  }
}
