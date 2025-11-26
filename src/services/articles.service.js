import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getArticles() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM articles ORDER BY published_at DESC')
  return rows
}

export async function createArticle(data) {
  const pool = getPool()
  const article = {
    id: randomUUID(),
    title: data.title,
    category: data.category || 'General',
    subcategory: data.subcategory || null,
    author: data.author || null,
    excerpt: data.excerpt || null,
    content: data.content || null,
    // Accept multiple possible incoming field names for image and activity
    image_url: data.imageUrl || data.image || data.image_url || null,
    // Determine activity either from explicit flags or scheduledAt
    type: (data.scheduledAt || data.isActivity || data.hasActivity) ? 'activity' : 'publication',
    is_activity: Boolean(data.scheduledAt || data.isActivity || data.hasActivity),
    published_at: data.publishedAt || new Date(),
    scheduled_at: data.scheduledAt || null,
    location: data.location || null,
    price: data.price || null,
    view_count: 0,
    created_at: new Date()
  }

  const { rows } = await pool.query(
    `INSERT INTO articles (
      id, title, category, subcategory, author, excerpt, content, image_url,
      type, is_activity, published_at, scheduled_at, location, price, view_count, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      article.id, article.title, article.category, article.subcategory,
      article.author, article.excerpt, article.content, article.image_url,
      article.type, article.is_activity, article.published_at, article.scheduled_at,
      article.location, article.price, article.view_count, article.created_at
    ]
  )

  return rows[0]
}

export async function updateArticle(id, data) {
  const pool = getPool()
  const isActivity = Boolean(data.scheduledAt)
  
  const { rows } = await pool.query(
    `UPDATE articles SET
      title = $1, category = $2, subcategory = $3, author = $4,
      excerpt = $5, content = $6, image_url = $7, type = $8,
      is_activity = $9, published_at = $10, scheduled_at = $11,
      location = $12, price = $13
    WHERE id = $14
    RETURNING *`,
    [
      data.title, data.category || 'General', data.subcategory || null, data.author || null,
      data.excerpt || null, data.content || null, (data.imageUrl || data.image || data.image_url) || null,
      (data.scheduledAt || data.isActivity || data.hasActivity) ? 'activity' : 'publication',
      Boolean(data.scheduledAt || data.isActivity || data.hasActivity), data.publishedAt || new Date(),
      data.scheduledAt || null, data.location || null, data.price || null, id
    ]
  )

  return rows[0]
}

export async function deleteArticle(id) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM articles WHERE id = $1', [id])
  return rowCount > 0
}

export async function incrementArticleViews(id) {
  const pool = getPool()
  const { rows } = await pool.query(
    'UPDATE articles SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
    [id]
  )
  return rows[0]
}
