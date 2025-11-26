import { app, initializeSchema } from '../src/app.js'

export default async function handler(req, res) {
  if (process.env.VERCEL) {
    await initializeSchema()
  }

  return app(req, res)
}
