import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query, queryOne } from '../db/index.js'
import { HttpError, requireAuth, validate, wrap } from '../http.js'

const router = Router()
router.use(requireAuth)

const shape = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  language: u.language,
  currency: u.currency,
  budgetPeriod: u.budget_period,
  notifBudget: !!u.notif_budget,
  notifGoal: !!u.notif_goal,
  notifWeekly: !!u.notif_weekly,
})
const load = async (id) => shape(await queryOne('SELECT * FROM users WHERE id = ?', [id]))

router.get('/me', wrap(async (req, res) => res.json({ user: await load(req.user.id) })))

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(80),
  email: z.string().trim().toLowerCase().email('Masukkan email yang valid.').max(120),
  phone: z.string().trim().max(30, 'Nomor telepon terlalu panjang.').default(''),
  language: z.enum(['id', 'en']).default('id'),
  currency: z.enum(['IDR']).default('IDR'),
  budgetPeriod: z.enum(['monthly', 'weekly']).default('monthly'),
  notifBudget: z.boolean().default(true),
  notifGoal: z.boolean().default(true),
  notifWeekly: z.boolean().default(false),
})

router.put('/me', validate(profileSchema), wrap(async (req, res) => {
  const b = req.body
  const taken = await queryOne('SELECT 1 FROM users WHERE email = ? AND id <> ?', [b.email, req.user.id])
  if (taken) throw new HttpError(409, 'EMAIL_TAKEN', 'Email sudah dipakai akun lain.', { email: 'Email sudah dipakai akun lain.' })
  await query(
    `UPDATE users SET name = ?, email = ?, phone = ?, language = ?, currency = ?, budget_period = ?,
     notif_budget = ?, notif_goal = ?, notif_weekly = ? WHERE id = ?`,
    [b.name, b.email, b.phone, b.language, b.currency, b.budgetPeriod,
      b.notifBudget ? 1 : 0, b.notifGoal ? 1 : 0, b.notifWeekly ? 1 : 0, req.user.id]
  )
  res.json({ user: await load(req.user.id) })
}))

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
  newPassword: z.string().min(8, 'Kata sandi baru minimal 8 karakter.').max(72, 'Kata sandi maksimal 72 karakter.'),
})

router.put('/me/password', validate(passwordSchema), wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
  if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Kata sandi saat ini salah.', { currentPassword: 'Kata sandi saat ini salah.' })
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), req.user.id])
  res.json({ ok: true })
}))

export default router