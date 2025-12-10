import * as newsletterService from '../services/newsletter.service.js'

export async function subscribe(req, res) {
  try {
    const subscriber = await newsletterService.subscribe(req.body.email)
    res.status(201).json({ ok: true, subscriber })
  } catch (error) {
    const status = error.status && Number.isInteger(error.status) ? error.status : 500
    console.error('Error subscribing to newsletter:', error)
    res.status(status).json({ error: error.message })
  }
}

export async function list(req, res) {
  try {
    const subscribers = await newsletterService.listSubscribers()
    res.json(subscribers)
  } catch (error) {
    console.error('Error listing subscribers:', error)
    res.status(500).json({ error: error.message })
  }
}
