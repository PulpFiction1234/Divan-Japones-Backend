import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const localEnvPath = join(__dirname, '..', '.env.local')

if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath })
  console.log('Loaded environment from .env.local')
} else {
  dotenv.config()
}

const app = express()
app.use(cors())
app.use(express.json())

const connectionString = process.env.DATABASE_URL?.trim()
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'divanjapones2024'
let pool
let schemaInitialized = false

const DEFAULT_IMAGE = 'https://placehold.co/900x600?text=Divan'

console.log('🔍 Checking DATABASE_URL:', connectionString ? '✅ Present' : '❌ Missing')
console.log('🔍 ADMIN_USERNAME:', ADMIN_USERNAME ? '✅ Present' : '❌ Missing')

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  pool.on('error', (error) => {
    console.error('❌ Neon pool error', error)
  })
  
  console.log('✅ Database pool created')
} else {
  console.warn('⚠️  DATABASE_URL not found in environment. Backend will run without database.')
}

const ensureSchema = async () => {
  if (!pool) {
    console.log('Skipping schema setup (no database connection)')
    return
  }

  try {
    console.log('Setting up database schema...')
    
    await pool.query(
      `CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        subcategory TEXT,
        author TEXT,
        excerpt TEXT,
        content TEXT,
        image_url TEXT,
        type TEXT NOT NULL DEFAULT 'publication',
        is_activity BOOLEAN NOT NULL DEFAULT false,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        scheduled_at TIMESTAMPTZ,
        location TEXT,
        price TEXT,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    const columnMigrations = [
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS subcategory TEXT",
      `ALTER TABLE articles ADD COLUMN IF NOT EXISTS author TEXT`,
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt TEXT",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS content TEXT",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'publication'",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_activity BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS location TEXT",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS price TEXT",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ]

    for (const statement of columnMigrations) {
      await pool.query(statement)
    }

    await pool.query("ALTER TABLE articles ALTER COLUMN category SET DEFAULT 'General'")
    try {
      await pool.query(`ALTER TABLE articles ALTER COLUMN author DROP DEFAULT`)
    } catch (err) {
      // ignore if not supported
    }
    await pool.query("ALTER TABLE articles ALTER COLUMN type SET DEFAULT 'publication'")
    await pool.query("ALTER TABLE articles ALTER COLUMN is_activity SET DEFAULT false")
    await pool.query("ALTER TABLE articles ALTER COLUMN published_at SET DEFAULT NOW()")
    await pool.query("ALTER TABLE articles ALTER COLUMN view_count SET DEFAULT 0")
    await pool.query("ALTER TABLE articles ALTER COLUMN created_at SET DEFAULT NOW()")

    await pool.query(
      `CREATE TABLE IF NOT EXISTS magazines (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        pdf_source TEXT,
        viewer_url TEXT,
        cover_image TEXT,
        file_name TEXT,
        is_pdf_persisted BOOLEAN NOT NULL DEFAULT false,
        release_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    const magazineColumnMigrations = [
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS pdf_source TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS viewer_url TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS cover_image TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS file_name TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS is_pdf_persisted BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS release_date DATE",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ]

    for (const statement of magazineColumnMigrations) {
      await pool.query(statement)
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS magazine_articles (
        id UUID PRIMARY KEY,
        magazine_id UUID NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        author TEXT,
        pdf_url TEXT NOT NULL,
        page_number INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS authors (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        avatar TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    console.log('✅ Schema is ready')
  } catch (error) {
    console.error('Error setting up schema:', error)
  }
}

// Initialize schema on first request
const initializeSchema = async () => {
  if (!schemaInitialized) {
    await ensureSchema()
    schemaInitialized = true
  }
}

// Utility functions
const toIsoString = (date) => {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString()
}

const isValidUrl = (value = '') => /^https?:\/\//i.test(value.trim())

const mapArticleRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category || 'General',
  subcategory: row.subcategory ?? null,
  author: row.author ?? null,
  excerpt: row.excerpt ?? '',
  content: row.content ?? '',
  imageUrl: row.image_url || DEFAULT_IMAGE,
  type: row.type || 'publication',
  isActivity: row.is_activity ?? false,
  publishedAt: toIsoString(row.published_at),
  scheduledAt: row.scheduled_at ? toIsoString(row.scheduled_at) : null,
  location: row.location ?? null,
  price: row.price ?? null,
  viewCount: row.view_count ?? 0,
  createdAt: toIsoString(row.created_at),
})

const mapMagazineRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  pdfSource: row.pdf_source ?? '',
  viewerUrl: row.viewer_url ?? '',
  coverImage: row.cover_image ?? '',
  fileName: row.file_name ?? '',
  isPdfPersisted: row.is_pdf_persisted ?? false,
  releaseDate: row.release_date,
  createdAt: toIsoString(row.created_at),
})

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DivanJaponesReact backend is running',
    hasDatabase: Boolean(pool),
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasAdminUsername: Boolean(process.env.ADMIN_USERNAME),
      hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD)
    }
  })
})

