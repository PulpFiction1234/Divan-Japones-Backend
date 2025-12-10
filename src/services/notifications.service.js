import { sendEmail } from './email.service.js'
import { listSubscribers } from './newsletter.service.js'
import { getPool } from '../config/database.js'
import { config } from '../config/env.js'

async function dispatchEmail({ subject, html, text }) {
  const subscribers = await listSubscribers()
  if (!subscribers.length) return { sent: false, reason: 'No subscribers to notify' }

  const bcc = subscribers.map((s) => s.email)

  try {
    await sendEmail({ subject, html, text, bcc })
    return { sent: true, count: bcc.length }
  } catch (error) {
    console.error('Failed to send newsletter email:', error)
    return { sent: false, error: error.message }
  }
}

const CHILE_TZ = 'America/Santiago'

function formatDateTimeChile(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDateChile(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    dateStyle: 'long',
  }).format(date)
}

// Mirror frontend slugify (src/utils/slugify.js)
function slugifyTitle(title = '') {
  return title
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function buildArticleLink(article) {
  const base = config.frontendUrl || 'https://divanjapones.com'
  const slug = article.slug || slugifyTitle(article.title || '') || article.id
  return `${base}/article/${slug}`
}

function buildMagazineLink(magazine) {
  const base = config.frontendUrl || 'https://divanjapones.com'
  return `${base}/revista/${magazine.id}`
}

function toArticlePayload(raw) {
  const isActivity = Boolean(raw.isActivity || raw.is_activity || raw.type === 'activity')
  return {
    id: raw.id,
    title: raw.title || 'Nueva publicación',
    excerpt: raw.excerpt || '',
    image: raw.image_url || raw.image || '',
    category: raw.category || '',
    author: raw.author || '',
    isActivity,
    scheduledAt: raw.scheduled_at || raw.scheduledAt || null,
    publishedAt: raw.published_at || raw.publishedAt || null,
    location: raw.location || '',
    price: raw.price || '',
    slug: raw.slug,
  }
}

export async function notifySubscription(email) {
  const subject = '¡Te uniste a Diván Japonés!'

  const text = `Hola,

Gracias por suscribirte al newsletter de Diván Japonés. Desde ahora recibirás nuestras nuevas publicaciones, actividades y revistas.

Si no esperabas este correo, ignóralo y no recibirás más mensajes.`

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f0f0f; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e6e6e6; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: #7a7a7a;">Bienvenido</div>
        <div style="font-size: 24px; font-weight: 700; margin-top: 6px;">Diván Japonés</div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 12px;">¡Gracias por unirte! Desde ahora recibirás nuestras nuevas publicaciones, actividades y revistas.</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Pronto te compartiremos lo último de nuestra agenda cultural. Si en algún momento deseas dejar de recibir correos, responde con "unsubscribe".</p>

      <div style="text-align: center; margin: 22px 0;">
        <a href="https://divanjapones.com" style="display: inline-block; padding: 12px 22px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600;">Visitar Diván Japonés</a>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #606060; margin: 0;">Si no esperabas este mensaje, ignóralo y no recibirás más correos.</p>
    </div>
  `

  return sendEmail({ subject, html, text, to: email })
}

export async function notifyArticleCreated(article) {
  const normalized = toArticlePayload(article)
  const isActivity = normalized.isActivity
  const title = normalized.title
  const date = normalized.publishedAt || normalized.scheduledAt || new Date().toISOString()
  const scheduledLabel = formatDateTimeChile(normalized.scheduledAt)
  const publishedLabel = formatDateChile(date)
  const link = buildArticleLink(normalized)
  const hero = normalized.image || 'https://placehold.co/1200x800?text=Divan'

  const subject = isActivity
    ? `Nueva actividad: ${title}`
    : `Nueva publicación: ${title}`

  const summaryLines = [
    `Título: ${title}`,
    normalized.category ? `Categoría: ${normalized.category}` : null,
    isActivity && normalized.location ? `Lugar: ${normalized.location}` : null,
    isActivity && scheduledLabel ? `Fecha: ${scheduledLabel} (CLT)` : null,
    !isActivity && publishedLabel ? `Publicada: ${publishedLabel} (CLT)` : null,
  ].filter(Boolean)

  const text = `Hola,

Tenemos ${isActivity ? 'una nueva actividad' : 'una nueva publicación'} para ti.

${summaryLines.join('\n')}

Léela completa: ${link}`

  const html = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; color: #1f2933; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff;">
      <img src="${hero}" alt="${title}" style="width: 100%; display: block; max-height: 360px; object-fit: cover;" />
      <div style="padding: 20px 22px 16px 22px;">
        <div style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #7a7a7a; margin-bottom: 6px;">
          ${isActivity ? 'Actividad' : 'Publicación'}${normalized.category ? ' · ' + normalized.category : ''}
        </div>
        <h1 style="font-size: 26px; line-height: 1.25; margin: 0 0 12px 0; color: #111827;">${title}</h1>
        ${normalized.excerpt ? `<p style="font-size: 15px; line-height: 1.7; margin: 0 0 14px 0; color: #374151;">${normalized.excerpt}</p>` : ''}
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0; color: #1f2933; font-weight: 600;">Nueva nota recién salida del horno. Léela completa y compártela con quien la disfrute.</p>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
          ${isActivity && scheduledLabel ? `<span style="margin-right: 10px;">📅 ${scheduledLabel} (CLT)</span>` : ''}
          ${!isActivity && publishedLabel ? `<span style="margin-right: 10px;">📅 ${publishedLabel} (CLT)</span>` : ''}
          ${normalized.location && isActivity ? `<span>📍 ${normalized.location}</span>` : ''}
        </div>
        <a href="${link}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700;">Ver publicación</a>
      </div>
    </div>
  `

  return dispatchEmail({ subject, html, text })
}

export async function notifyMagazineCreated(magazine) {
  const subject = `Nueva revista: ${magazine.title || 'Edición disponible'}`
  const release = magazine.release_date || magazine.releaseDate
  const releaseLabel = formatDateChile(release)
  const link = buildMagazineLink(magazine)
  const cover = magazine.cover_image || magazine.coverImage || magazine.cover_url || 'https://placehold.co/900x1200?text=Revista'

  const lines = [
    magazine.title ? `Título: ${magazine.title}` : null,
    magazine.description ? `Descripción: ${magazine.description}` : null,
    releaseLabel ? `Fecha de lanzamiento: ${releaseLabel} (CLT)` : null,
  ].filter(Boolean)

  const text = `Hola,

Ya está disponible una nueva revista en Diván Japonés.
${lines.join('\n')}

Ver revista: ${link}`

  const html = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; color: #1f2933; max-width: 760px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #f7f4ef;">
      <div style="display: flex; flex-wrap: wrap; gap: 0;">
        <div style="flex: 1 1 280px; min-width: 260px; background: #f0e9df; display: flex; align-items: stretch; justify-content: center;">
          <img src="${cover}" alt="${magazine.title || 'Revista Diván Japonés'}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="flex: 2 1 360px; padding: 22px 24px 24px 24px;">
          <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #7a7a7a; margin-bottom: 6px;">Diván Japonés ${releaseLabel ? '· ' + releaseLabel : ''}</div>
          <h1 style="font-size: 26px; line-height: 1.3; margin: 0 0 12px 0; color: #111827;">${magazine.title || 'Nueva edición'}</h1>
          ${magazine.description ? `<p style="font-size: 15px; line-height: 1.7; margin: 0 0 14px 0; color: #374151;">${magazine.description}</p>` : ''}
          <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0; color: #1f2933; font-weight: 600;">Ya está disponible la nueva edición. Ábrela ahora y comparte el PDF con tu comunidad.</p>
          <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${link}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700;">Ver revista</a>
            ${magazine.pdf_source || magazine.pdf_url ? `<a href="${magazine.viewer_url || magazine.pdf_source || magazine.pdf_url}" style="display: inline-block; padding: 12px 18px; background: #f3f4f6; color: #111827; text-decoration: none; border-radius: 6px; font-weight: 600; border: 1px solid #d1d5db;">Descargar PDF</a>` : ''}
          </div>
        </div>
      </div>
    </div>
  `

  return dispatchEmail({ subject, html, text })
}

// Flush pending notifications for scheduled/published content.
// Intended to be called manually or by a lightweight cron to reduce DB usage.
export async function flushPendingNotifications() {
  const pool = getPool()
  if (!pool) {
    return { sent: 0, skipped: 0, magazinesSent: 0 }
  }

  const now = new Date()
  let sent = 0
  let skipped = 0
  let magazinesSent = 0

  // Articles & activities pending
  const { rows: pendingArticles } = await pool.query(
    `SELECT * FROM articles
     WHERE notify_sent = false
       AND (
         (is_activity = true AND COALESCE(scheduled_at, published_at) <= NOW()) OR
         (is_activity = false AND published_at <= NOW())
       )
     ORDER BY published_at ASC
     LIMIT 20` // small batch to keep DB/lightweight usage
  )

  for (const article of pendingArticles) {
    try {
      await notifyArticleCreated(article)
      await pool.query('UPDATE articles SET notify_sent = true WHERE id = $1', [article.id])
      sent += 1
    } catch (err) {
      console.error('Failed to send pending article notification:', err.message)
      skipped += 1
    }
  }

  // Magazines pending
  const { rows: pendingMagazines } = await pool.query(
    `SELECT * FROM magazines
     WHERE notify_sent = false
       AND (release_date IS NULL OR release_date <= CURRENT_DATE)
     ORDER BY release_date ASC NULLS FIRST
     LIMIT 20`
  )

  for (const magazine of pendingMagazines) {
    try {
      await notifyMagazineCreated(magazine)
      await pool.query('UPDATE magazines SET notify_sent = true WHERE id = $1', [magazine.id])
      magazinesSent += 1
    } catch (err) {
      console.error('Failed to send pending magazine notification:', err.message)
      skipped += 1
    }
  }

  return { sent, magazinesSent, skipped, checkedAt: now.toISOString() }
}

// Lightweight in-process scheduler to auto-flush pending notifications.
// Runs every 5 minutes, skipping if a run is already in progress to reduce DB load.
let schedulerStarted = false
let schedulerRunning = false

export function startNotificationScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true

  const intervalMs = 5 * 60 * 1000 // 5 minutes

  const tick = async () => {
    if (schedulerRunning) return
    schedulerRunning = true
    try {
      await flushPendingNotifications()
    } catch (err) {
      console.error('Notification scheduler error:', err.message)
    } finally {
      schedulerRunning = false
    }
  }

  // initial delayed tick to avoid hitting DB at boot flood
  setTimeout(tick, 30 * 1000)
  setInterval(tick, intervalMs)
}
