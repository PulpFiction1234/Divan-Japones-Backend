import { app } from '../src/app.js'
import { initializePool } from '../src/config/database.js'
import { initializeSchema } from '../src/services/database.service.js'

let isInitialized = false

async function initialize() {
  if (!isInitialized) {
    try {
      initializePool()
      await initializeSchema()
      isInitialized = true
      console.log('Serverless function initialized')
    } catch (error) {
      console.error('Initialization error:', error)
      throw error
    }
  }
}

export default async function handler(req, res) {
  try {
    await initialize()
    return app(req, res)
  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
