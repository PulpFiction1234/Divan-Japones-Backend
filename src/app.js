import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import { initializePool } from './config/database.js'
import { initializeSchema } from './services/database.service.js'
import articlesRoutes from './routes/articles.routes.js'
import magazinesRoutes from './routes/magazines.routes.js'
import categoriesRoutes from './routes/categories.routes.js'
import authorsRoutes from './routes/authors.routes.js'
import authRoutes from './routes/auth.routes.js'
import newsletterRoutes from './routes/newsletter.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import { startNotificationScheduler } from './services/notifications.service.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/articles', articlesRoutes)
app.use('/api/magazines', magazinesRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/authors', authorsRoutes)
app.use('/api', authRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/notifications', notificationsRoutes)

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize database
async function initializeDatabase() {
  try {
    initializePool()
    await initializeSchema()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

// Start server
export async function startServer() {
  await initializeDatabase()
  
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`)
    console.log(`Environment: ${config.environment}`)
    startNotificationScheduler()
  })
}

export { app }
