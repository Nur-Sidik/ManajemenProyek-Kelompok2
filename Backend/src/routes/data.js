import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { CATEGORIES, INCOME_CATEGORIES, config } from '../config.js'
import { HttpError, requireAuth, validate, wrap } from '../http.js'
import { query } from '../db/index.js'
import { deleteBudget, listBudgets, upsertBudget } from '../services/budgets.js'
import { addDeposit, createGoal, getGoal, listGoals, setGoalStatus, updateGoal } from '../services/goals.js'
import { listNotifications } from '../services/notify.js'
import { scanReceipt } from '../services/ocr.js'
import { seedDemo } from '../services/seed.js'
import { addTransaction, listTransactions, report, summary } from '../services/transactions.js'
import { isValidDate, today } from '../util.js'

const router = Router()
router.use(requireAuth)

const money = (label) =>
  z.coerce.number({ invalid_type_error: `${label} harus berupa angka.` })
    .int(`${label} harus bilangan bulat.`)
    .positive(`${label} harus lebih dari 0.`)
    .max(100_000_000_000, `${label} terlalu besar.`)
const category = z.enum(CATEGORIES, { errorMap: () => ({ message: 'Kategori tidak dikenal.' }) })
const id = z.coerce.number().int().positive()
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format bulan YYYY-MM.')

// ---------- ringkasan ----------
router.get('/summary', validate(z.object({ month: month.optional() }), 'query'), wrap(async (req, res) => {
  res.json(await summary(req.user.id, req.query.month))
}))

// ---------- transaksi ----------
const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  category: z.enum([...new Set([...CATEGORIES, ...INCOME_CATEGORIES, 'Pemasukan'])]).optional(),
  from: z.string().refine(isValidDate, 'Format tanggal YYYY-MM-DD.').optional(),
  to: z.string().refine(isValidDate, 'Format tanggal YYYY-MM-DD.').optional(),
})
router.get('/transactions', validate(listQuery, 'query'), wrap(async (req, res) => {
  res.json({ transactions: await listTransactions(req.user.id, req.query) })
}))

