import { getPool } from '../config/database.js'
import { randomUUID } from 'crypto'

export async function getMagazines() {
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM magazines ORDER BY release_date DESC')
  return rows
}

export async function createMagazine(data) {
  const pool = getPool()
  const magazine = {
    id: randomUUID(),
    title: data.title,
    description: data.description || null,
    // Accept both camelCase (frontend) and alternate names (compat)
    pdf_source: data.pdfSource || data.pdfUrl || null,
    viewer_url: data.viewerUrl || null,
    cover_image: data.coverImage || data.coverUrl || null,
    file_name: data.fileName || null,
    is_pdf_persisted: data.isPdfPersisted || false,
    // Normalize releaseDate to YYYY-MM-DD (DATE column expects this format)
    release_date: data.releaseDate ? (new Date(data.releaseDate).toISOString().slice(0, 10)) : null,
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

  return rows[0]
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
      data.title,
      data.description || null,
      (data.pdfSource || data.pdfUrl) || null,
      data.viewerUrl || null,
      (data.coverImage || data.coverUrl) || null,
      data.fileName || null,
      data.isPdfPersisted || false,
      data.releaseDate ? (new Date(data.releaseDate).toISOString().slice(0, 10)) : null,
      id
    ]
  )

  return rows[0]
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
    // Accept either camelCase or snake_case from clients
    pdf_url: data.pdfUrl || data.pdf_url || null,
    page_number: data.pageNumber || null
  }

  // Validate required fields
  if (!article.pdf_url || typeof article.pdf_url !== 'string' || !article.pdf_url.trim()) {
    const err = new Error('El campo "pdfUrl" es requerido y debe ser una URL válida')
    err.status = 400
    throw err
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
  // Validate incoming pdfUrl before updating to avoid DB constraint errors
  const incomingPdf = (data.pdfUrl || data.pdf_url) || null
  if (!incomingPdf || typeof incomingPdf !== 'string' || !incomingPdf.trim()) {
    const err = new Error('El campo "pdfUrl" es requerido y debe ser una URL válida')
    err.status = 400
    throw err
  }

  const { rows } = await pool.query(
    `UPDATE magazine_articles 
     SET title = $1, author = $2, pdf_url = $3, page_number = $4
     WHERE id = $5 AND magazine_id = $6
     RETURNING *`,
    [
      data.title,
      data.author || null,
      incomingPdf,
      data.pageNumber || null,
      articleId,
      magazineId,
    ]
  )

  return rows[0]
}

export async function deleteMagazineArticle(articleId) {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM magazine_articles WHERE id = $1', [articleId])
  return rowCount > 0
}
