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
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'divanjapones2024',
  environment: process.env.NODE_ENV || 'development',
  frontendUrl: (process.env.FRONTEND_URL || 'https://divanjapones.com').replace(/\/$/, ''),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  resendApiKey: process.env.RESEND_API_KEY
}
