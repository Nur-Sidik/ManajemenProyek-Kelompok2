import { query, queryOne } from '../db/index.js'
import { CATEGORIES } from '../config.js'
import { addDays, addMonths, dayOfWeek, monthEnd, monthStart, rp, today } from '../util.js'
import { checkBudgetAlert } from './budgets.js'
import { notify } from './notify.js'

const signed = (t) => {
  const amt = Number(t.amount)
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    amount: t.type === 'expense' ? -amt : amt,
    type: t.type,
    date: t.date,
    source: t.source,
    note: t.note ?? '',
  }
}

export async function listTransactions(userId, { limit = 50, category, from, to } = {}) {
  const where = ['user_id = ?']
  const args = [userId]
  if (category) { where.push('category = ?'); args.push(category) }
  if (from) { where.push('date >= ?'); args.push(from) }
  if (to) { where.push('date <= ?'); args.push(to) }
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50))
  const rows = await query(
    `SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY date DESC, id DESC LIMIT ${safeLimit}`,
    args
  )
  return rows.map(signed)
}

export async function addTransaction(userId, { title, category, amount, type, date, source, note = '' }) {
  const r = await query(
    'INSERT INTO transactions (user_id, title, category, amount, type, date, source, note) VALUES (?,?,?,?,?,?,?,?)',
    [userId, title, category, amount, type, date, source, note]
  )
  const row = await queryOne('SELECT * FROM transactions WHERE id = ?', [r.insertId])
  const tx = signed(row)

  let budget = null
  if (type === 'expense') budget = await checkBudgetAlert(userId, category)
  if (source === 'scan') {
    await notify(userId, {
      kind: 'receipt',
      title: `Struk ${title.split(' ')[0]} tersimpan`,
      body: `${rp(amount)} - kategori ${category}`,
      link: '/report',
      dedupeKey: `receipt:${tx.id}`,
    })
  }
  return { transaction: tx, budget }
}

// Ringkasan: pemasukan & pengeluaran bulan ini, saldo = seluruh pemasukan - seluruh pengeluaran.
export async function summary(userId, forMonth) {
  const t = forMonth ? `${forMonth}-01` : today()
  const month = await query(
    `SELECT type, COALESCE(SUM(amount),0) AS s FROM transactions
     WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY type`,
    [userId, monthStart(t), monthEnd(t)]
  )
  const all = await query(
    'SELECT type, COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? GROUP BY type',
    [userId]
  )
  const pick = (rows, type) => Number(rows.find((r) => r.type === type)?.s ?? 0)
  return {
    income: pick(month, 'income'),
    expense: pick(month, 'expense'),
    balance: pick(all, 'income') - pick(all, 'expense'),
  }
}

// ---------- Laporan ----------
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTH_LETTER = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export async function report(userId, range) {
  const t = today()
  let buckets
  let title
  if (range === 'week') {
    title = 'Pengeluaran 7 hari terakhir'
    buckets = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(t, i - 6)
      return { label: DAYS[dayOfWeek(d)], from: d, to: d }
    })
  } else if (range === 'month') {
    title = 'Pengeluaran 4 minggu terakhir'
    buckets = Array.from({ length: 4 }, (_, i) => {
      const to = addDays(t, -7 * (3 - i))
      return { label: `Mg ${i + 1}`, from: addDays(to, -6), to }
    })
  } else {
    title = 'Pengeluaran 12 bulan terakhir'
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = addMonths(monthStart(t), i - 11)
      return { label: MONTH_LETTER[Number(d.slice(5, 7)) - 1], from: monthStart(d), to: monthEnd(d) }
    })
  }

  const values = await Promise.all(
    buckets.map(async (b) => {
      const row = await queryOne(
        `SELECT COALESCE(SUM(amount),0) AS s FROM transactions
         WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?`,
        [userId, b.from, b.to]
      )
      return Number(row?.s ?? 0)
    })
  )

  const from = buckets[0].from
  const to = buckets[buckets.length - 1].to
  const byCat = await query(
    `SELECT category, SUM(amount) AS s FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ? GROUP BY category`,
    [userId, from, to]
  )
  const total = byCat.reduce((a, c) => a + Number(c.s), 0)
  const categories = [...new Set([...CATEGORIES, ...byCat.map((c) => c.category)])]
    .map((name) => {
      const amount = Number(byCat.find((c) => c.category === name)?.s ?? 0)
      return { name, amount, pct: total ? Math.round((amount / total) * 100) : 0 }
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return {
    range,
    title,
    from,
    to,
    days: Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
    labels: buckets.map((b) => b.label),
    values,
    total,
    categories,
  }
}