import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..', '..')
const envPath = join(rootDir, '.env.local')

// Load environment variables
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL?.trim(),
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'divanjapones2024'
  },
  env: process.env.NODE_ENV || 'development'
}
