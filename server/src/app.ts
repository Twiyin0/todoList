import express from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth'
import todoRoutes from './routes/todos'
import documentRoutes from './routes/documents'
import mediaRoutes from './routes/media'
import adminRoutes from './routes/admin'
import externalRoutes from './routes/external'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.use('/api/auth', authRoutes)
  app.use('/api/todos', todoRoutes)
  app.use('/api/documents', documentRoutes)
  app.use('/api/media', mediaRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/external', externalRoutes)

  // Serve built client in production (local server only, not Vercel)
  if (!process.env.VERCEL && process.env.NODE_ENV === 'production') {
    const clientDist = path.resolve(__dirname, '../../client/dist')
    app.use(express.static(clientDist))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  return app
}
