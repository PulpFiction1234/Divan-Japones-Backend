import { config } from '../config/env.js'

export async function login(req, res) {
  try {
    const { username, password } = req.body

    if (username === config.adminUsername && password === config.adminPassword) {
      res.json({ success: true, message: 'Login successful' })
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function health(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}
