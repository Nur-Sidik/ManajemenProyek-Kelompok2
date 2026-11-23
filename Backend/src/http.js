import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { config } from './config.js'
import { queryOne } from './db/index.js'

export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// Express 4 tidak menangkap error dari handler async, jadi dibungkus.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Memvalidasi bagian request dengan skema zod dan mengganti isinya dengan hasil bersihnya.
export const validate = (schema, part = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[part])
  if (!r.success) return next(r.error)
  req[part] = r.data
  next()
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpires })
}

export async function requireAuth(req, _res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return next(new HttpError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu.'))
  try {
    const { sub } = jwt.verify(token, config.jwtSecret)
    const user = await queryOne('SELECT id, name, email FROM users WHERE id = ?', [sub])
    if (!user) throw new Error('user hilang')
    req.user = user
    next()
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Sesi berakhir, silakan masuk lagi.'))
  }
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Alamat tidak ditemukan.'))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const fields = {}
    for (const i of err.issues) fields[i.path.join('.') || '_'] ??= i.message
    return res.status(400).json({ error: 'VALIDATION', message: 'Data yang dikirim belum benar.', fields })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message, ...(err.fields && { fields: err.fields }) })
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'FILE_TOO_LARGE', message: `Ukuran foto maksimal ${config.maxUploadMb} MB.` })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'BAD_JSON', message: 'Format JSON tidak valid.' })
  }
  console.error(err)
  res.status(500).json({ error: 'INTERNAL', message: 'Terjadi kesalahan di server.' })
}