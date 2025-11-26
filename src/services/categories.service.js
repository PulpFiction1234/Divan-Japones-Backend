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
