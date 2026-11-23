import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { config } from './config.js'
import { getDb } from './db/index.js'
import { errorHandler, notFound } from './http.js'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import userRoutes from './routes/users.js'

export function createApp() {
  getDb() // jalankan migrasi sebelum menerima request
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.isProd ? config.corsOrigins : true }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  // Batasi percobaan masuk/daftar untuk mempersulit tebak kata sandi
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' },
  })
  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api', dataRoutes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