const anyCategory = z.enum([...new Set([...CATEGORIES, ...INCOME_CATEGORIES, 'Pemasukan'])], { errorMap: () => ({ message: 'Kategori tidak dikenal.' }) })
const txSchema = z.object({
  title: z.string().trim().min(1, 'Nama toko / keterangan wajib diisi.').max(100),
  amount: money('Nominal'),
  type: z.enum(['expense', 'income']).default('expense'),
  category: anyCategory.optional(),
  date: z.string().refine(isValidDate, 'Format tanggal YYYY-MM-DD.').optional(),
  source: z.enum(['manual', 'scan']).default('manual'),
  note: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').default(''),
}).superRefine((v, ctx) => {
  if (v.type === 'expense' && !v.category) ctx.addIssue({ code: 'custom', path: ['category'], message: 'Kategori wajib dipilih.' })
  if (v.type === 'expense' && v.category && !CATEGORIES.includes(v.category)) ctx.addIssue({ code: 'custom', path: ['category'], message: 'Kategori pengeluaran tidak dikenal.' })
  if (v.date && v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Tanggal tidak boleh di masa depan.' })
})
router.post('/transactions', validate(txSchema), wrap(async (req, res) => {
  const b = req.body
  const result = await addTransaction(req.user.id, {
    title: b.title,
    amount: b.amount,
    type: b.type,
    category: b.type === 'income' ? (b.category && INCOME_CATEGORIES.includes(b.category) ? b.category : 'Pemasukan') : b.category,
    date: b.date ?? today(),
    source: b.source,
    note: b.note,
  })
  res.status(201).json(result)
}))

// ---------- anggaran ----------
router.get('/budgets', validate(z.object({ month: month.optional() }), 'query'), wrap(async (req, res) => {
  res.json({ budgets: await listBudgets(req.user.id, req.query.month) })
}))

const budgetSchema = z.object({
  limit: money('Batas anggaran'),
  alertAt: z.coerce.number().int().min(50).max(99).default(90),
})
router.delete('/budgets/:category', validate(z.object({ category }), 'params'), wrap(async (req, res) => {
  if (!(await deleteBudget(req.user.id, req.params.category))) throw new HttpError(404, 'NOT_FOUND', 'Anggaran tidak ditemukan.')
  res.json({ ok: true })
}))
router.put('/budgets/:category', validate(z.object({ category }), 'params'), validate(budgetSchema), wrap(async (req, res) => {
  const budget = await upsertBudget(req.user.id, req.params.category, req.body.limit, req.body.alertAt)
  res.json({ budget })
}))

// ---------- target tabungan ----------
router.get('/goals', validate(z.object({ status: z.enum(['active', 'inactive']).optional() }), 'query'), wrap(async (req, res) => {
  res.json({ goals: await listGoals(req.user.id, req.query.status) })
}))

const goalSchema = z.object({
  name: z.string().trim().min(1, 'Nama target wajib diisi.').max(80),
  target: money('Nominal target'),
  months: z.preprocess((v) => (v === '' || v === 0 ? null : v), z.coerce.number({ invalid_type_error: 'Jumlah bulan harus berupa angka.' }).int().min(1, 'Minimal 1 bulan.').max(600, 'Maksimal 600 bulan.').nullish()),
})
router.post('/goals', validate(goalSchema.extend({ initialAmount: z.coerce.number().int().min(0, 'Tabungan awal tidak boleh negatif.').max(100_000_000_000).default(0) }).refine((v) => v.initialAmount <= v.target, { path: ['initialAmount'], message: 'Tabungan awal tidak boleh melebihi nominal target.' })), wrap(async (req, res) => {
  res.status(201).json({ goal: await createGoal(req.user.id, req.body) })
}))

router.put('/goals/:id', validate(z.object({ id }), 'params'), validate(goalSchema), wrap(async (req, res) => {
  const goal = await updateGoal(req.user.id, req.params.id, req.body)
  if (!goal) throw new HttpError(404, 'NOT_FOUND', 'Target tidak ditemukan.')
  res.json({ goal })
}))

router.patch('/goals/:id/status', validate(z.object({ id }), 'params'), validate(z.object({ status: z.enum(['active', 'inactive']) })), wrap(async (req, res) => {
  const goal = await setGoalStatus(req.user.id, req.params.id, req.body.status)
  if (!goal) throw new HttpError(404, 'NOT_FOUND', 'Target tidak ditemukan.')
  res.json({ goal })
}))

router.get('/goals/:id', validate(z.object({ id }), 'params'), wrap(async (req, res) => {
  const goal = await getGoal(req.user.id, req.params.id)
  if (!goal) throw new HttpError(404, 'NOT_FOUND', 'Target tidak ditemukan.')
  res.json({ goal })
}))

router.post('/goals/:id/deposits', validate(z.object({ id }), 'params'), validate(z.object({
  amount: money('Nominal setoran'),
  date: z.string().refine(isValidDate, 'Format tanggal YYYY-MM-DD.').optional(),
  note: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').default(''),
}).refine((v) => !v.date || v.date <= today(), { path: ['date'], message: 'Tanggal tidak boleh di masa depan.' })), wrap(async (req, res) => {
  const goal = await addDeposit(req.user.id, req.params.id, req.body.amount, { date: req.body.date, note: req.body.note })
  if (!goal) throw new HttpError(404, 'NOT_FOUND', 'Target tidak ditemukan.')
  res.status(201).json({ goal })
}))

// ---------- notifikasi ----------
router.get('/notifications', wrap(async (req, res) => res.json({ notifications: await listNotifications(req.user.id) })))
router.post('/notifications/read-all', wrap(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id])
  res.json({ ok: true })
}))
router.post('/notifications/:id/read', validate(z.object({ id }), 'params'), wrap(async (req, res) => {
  const r = await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
  if (!r.affectedRows) throw new HttpError(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan.')
  res.json({ ok: true })
}))

// ---------- laporan ----------
router.get('/report', validate(z.object({ range: z.enum(['week', 'month', 'year']).default('week') }), 'query'), wrap(async (req, res) => {
  res.json(await report(req.user.id, req.query.range))
}))

// ---------- scan struk ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype)) return cb(null, true)
    cb(new HttpError(400, 'FILE_INVALID', 'File harus berupa foto (JPG, PNG, WebP, atau HEIC).'))
  },
})
router.post('/scan', upload.single('receipt'), wrap(async (req, res) => {
  const result = await scanReceipt({ file: req.file, simulateFail: req.body?.simulate === 'fail' })
  res.json({ result })
}))

// ---------- data demo ----------
router.post('/demo/reset', wrap(async (req, res) => {
  await seedDemo(req.user.id)
  res.json({ ok: true })
}))

export default router