app.get('/articles', async (req, res) => {
  console.log('📥 GET /articles - Request received')
  
  if (!pool) {
    console.error('❌ No database pool')
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    console.log('🔄 Initializing schema...')
    await initializeSchema()
    console.log('✅ Schema ready, querying articles...')
    
    const { rows } = await pool.query('SELECT * FROM articles ORDER BY published_at DESC')
    console.log(`✅ Found ${rows.length} articles`)
    res.json(rows.map(mapArticleRow))
  } catch (error) {
    console.error('❌ Error fetching articles:', error)
    res.status(500).json({ error: 'Error fetching articles', details: error.message })
  }
})

app.post('/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const {
    title,
    category,
    subcategory,
    author,
    excerpt,
    content,
    imageUrl,
    publishedAt,
    scheduledAt,
    location,
    price,
  } = req.body

  if (!title?.trim() || !category?.trim()) {
    return res.status(400).json({ error: 'Title and category are required' })
  }

  const isActivity = Boolean(scheduledAt)
  const type = isActivity ? 'activity' : 'publication'

  const newArticle = {
    id: randomUUID(),
    title: title.trim(),
    category: category.trim(),
    subcategory: subcategory?.trim() ?? null,
    author: author?.trim() ?? null,
    excerpt: excerpt?.trim() ?? '',
    content: content?.trim() ?? '',
    image_url: imageUrl?.trim() || DEFAULT_IMAGE,
    type,
    is_activity: isActivity,
    published_at: publishedAt ? new Date(publishedAt) : new Date(),
    scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
    location: location?.trim() ?? null,
    price: price?.trim() ?? null,
    view_count: 0,
    created_at: new Date(),
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO articles (
        id, title, category, subcategory, author, excerpt, content, image_url,
        type, is_activity, published_at, scheduled_at, location, price, view_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *`,
      [
        newArticle.id,
        newArticle.title,
        newArticle.category,
        newArticle.subcategory,
        newArticle.author,
        newArticle.excerpt,
        newArticle.content,
        newArticle.image_url,
        newArticle.type,
        newArticle.is_activity,
        newArticle.published_at,
        newArticle.scheduled_at,
        newArticle.location,
        newArticle.price,
        newArticle.view_count,
        newArticle.created_at,
      ]
    )

    res.status(201).json(mapArticleRow(rows[0]))
  } catch (error) {
    console.error('Creating article failed', error)
    res.status(500).json({ error: 'Error creating article' })
  }
})

app.put('/articles/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { id } = req.params
  const {
    title,
    category,
    subcategory,
    author,
    excerpt,
    content,
    imageUrl,
    publishedAt,
    scheduledAt,
    location,
    price,
  } = req.body

  if (!title?.trim() || !category?.trim()) {
    return res.status(400).json({ error: 'Title and category are required' })
  }

  const isActivity = Boolean(scheduledAt)
  const type = isActivity ? 'activity' : 'publication'

  try {
    const { rows } = await pool.query(
      `UPDATE articles SET
        title = $1,
        category = $2,
        subcategory = $3,
        author = $4,
        excerpt = $5,
        content = $6,
        image_url = $7,
        type = $8,
        is_activity = $9,
        published_at = $10,
        scheduled_at = $11,
        location = $12,
        price = $13
      WHERE id = $14
      RETURNING *`,
      [
        title.trim(),
        category.trim(),
        subcategory?.trim() ?? null,
        author?.trim() ?? null,
        excerpt?.trim() ?? '',
        content?.trim() ?? '',
        imageUrl?.trim() || DEFAULT_IMAGE,
        type,
        isActivity,
        publishedAt ? new Date(publishedAt) : new Date(),
        scheduledAt ? new Date(scheduledAt) : null,
        location?.trim() ?? null,
        price?.trim() ?? null,
        id,
      ]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' })
    }

    res.json(mapArticleRow(rows[0]))
  } catch (error) {
    console.error('Updating article failed', error)
    res.status(500).json({ error: 'Error updating article' })
  }
})

app.delete('/articles/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rowCount } = await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Article not found' })
    }

    res.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Deleting article failed', error)
    res.status(500).json({ error: 'Error deleting article' })
  }
})

app.post('/articles/:id/increment-views', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rows } = await pool.query(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' })
    }

    res.json({ viewCount: rows[0].view_count })
  } catch (error) {
    console.error('Incrementing view count failed', error)
    res.status(500).json({ error: 'Error incrementing view count' })
  }
})

// Magazines
app.get('/magazines', async (req, res) => {
  console.log('📥 GET /magazines - Request received')
  
  if (!pool) {
    console.error('❌ No database pool')
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    console.log('🔄 Initializing schema...')
    await initializeSchema()
    console.log('✅ Schema ready, querying magazines...')
    
    const { rows } = await pool.query('SELECT * FROM magazines ORDER BY release_date DESC')
    console.log(`✅ Found ${rows.length} magazines`)
    res.json(rows.map(mapMagazineRow))
  } catch (error) {
    console.error('❌ Error fetching magazines:', error)
    res.status(500).json({ error: 'Error fetching magazines', details: error.message })
  }
})

app.post('/magazines', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { title, description, pdfSource, viewerUrl, coverImage, fileName, isPdfPersisted, releaseDate } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  const newMagazine = {
    id: randomUUID(),
    title: title.trim(),
    description: description?.trim() ?? '',
    pdf_source: pdfSource?.trim() ?? '',
    viewer_url: viewerUrl?.trim() ?? '',
    cover_image: coverImage?.trim() ?? '',
    file_name: fileName?.trim() ?? '',
    is_pdf_persisted: isPdfPersisted ?? false,
    release_date: releaseDate ?? null,
    created_at: new Date(),
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO magazines (
        id, title, description, pdf_source, viewer_url, cover_image, file_name, is_pdf_persisted, release_date, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *`,
      [
        newMagazine.id,
        newMagazine.title,
        newMagazine.description,
        newMagazine.pdf_source,
        newMagazine.viewer_url,
        newMagazine.cover_image,
        newMagazine.file_name,
        newMagazine.is_pdf_persisted,
        newMagazine.release_date,
        newMagazine.created_at,
      ]
    )

    res.status(201).json(mapMagazineRow(rows[0]))
  } catch (error) {
    console.error('Creating magazine failed', error)
    res.status(500).json({ error: 'Error creating magazine' })
  }
})

