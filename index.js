import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const app = express()
app.use(cors())
app.use(express.json())

const connectionString = process.env.DATABASE_URL?.trim()
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'divanjapones2024'
let pool

const DEFAULT_IMAGE = 'https://placehold.co/900x600?text=Divan'

console.log('DATABASE_URL loaded:', connectionString ? 'Yes (hidden)' : 'No')
console.log('ADMIN_USERNAME loaded:', ADMIN_USERNAME ? 'Yes' : 'No')

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  pool.on('error', (error) => {
    console.error('Neon pool error', error)
  })
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
    // ensure author column has no default so there is no implicit default author
    try {
      await pool.query(`ALTER TABLE articles ALTER COLUMN author DROP DEFAULT`)
    } catch (err) {
      // ignore if not supported
    }
    await pool.query("ALTER TABLE articles ALTER COLUMN type SET DEFAULT 'publication'")
    await pool.query("ALTER TABLE articles ALTER COLUMN is_activity SET DEFAULT false")
    await pool.query("ALTER TABLE articles ALTER COLUMN published_at SET DEFAULT NOW()")
    await pool.query("ALTER TABLE articles ALTER COLUMN view_count SET DEFAULT 0")

    await pool.query(
      `CREATE TABLE IF NOT EXISTS magazines (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        pdf_url TEXT,
        viewer_url TEXT,
        cover_url TEXT,
        release_date TIMESTAMPTZ,
        file_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    const magazineColumns = [
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS pdf_url TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS viewer_url TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS cover_url TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS file_name TEXT",
      "ALTER TABLE magazines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ]

    for (const statement of magazineColumns) {
      await pool.query(statement)
    }

    // Magazine articles table for individual articles within each magazine
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

    const magazineArticleColumns = [
      "ALTER TABLE magazine_articles ADD COLUMN IF NOT EXISTS author TEXT",
      "ALTER TABLE magazine_articles ADD COLUMN IF NOT EXISTS page_number INTEGER",
      "ALTER TABLE magazine_articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ]

    for (const statement of magazineArticleColumns) {
      await pool.query(statement)
    }

    // Categories table
    await pool.query(
      `CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    // Insert default categories if table is empty
    const { rows: existingCategories } = await pool.query('SELECT COUNT(*) as count FROM categories')
    if (parseInt(existingCategories[0].count) === 0) {
      const defaultCategories = [
        { name: 'Cine', slug: 'cine' },
        { name: 'Literatura', slug: 'literatura' },
        { name: 'Arte', slug: 'arte' },
        { name: 'Cultura', slug: 'cultura' },
        { name: 'Psicoanálisis', slug: 'psicoanalisis' },
        { name: 'Animé', slug: 'anime' },
        { name: 'Manga', slug: 'manga' }
      ]
      
      for (const cat of defaultCategories) {
        await pool.query(
          'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
          [cat.name, cat.slug]
        )
      }
    }

    // Authors table
    await pool.query(
      `CREATE TABLE IF NOT EXISTS authors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        avatar TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )

    // Ensure avatar column exists on older installations
    try {
      await pool.query(`ALTER TABLE authors ADD COLUMN IF NOT EXISTS avatar TEXT`)
    } catch (err) {
      // non-fatal; continue
      console.error('Warning: could not ensure authors.avatar column', err.message)
    }

    // Do not insert a default author automatically; authors must be created via admin
    // (keeps author list empty until user creates authors)
    
    console.log('✅ Database schema ready')
    // Remove any legacy default-author values from existing data so only user-created authors remain
    try {
      await pool.query("UPDATE articles SET author = NULL WHERE author = 'Colectivo Diván Japonés'")
      await pool.query("DELETE FROM authors WHERE name = 'Colectivo Diván Japonés'")
    } catch (err) {
      console.error('Warning: could not remove legacy default author records', err.message)
    }
  } catch (error) {
    console.error('❌ Schema setup failed:', error.message)
    throw error
  }
}

const isValidUrl = (value = '') => /^https?:\/\//i.test(value.trim())

const toIsoString = (value) => (value ? new Date(value).toISOString() : null)

const mapArticleRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category ?? 'General',
  subcategory: row.subcategory ?? '',
  author: row.author ?? '',
  excerpt: row.excerpt ?? '',
  content: row.content ?? '',
  image: row.image_url ?? DEFAULT_IMAGE,
  publishedAt: toIsoString(row.published_at ?? row.created_at),
  type: row.type ?? 'publication',
  isActivity: row.is_activity ?? false,
  scheduledAt: toIsoString(row.scheduled_at),
  location: row.location ?? '',
  price: row.price ?? '',
  viewCount: Number(row.view_count) || 0,
})

const mapMagazineRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  pdfSource: row.pdf_url ?? '',
  viewerUrl: row.viewer_url ?? '',
  coverImage: row.cover_url ?? 'https://placehold.co/900x600?text=Revista',
  createdAt: toIsoString(row.created_at),
  releaseDate: toIsoString(row.release_date),
  fileName: row.file_name ?? '',
  hasPdf: Boolean(row.pdf_url),
  hasViewer: Boolean(row.viewer_url),
  isPdfPersisted: Boolean(row.pdf_url),
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', hasDatabase: Boolean(pool) })
})

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // In production, you should use JWT or a proper session management
    const token = Buffer.from(`${username}:${password}`).toString('base64')
    res.json({ token, message: 'Login successful' })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})

app.get('/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, subcategory, author, excerpt, content, image_url, type,
              is_activity, published_at, scheduled_at, location, price, view_count, created_at
       FROM articles
       ORDER BY published_at DESC
       LIMIT 200`
    )
    res.json(rows.map(mapArticleRow))
  } catch (error) {
    console.error('Fetching articles failed', error)
    res.status(500).json({ error: 'Error fetching articles' })
  }
})

