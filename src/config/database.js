import { Pool } from 'pg'
import { config } from './env.js'

let pool = null

export function initializePool() {
  if (!config.databaseUrl) {
    console.warn('⚠️  DATABASE_URL not configured. Running without database.')
    return null
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false }
  })

  pool.on('error', (err) => {
    console.error('💥 Database pool error:', err)
  })

  console.log('✅ Database pool created')
  return pool
}

export function getPool() {
  return pool
}
