import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getCategories() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC')
  return rows
}

export async function createCategory(data) {
  const pool = getPool()
  const category = {
    id: randomUUID(),
    name: data.name,
    slug: data.slug,
    created_at: new Date()
  }

  const { rows } = await pool.query(
    'INSERT INTO categories (id, name, slug, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [category.id, category.name, category.slug, category.created_at]
  )

  return rows[0]
}

export async function deleteCategory(id) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id])
  return rowCount > 0
}

export async function updateCategory(id, data = {}) {
  const pool = getPool()

  // Obtener la categoría actual para usar como fallback del nombre previo
  const currentResult = await pool.query('SELECT * FROM categories WHERE id = $1', [id])
  const current = currentResult.rows[0]
  if (!current) return null

  const nextName = data.name?.trim() || current.name
  const nextSlug = data.slug?.trim() || current.slug
  const previousName = data.previousName?.trim() || current.name

  const { rows } = await pool.query(
    'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING *',
    [nextName, nextSlug, id]
  )

  // Propagar cambio de nombre a artículos existentes que usaban el nombre anterior
  if (previousName && nextName && previousName !== nextName) {
    await pool.query('UPDATE articles SET category = $1 WHERE category = $2', [nextName, previousName])
  }

  return rows[0]
}