app.put('/magazines/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { id } = req.params
  const { title, description, pdfSource, viewerUrl, coverImage, fileName, isPdfPersisted, releaseDate } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE magazines SET
        title = $1,
        description = $2,
        pdf_source = $3,
        viewer_url = $4,
        cover_image = $5,
        file_name = $6,
        is_pdf_persisted = $7,
        release_date = $8
      WHERE id = $9
      RETURNING *`,
      [
        title.trim(),
        description?.trim() ?? '',
        pdfSource?.trim() ?? '',
        viewerUrl?.trim() ?? '',
        coverImage?.trim() ?? '',
        fileName?.trim() ?? '',
        isPdfPersisted ?? false,
        releaseDate ?? null,
        id,
      ]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' })
    }

    res.status(200).json(mapMagazineRow(rows[0]))
  } catch (error) {
    console.error('Updating magazine failed', error)
    res.status(500).json({ error: 'No se pudo actualizar la revista' })
  }
})

app.delete('/magazines/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rowCount } = await pool.query('DELETE FROM magazines WHERE id = $1', [req.params.id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    res.json({ message: 'Magazine deleted successfully' })
  } catch (error) {
    console.error('Deleting magazine failed', error)
    res.status(500).json({ error: 'Error deleting magazine' })
  }
})

app.get('/magazines/:magazineId/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { magazineId } = req.params
    const { rows } = await pool.query(
      'SELECT id, magazine_id, title, author, pdf_url, page_number, created_at FROM magazine_articles WHERE magazine_id = $1 ORDER BY page_number ASC NULLS LAST, title ASC',
      [magazineId]
    )

    const articles = rows.map((row) => ({
      id: row.id,
      magazineId: row.magazine_id,
      title: row.title,
      author: row.author ?? '',
      pdfUrl: row.pdf_url,
      pageNumber: row.page_number ?? null,
      createdAt: toIsoString(row.created_at),
    }))

    res.json(articles)
  } catch (error) {
    console.error('Fetching magazine articles failed', error)
    res.status(500).json({ error: 'Error fetching magazine articles' })
  }
})

app.post('/magazines/:magazineId/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { magazineId } = req.params
  const { title, author, pdfUrl, pageNumber } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!pdfUrl?.trim() || !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'Valid PDF URL is required (https://...)' })
  }

  try {
    const magazineCheck = await pool.query('SELECT id FROM magazines WHERE id = $1', [magazineId])
    if (!magazineCheck.rows.length) {
      return res.status(404).json({ error: 'Magazine not found' })
    }

    const newArticle = {
      id: randomUUID(),
      magazine_id: magazineId,
      title: title.trim(),
      author: author?.trim() ?? null,
      pdf_url: pdfUrl.trim(),
      page_number: pageNumber ? Number(pageNumber) : null,
    }

    const { rows } = await pool.query(
      `INSERT INTO magazine_articles (
        id, magazine_id, title, author, pdf_url, page_number
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id, magazine_id, title, author, pdf_url, page_number, created_at`,
      [
        newArticle.id,
        newArticle.magazine_id,
        newArticle.title,
        newArticle.author,
        newArticle.pdf_url,
        newArticle.page_number,
      ]
    )

    if (!rows.length) {
      throw new Error('No se pudo recuperar el artículo insertado')
    }

    const saved = rows[0]
    const response = {
      id: saved.id,
      magazineId: saved.magazine_id,
      title: saved.title,
      author: saved.author ?? '',
      pdfUrl: saved.pdf_url,
      pageNumber: saved.page_number ?? null,
      createdAt: toIsoString(saved.created_at),
    }
    
    res.status(201).json(response)
  } catch (error) {
    console.error('Saving magazine article failed', error)
    res.status(500).json({ error: 'No se pudo guardar el artículo de la revista' })
  }
})

app.put('/magazines/:magazineId/articles/:articleId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { magazineId, articleId } = req.params
  const { title, author, pdfUrl, pageNumber } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!pdfUrl?.trim() || !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'Valid PDF URL is required (https://...)' })
  }

  try {
    const articleCheck = await pool.query(
      'SELECT id FROM magazine_articles WHERE id = $1 AND magazine_id = $2',
      [articleId, magazineId]
    )
    
    if (!articleCheck.rows.length) {
      return res.status(404).json({ error: 'Article not found' })
    }

    const { rows } = await pool.query(
      `UPDATE magazine_articles 
       SET title = $1, author = $2, pdf_url = $3, page_number = $4 
       WHERE id = $5 AND magazine_id = $6
       RETURNING id, magazine_id, title, author, pdf_url, page_number, created_at`,
      [
        title.trim(),
        author?.trim() ?? null,
        pdfUrl.trim(),
        pageNumber ? Number(pageNumber) : null,
        articleId,
        magazineId
      ]
    )

    if (!rows.length) {
      throw new Error('No se pudo actualizar el artículo')
    }

    const updated = rows[0]
    const response = {
      id: updated.id,
      magazineId: updated.magazine_id,
      title: updated.title,
      author: updated.author ?? '',
      pdfUrl: updated.pdf_url,
      pageNumber: updated.page_number ?? null,
      createdAt: toIsoString(updated.created_at),
    }
    
    res.status(200).json(response)
  } catch (error) {
    console.error('Updating magazine article failed', error)
    res.status(500).json({ error: 'No se pudo actualizar el artículo de la revista' })
  }
})

app.delete('/magazines/:magazineId/articles/:articleId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { articleId } = req.params
    const { rowCount } = await pool.query('DELETE FROM magazine_articles WHERE id = $1', [articleId])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Artículo de revista no encontrado' })
    }

    res.status(200).json({ message: 'Artículo eliminado exitosamente' })
  } catch (error) {
    console.error('Deleting magazine article failed', error)
    res.status(500).json({ error: 'No se pudo eliminar el artículo' })
  }
})

// Categories
app.get('/categories', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, created_at FROM categories ORDER BY name ASC`
    )
    res.json(rows)
  } catch (error) {
    console.error('Fetching categories failed', error)
    res.status(500).json({ error: 'Error fetching categories' })
  }
})

