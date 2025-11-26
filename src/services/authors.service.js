import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getAuthors() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM authors ORDER BY name ASC')
  return rows
}

export async function createAuthor(data) {
  const pool = getPool()
  const author = {
    id: randomUUID(),
    name: data.name,
    avatar: data.avatar || null,
    created_at: new Date()
  }

  const { rows } = await pool.query(
    'INSERT INTO authors (id, name, avatar, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [author.id, author.name, author.avatar, author.created_at]
  )

  return rows[0]
}

export async function deleteAuthor(id) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM authors WHERE id = $1', [id])
  return rowCount > 0
}
