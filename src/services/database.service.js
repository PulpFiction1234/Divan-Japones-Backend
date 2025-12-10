import { getPool } from '../config/database.js'

let schemaInitialized = false

export async function initializeSchema() {
  const pool = getPool()
  
  if (!pool || schemaInitialized) {
    return
  }

  try {
    console.log('🔧 Initializing database schema...')

    // Articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
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
      )
    `)

    // Magazines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magazines (
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
      )
    `)

    // Magazine articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magazine_articles (
        id UUID PRIMARY KEY,
        magazine_id UUID NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        author TEXT,
        pdf_url TEXT NOT NULL,
        page_number INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Authors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS authors (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        avatar TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Newsletter subscribers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    schemaInitialized = true
    console.log('✅ Database schema initialized')
  } catch (error) {
    console.error('❌ Schema initialization failed:', error.message)
    throw error
  }
}