app.post('/categories', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { name, slug } = req.body

  if (!name?.trim() || !slug?.trim()) {
    return res.status(400).json({ error: 'Name and slug are required' })
  }

  try {
    const newCategory = {
      id: randomUUID(),
      name: name.trim(),
      slug: slug.trim(),
      created_at: new Date(),
    }

    const { rows } = await pool.query(
      `INSERT INTO categories (id, name, slug, created_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [newCategory.id, newCategory.name, newCategory.slug, newCategory.created_at]
    )

    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre o slug' })
    }
    console.error('Creating category failed', error)
    res.status(500).json({ error: 'Error al crear la categoría' })
  }
})

app.delete('/categories/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }

    res.json({ message: 'Categoría eliminada exitosamente' })
  } catch (error) {
    console.error('Deleting category failed', error)
    res.status(500).json({ error: 'Error al eliminar la categoría' })
  }
})

// Authors
app.get('/authors', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rows } = await pool.query(
      `SELECT id, name, avatar, created_at FROM authors ORDER BY name ASC`
    )
    res.json(rows)
  } catch (error) {
    console.error('Fetching authors failed', error)
    res.status(500).json({ error: 'Error fetching authors' })
  }
})

app.post('/authors', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  const { name, avatar } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const newAuthor = {
      id: randomUUID(),
      name: name.trim(),
      avatar: avatar?.trim() ?? null,
      created_at: new Date(),
    }

    const { rows } = await pool.query(
      `INSERT INTO authors (id, name, avatar, created_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [newAuthor.id, newAuthor.name, newAuthor.avatar, newAuthor.created_at]
    )

    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un autor con ese nombre' })
    }
    console.error('Creating author failed', error)
    res.status(500).json({ error: 'Error al crear el autor' })
  }
})

app.delete('/authors/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  await initializeSchema()

  try {
    const { rowCount } = await pool.query('DELETE FROM authors WHERE id = $1', [req.params.id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Autor no encontrado' })
    }

    res.json({ message: 'Autor eliminado exitosamente' })
  } catch (error) {
    console.error('Deleting author failed', error)
    res.status(500).json({ error: 'Error al eliminar el autor' })
  }
})

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Login successful' })
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' })
  }
})

// Initialize schema once at startup
if (pool) {
  initializeSchema().catch(err => console.error('Failed to initialize schema:', err))
}

export const startServer = async () => {
  const port = process.env.PORT || 4000

  if (pool) {
    await initializeSchema()
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Backend editorial listening on http://localhost:${port}`)
      console.log(`   Health: http://localhost:${port}/health`)
      resolve(server)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`)
      } else {
        console.error('❌ Server error:', error)
      }
      reject(error)
    })
  })
}

export { app, initializeSchema }
