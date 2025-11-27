import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getArticles() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM articles ORDER BY published_at DESC')
  // Map DB snake_case fields to camelCase for API consumers
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    subcategory: r.subcategory,
    author: r.author,
    excerpt: r.excerpt,
    content: r.content,
    image: r.image_url,
    type: r.type,
    isActivity: r.is_activity,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
    location: r.location,
    price: r.price,
    viewCount: r.view_count,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }))
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

  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory,
    author: row.author,
    excerpt: row.excerpt,
    content: row.content,
    image: row.image_url,
    type: row.type,
    isActivity: row.is_activity,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    location: row.location,
    price: row.price,
    viewCount: row.view_count,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }
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

  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory,
    author: row.author,
    excerpt: row.excerpt,
    content: row.content,
    image: row.image_url,
    type: row.type,
    isActivity: row.is_activity,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    location: row.location,
    price: row.price,
    viewCount: row.view_count,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }
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
