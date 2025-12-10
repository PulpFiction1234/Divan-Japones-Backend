import { sendEmail } from './email.service.js'
import { listSubscribers } from './newsletter.service.js'

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
  const isActivity = Boolean(article.isActivity || article.type === 'activity')
  const title = article.title || 'Nueva publicación'
  const date = article.publishedAt || article.scheduledAt || new Date().toISOString()

  const subject = isActivity
    ? `Nueva actividad: ${title}`
    : `Nueva publicación: ${title}`

  const summaryLines = [
    `Título: ${title}`,
    article.category ? `Categoría: ${article.category}` : null,
    isActivity && article.location ? `Lugar: ${article.location}` : null,
    isActivity && article.scheduledAt ? `Fecha: ${new Date(article.scheduledAt).toLocaleString()}` : null,
    !isActivity && date ? `Publicada: ${new Date(date).toLocaleDateString()}` : null,
  ].filter(Boolean)

  const text = `Hola,

Tenemos ${isActivity ? 'una nueva actividad' : 'una nueva publicación'} para ti.

${summaryLines.join('\n')}

Visita Diván Japonés para leerla completa.`

  const html = `
    <p>Hola,</p>
    <p>Tenemos ${isActivity ? 'una nueva actividad' : 'una nueva publicación'} para ti.</p>
    <ul>
      ${summaryLines.map((line) => `<li>${line}</li>`).join('')}
    </ul>
    <p>Visita Diván Japonés para leerla completa.</p>
  `

  return dispatchEmail({ subject, html, text })
}

export async function notifyMagazineCreated(magazine) {
  const subject = `Nueva revista: ${magazine.title || 'Edición disponible'}`
  const release = magazine.release_date || magazine.releaseDate

  const lines = [
    magazine.title ? `Título: ${magazine.title}` : null,
    magazine.description ? `Descripción: ${magazine.description}` : null,
    release ? `Fecha de lanzamiento: ${new Date(release).toLocaleDateString()}` : null,
  ].filter(Boolean)

  const text = `Hola,

Ya está disponible una nueva revista en Diván Japonés.
${lines.join('\n')}

Explora la nueva edición en el sitio.`

  const html = `
    <p>Hola,</p>
    <p>Ya está disponible una nueva revista en Diván Japonés.</p>
    <ul>
      ${lines.map((line) => `<li>${line}</li>`).join('')}
    </ul>
    <p>Explora la nueva edición en el sitio.</p>
  `

  return dispatchEmail({ subject, html, text })
}
