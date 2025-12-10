import { flushPendingNotifications } from '../services/notifications.service.js'

export async function flushPending(req, res) {
  try {
    const result = await flushPendingNotifications()
    res.json(result)
  } catch (error) {
    console.error('Error flushing pending notifications:', error)
    res.status(500).json({ error: error.message })
  }
}