app.post('/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const {
    title,
    category,
    subcategory,
    author,
    excerpt,
    content,
    imageUrl,
    publishedAt,
    type,
    isActivity,
    scheduledAt,
    location,
    price,
  } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'El título es requerido' })
  }

  if (imageUrl && !isValidUrl(imageUrl)) {
    return res.status(400).json({ error: 'La imagen debe ser una URL válida (https://...)' })
  }

  try {
    const newArticle = {
      id: randomUUID(),
      title: title.trim(),
      category: category?.trim() || 'General',
      subcategory: subcategory?.trim() ?? null,
      author: author?.trim() || null,
      excerpt: excerpt?.trim() ?? null,
      content: content?.trim() ?? null,
      image_url: imageUrl?.trim() || DEFAULT_IMAGE,
      type: type === 'activity' ? 'activity' : 'publication',
      is_activity: Boolean(isActivity || type === 'activity'),
      published_at: publishedAt ? new Date(publishedAt) : new Date(),
      scheduled_at: isActivity && scheduledAt ? new Date(scheduledAt) : null,
      location: isActivity ? location?.trim() ?? null : null,
      price: isActivity ? price?.trim() ?? null : null,
      view_count: 0,
    }

    const { rows } = await pool.query(
      `INSERT INTO articles (
        id, title, category, subcategory, author, excerpt, content, image_url, type,
        is_activity, published_at, scheduled_at, location, price, view_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15
      ) RETURNING id, title, category, subcategory, author, excerpt, content, image_url, type,
                 is_activity, published_at, scheduled_at, location, price, view_count, created_at`,
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
      ]
    )

    if (!rows.length) {
      throw new Error('No se pudo recuperar la fila insertada')
    }

    res.status(201).json(mapArticleRow(rows[0]))
  } catch (error) {
    console.error('Saving article failed', error)
    res.status(500).json({ error: 'No se pudo guardar el artículo' })
  }
})

