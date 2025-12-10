import { randomUUID } from 'crypto'
import { getPool } from '../config/database.js'
import { notifySubscription } from './notifications.service.js'

export async function subscribe(email) {
  const pool = getPool()
  if (!pool) throw new Error('Database connection is not initialized')

  const normalized = email?.trim().toLowerCase()
  if (!normalized) {
    const err = new Error('El campo "email" es requerido')
    err.status = 400
    throw err
  }

  const { rows } = await pool.query(
    `INSERT INTO newsletter_subscribers (id, email)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [randomUUID(), normalized]
  )

  const subscriber = rows[0]
  if (subscriber) {
    notifySubscription(normalized).catch((err) => {
      console.error('Welcome email failed (new subscriber):', err.message)
    })
    return subscriber
  }

  // If the email already existed, return the existing row to keep the response shape predictable
  const existing = await pool.query('SELECT * FROM newsletter_subscribers WHERE email = $1 LIMIT 1', [normalized])
  const existingSubscriber = existing.rows[0]

  if (existingSubscriber) {
    notifySubscription(normalized).catch((err) => {
      console.error('Welcome email failed (existing subscriber):', err.message)
    })
  }

  return existingSubscriber
}

export async function listSubscribers() {
  const pool = getPool()
  if (!pool) return []

  const { rows } = await pool.query(
    'SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC'
  )
  return rows
}
