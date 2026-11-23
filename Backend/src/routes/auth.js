import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { config } from '../config.js'
import { query, queryOne } from '../db/index.js'
import { HttpError, requireAuth, signToken, validate, wrap } from '../http.js'
import { seedDemo } from '../services/seed.js'

const router = Router()

const email = z.string().trim().toLowerCase().email('Masukkan email yang valid.').max(120)
const password = z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72, 'Kata sandi maksimal 72 karakter.')

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(80),
  email,
  password,
})
const loginSchema = z.object({ email, password: z.string().min(1, 'Kata sandi wajib diisi.') })

const DUMMY_HASH = bcrypt.hashSync('tidak-dipakai', 10)
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email })

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { name, email, password } = req.body
  const existing = await queryOne('SELECT 1 FROM users WHERE email = ?', [email])
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Email sudah terdaftar.', { email: 'Email sudah terdaftar.' })
  }
  const hash = await bcrypt.hash(password, 10)
  const r = await query('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)', [name, email, hash])
  if (config.seedOnRegister) await seedDemo(r.insertId)
  const user = publicUser({ id: r.insertId, name, email })
  res.status(201).json({ token: signToken(user.id), user })
}))

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const { email, password } = req.body
  const row = await queryOne('SELECT * FROM users WHERE email = ?', [email])
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.')
  res.json({ token: signToken(row.id), user: publicUser(row) })
}))

router.post('/forgot-password', validate(z.object({ email })), (_req, res) => {
  res.status(202).json({ ok: true, message: 'Jika email terdaftar, petunjuk reset akan dikirim.' })
})

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

export default router