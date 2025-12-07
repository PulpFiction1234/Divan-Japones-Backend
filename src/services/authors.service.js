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

export async function updateAuthor(id, data) {
  const pool = getPool()

  const existingResult = await pool.query('SELECT * FROM authors WHERE id = $1', [id])
  if (!existingResult.rowCount) {
    return null
  }

  const existing = existingResult.rows[0]
  const previousName = existing.name

  const name = (data.name ?? existing.name)?.trim()
  if (!name) {
    const err = new Error('El nombre del autor es obligatorio')
    err.status = 400
    throw err
  }

  const avatar = typeof data.avatar === 'string' && data.avatar.trim()
    ? data.avatar.trim()
    : existing.avatar

  const { rows } = await pool.query(
    'UPDATE authors SET name = $1, avatar = $2 WHERE id = $3 RETURNING *',
    [name, avatar, id]
  )

  // Propagate new name to related content when it matches the previous name
  if (previousName && previousName !== name) {
    await pool.query('UPDATE articles SET author = $1 WHERE author = $2', [name, previousName])
    await pool.query('UPDATE magazine_articles SET author = $1 WHERE author = $2', [name, previousName])
  }

  return rows[0]
}

export async function deleteAuthor(id) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM authors WHERE id = $1', [id])
  return rowCount > 0
}
