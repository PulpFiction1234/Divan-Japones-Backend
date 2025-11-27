import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getMagazines() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM magazines ORDER BY release_date DESC')
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    pdfSource: r.pdf_source,
    viewerUrl: r.viewer_url,
    coverImage: r.cover_image,
    fileName: r.file_name,
    isPdfPersisted: r.is_pdf_persisted,
    releaseDate: r.release_date ? new Date(r.release_date).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }))
}

export async function createMagazine(data) {
  const pool = getPool()
  const magazine = {
    id: randomUUID(),
    title: data.title,
    description: data.description || null,
    // Accept both camelCase and legacy names from clients
    pdf_source: data.pdfSource || data.pdfUrl || null,
    viewer_url: data.viewerUrl || null,
    cover_image: data.coverImage || data.coverUrl || null,
    file_name: data.fileName || null,
    is_pdf_persisted: data.isPdfPersisted || false,
    release_date: data.releaseDate || null,
    created_at: new Date()
  }

  const { rows } = await pool.query(
    `INSERT INTO magazines (
      id, title, description, pdf_source, viewer_url, cover_image, 
      file_name, is_pdf_persisted, release_date, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      magazine.id, magazine.title, magazine.description, magazine.pdf_source,
      magazine.viewer_url, magazine.cover_image, magazine.file_name,
      magazine.is_pdf_persisted, magazine.release_date, magazine.created_at
    ]
  )

  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pdfSource: row.pdf_source,
    viewerUrl: row.viewer_url,
    coverImage: row.cover_image,
    fileName: row.file_name,
    isPdfPersisted: row.is_pdf_persisted,
    releaseDate: row.release_date ? new Date(row.release_date).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }
}

export async function updateMagazine(id, data) {
  const pool = getPool()
  
  const { rows } = await pool.query(
    `UPDATE magazines SET
      title = $1, description = $2, pdf_source = $3, viewer_url = $4,
      cover_image = $5, file_name = $6, is_pdf_persisted = $7, release_date = $8
    WHERE id = $9
    RETURNING *`,
    [
      data.title, data.description || null, (data.pdfSource || data.pdfUrl) || null, data.viewerUrl || null,
      (data.coverImage || data.coverUrl) || null, data.fileName || null, data.isPdfPersisted || false,
      data.releaseDate || null, id
    ]
  )

  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pdfSource: row.pdf_source,
    viewerUrl: row.viewer_url,
    coverImage: row.cover_image,
    fileName: row.file_name,
    isPdfPersisted: row.is_pdf_persisted,
    releaseDate: row.release_date ? new Date(row.release_date).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }
}

export async function deleteMagazine(id) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM magazines WHERE id = $1', [id])
  return rowCount > 0
}

// Magazine articles
export async function getMagazineArticles(magazineId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT * FROM magazine_articles 
     WHERE magazine_id = $1 
     ORDER BY page_number ASC NULLS LAST, title ASC`,
    [magazineId]
  )
  return rows
}

export async function createMagazineArticle(magazineId, data) {
  const pool = getPool()
  const article = {
    id: randomUUID(),
    magazine_id: magazineId,
    title: data.title,
    author: data.author || null,
    pdf_url: data.pdfUrl,
    page_number: data.pageNumber || null
  }

  const { rows } = await pool.query(
    `INSERT INTO magazine_articles (id, magazine_id, title, author, pdf_url, page_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [article.id, article.magazine_id, article.title, article.author, article.pdf_url, article.page_number]
  )

  return rows[0]
}

export async function updateMagazineArticle(magazineId, articleId, data) {
  const pool = getPool()
  
  const { rows } = await pool.query(
    `UPDATE magazine_articles 
     SET title = $1, author = $2, pdf_url = $3, page_number = $4
     WHERE id = $5 AND magazine_id = $6
     RETURNING *`,
    [data.title, data.author || null, data.pdfUrl, data.pageNumber || null, articleId, magazineId]
  )

  return rows[0]
}

export async function deleteMagazineArticle(articleId) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM magazine_articles WHERE id = $1', [articleId])
  return rowCount > 0
}