app.get('/magazines', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, pdf_url, viewer_url, cover_url, release_date, file_name, created_at
       FROM magazines
       ORDER BY created_at DESC
       LIMIT 100`
    )
    res.json(rows.map(mapMagazineRow))
  } catch (error) {
    console.error('Fetching magazines failed', error)
    res.status(500).json({ error: 'Error fetching magazines' })
  }
})

app.post('/magazines', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { title, description, pdfUrl, viewerUrl, coverUrl, releaseDate, fileName } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'El título es requerido' })
  }

  const hasPdf = Boolean(pdfUrl?.trim())
  const hasViewer = Boolean(viewerUrl?.trim())

  if (!hasPdf && !hasViewer) {
    return res.status(400).json({ error: 'Debes proporcionar una URL de PDF o un enlace al visor externo' })
  }

  if (pdfUrl && !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'La URL del PDF debe ser válida (https://...)' })
  }

  if (viewerUrl && !isValidUrl(viewerUrl)) {
    return res.status(400).json({ error: 'La URL del visor debe ser válida (https://...)' })
  }

  if (coverUrl && !isValidUrl(coverUrl)) {
    return res.status(400).json({ error: 'La URL de la portada debe ser válida (https://...)' })
  }

  try {
    const newMagazine = {
      id: randomUUID(),
      title: title.trim(),
      description: description?.trim() ?? null,
      pdf_url: pdfUrl?.trim() || null,
      viewer_url: viewerUrl?.trim() || null,
      cover_url: coverUrl?.trim() || 'https://placehold.co/900x600?text=Revista',
      release_date: releaseDate ? new Date(releaseDate) : null,
      file_name: fileName?.trim() ?? null,
    }

    const { rows } = await pool.query(
      `INSERT INTO magazines (
        id, title, description, pdf_url, viewer_url, cover_url, release_date, file_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING id, title, description, pdf_url, viewer_url, cover_url, release_date, file_name, created_at`,
      [
        newMagazine.id,
        newMagazine.title,
        newMagazine.description,
        newMagazine.pdf_url,
        newMagazine.viewer_url,
        newMagazine.cover_url,
        newMagazine.release_date,
        newMagazine.file_name,
      ]
    )

    if (!rows.length) {
      throw new Error('No se pudo recuperar la revista insertada')
    }

    res.status(201).json(mapMagazineRow(rows[0]))
  } catch (error) {
    console.error('Saving magazine failed', error)
    res.status(500).json({ error: 'No se pudo guardar la revista' })
  }
})

// Get articles for a specific magazine
app.get('/magazines/:magazineId/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const { magazineId } = req.params
    console.log('📖 GET /magazines/:magazineId/articles - Fetching articles for magazine:', magazineId)
    
    const { rows } = await pool.query(
      `SELECT id, magazine_id, title, author, pdf_url, page_number, created_at
       FROM magazine_articles
       WHERE magazine_id = $1
       ORDER BY page_number ASC, created_at ASC`,
      [magazineId]
    )

    console.log('📖 Found', rows.length, 'articles for magazine', magazineId)

    const articles = rows.map(row => ({
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

// Add article to a magazine
app.post('/magazines/:magazineId/articles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { magazineId } = req.params
  const { title, author, pdfUrl, pageNumber } = req.body

  console.log('💾 POST /magazines/:magazineId/articles - Received:', {
    magazineId,
    title,
    author,
    pdfUrl,
    pageNumber
  })

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!pdfUrl?.trim() || !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'Valid PDF URL is required (https://...)' })
  }

  try {
    // Verify magazine exists
    const magazineCheck = await pool.query('SELECT id FROM magazines WHERE id = $1', [magazineId])
    if (!magazineCheck.rows.length) {
      console.log('❌ Magazine not found:', magazineId)
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

    console.log('💾 Inserting article:', newArticle)

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
    
    console.log('✅ Article saved successfully:', response.id)
    
    res.status(201).json(response)
  } catch (error) {
    console.error('Saving magazine article failed', error)
    res.status(500).json({ error: 'No se pudo guardar el artículo de la revista' })
  }
})

// Update magazine article
app.put('/magazines/:magazineId/articles/:articleId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { magazineId, articleId } = req.params
  const { title, author, pdfUrl, pageNumber } = req.body

  console.log('🔄 PUT /magazines/:magazineId/articles/:articleId - Updating:', {
    magazineId,
    articleId,
    title,
    author,
    pdfUrl,
    pageNumber
  })

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }

  if (!pdfUrl?.trim() || !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'Valid PDF URL is required (https://...)' })
  }

  try {
    // Verify article exists and belongs to the magazine
    const articleCheck = await pool.query(
      'SELECT id FROM magazine_articles WHERE id = $1 AND magazine_id = $2',
      [articleId, magazineId]
    )
    
    if (!articleCheck.rows.length) {
      console.log('❌ Article not found or does not belong to magazine:', articleId, magazineId)
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
    
    console.log('✅ Article updated successfully:', response.id)
    
    res.status(200).json(response)
  } catch (error) {
    console.error('Updating magazine article failed', error)
    res.status(500).json({ error: 'No se pudo actualizar el artículo de la revista' })
  }
})

// Delete article
app.delete('/articles/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const { id } = req.params
    const { rowCount } = await pool.query('DELETE FROM articles WHERE id = $1', [id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' })
    }

    res.status(200).json({ message: 'Artículo eliminado exitosamente' })
  } catch (error) {
    console.error('Deleting article failed', error)
    res.status(500).json({ error: 'No se pudo eliminar el artículo' })
  }
})

// Update article
app.put('/articles/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

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
    type,
    isActivity,
    scheduledAt,
    location,
    price,
  } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'El título es requerido' })
  }

  if (imageUrl && !isValidUrl(imageUrl)) {
    return res.status(400).json({ error: 'La imagen debe ser una URL válida (https://...)' })
  }

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
       RETURNING id, title, category, subcategory, author, excerpt, content, image_url, type,
                 is_activity, published_at, scheduled_at, location, price, view_count, created_at`,
      [
        title.trim(),
        category?.trim() || 'General',
        subcategory?.trim() ?? null,
        author?.trim() ?? null,
        excerpt?.trim() ?? null,
        content?.trim() ?? null,
        imageUrl?.trim() ?? null,
        type || 'article',
        isActivity ?? false,
        publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
        scheduledAt ? new Date(scheduledAt).toISOString() : null,
        location?.trim() ?? null,
        isActivity ? price?.trim() ?? null : null,
        id,
      ]
    )

    if (!rows.length) {
      return res.status(404).json({ error: 'Artículo no encontrado' })
    }

    res.status(200).json(mapArticleRow(rows[0]))
  } catch (error) {
    console.error('Updating article failed', error)
    res.status(500).json({ error: 'No se pudo actualizar el artículo' })
  }
})

