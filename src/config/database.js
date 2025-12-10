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

  // Force sessions to use Chile time zone so NOW() matches local scheduling
  pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'America/Santiago'").catch((err) => {
      console.error('Failed to set session time zone:', err.message)
    })
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