// Delete magazine
app.delete('/magazines/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  try {
    const { id } = req.params
    const { rowCount } = await pool.query('DELETE FROM magazines WHERE id = $1', [id])

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' })
    }

    res.status(200).json({ message: 'Revista eliminada exitosamente' })
  } catch (error) {
    console.error('Deleting magazine failed', error)
    res.status(500).json({ error: 'No se pudo eliminar la revista' })
  }
})

// Update magazine
app.put('/magazines/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { id } = req.params
  const { title, description, pdfUrl, viewerUrl, coverUrl, releaseDate, fileName } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ error: 'El título es requerido' })
  }

  const hasPdf = Boolean(pdfUrl?.trim())
  const hasViewer = Boolean(viewerUrl?.trim())

  if (!hasPdf && !hasViewer) {
    return res.status(400).json({ error: 'Debes proporcionar una URL de PDF o un enlace al visor externo' })
  }

  if (pdfUrl && !isValidUrl(pdfUrl)) {
    return res.status(400).json({ error: 'La URL del PDF debe ser válida (https://...)' })
  }

  if (viewerUrl && !isValidUrl(viewerUrl)) {
    return res.status(400).json({ error: 'La URL del visor debe ser válida (https://...)' })
  }

  if (coverUrl && !isValidUrl(coverUrl)) {
    return res.status(400).json({ error: 'La URL de la portada debe ser válida (https://...)' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE magazines SET
        title = $1,
        description = $2,
        pdf_url = $3,
        viewer_url = $4,
        cover_url = $5,
        release_date = $6,
        file_name = $7
       WHERE id = $8
       RETURNING id, title, description, pdf_url, viewer_url, cover_url, release_date, file_name, created_at`,
      [
        title.trim(),
        description?.trim() ?? null,
        pdfUrl?.trim() ?? null,
        viewerUrl?.trim() ?? null,
        coverUrl?.trim() ?? null,
        releaseDate ? new Date(releaseDate).toISOString() : null,
        fileName?.trim() ?? null,
        id,
      ]
    )

    if (!rows.length) {
      return res.status(404).json({ error: 'Revista no encontrada' })
    }

    res.status(200).json(mapMagazineRow(rows[0]))
  } catch (error) {
    console.error('Updating magazine failed', error)
    res.status(500).json({ error: 'No se pudo actualizar la revista' })
  }
})

// Delete magazine article
app.delete('/magazines/:magazineId/articles/:articleId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

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

// ===== CATEGORIES ENDPOINTS =====

app.get('/categories', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

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

  const { name, slug } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido' })
  }

  if (!slug?.trim()) {
    return res.status(400).json({ error: 'El slug es requerido' })
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at`,
      [name.trim(), slug.trim()]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Esta categoría ya existe' })
    }
    console.error('Creating category failed', error)
    res.status(500).json({ error: 'Error al crear la categoría' })
  }
})

app.delete('/categories/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { id } = req.params

  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id])
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Deleting category failed', error)
    res.status(500).json({ error: 'Error al eliminar la categoría' })
  }
})

// ===== AUTHORS ENDPOINTS =====

app.get('/authors', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

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

  const { name, avatar } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: 'El nombre del autor es requerido' })
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO authors (name, avatar) VALUES ($1, $2) RETURNING id, name, avatar, created_at`,
      [name.trim(), avatar || null]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Este autor ya existe' })
    }
    console.error('Creating author failed', error)
    res.status(500).json({ error: 'Error al crear el autor' })
  }
})

app.delete('/authors/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }

  const { id } = req.params

  try {
    const { rowCount } = await pool.query('DELETE FROM authors WHERE id = $1', [id])
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Autor no encontrado' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Deleting author failed', error)
    res.status(500).json({ error: 'Error al eliminar el autor' })
  }
})

const port = process.env.PORT || 4000

const start = async () => {
  try {
    await ensureSchema()
    
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Backend editorial listening on http://localhost:${port}`)
      console.log(`   Health: http://localhost:${port}/health`)
      console.log(`   Articles: http://localhost:${port}/articles`)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`)
      } else {
        console.error('❌ Server error:', error)
      }
      process.exit(1)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

start()
