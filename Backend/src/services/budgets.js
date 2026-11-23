import { query, queryOne } from '../db/index.js'
import { monthEnd, monthOf, monthStart, rp, today } from '../util.js'
import { notify } from './notify.js'

const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

export async function spentInMonth(userId, category, date = today()) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM transactions
     WHERE user_id = ? AND type = 'expense' AND category = ? AND date BETWEEN ? AND ?`,
    [userId, category, monthStart(date), monthEnd(date)]
  )
  return Number(row?.s ?? 0)
}

function shape(row, spent) {
  const limit = Number(row.limit_amount)
  return { category: row.category, limit, alertAt: row.alert_at, spent, pct: pctOf(spent, limit) }
}

export async function budgetStatus(userId, category) {
  const row = await queryOne('SELECT * FROM budgets WHERE user_id = ? AND category = ?', [userId, category])
  return row ? shape(row, await spentInMonth(userId, category)) : null
}

// month = 'YYYY-MM' (opsional, default bulan ini): hanya menentukan bulan untuk menghitung pengeluaran.
export async function listBudgets(userId, month) {
  const rows = await query('SELECT * FROM budgets WHERE user_id = ? ORDER BY category ASC', [userId])
  const date = month ? `${month}-01` : today()
  return Promise.all(rows.map(async (r) => shape(r, await spentInMonth(userId, r.category, date))))
}

export async function deleteBudget(userId, category) {
  const r = await query('DELETE FROM budgets WHERE user_id = ? AND category = ?', [userId, category])
  return r.affectedRows > 0
}

export async function upsertBudget(userId, category, limit, alertAt) {
  await query(
    `INSERT INTO budgets (user_id, category, limit_amount, alert_at) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount), alert_at = VALUES(alert_at)`,
    [userId, category, limit, alertAt]
  )
  return checkBudgetAlert(userId, category)
}

// Membuat notifikasi saat anggaran melewati ambang peringatan atau batasnya (sekali per bulan).
export async function checkBudgetAlert(userId, category) {
  const b = await budgetStatus(userId, category)
  if (!b) return null
  const month = monthOf(today())
  if (b.spent > b.limit) {
    await notify(userId, {
      kind: 'budget',
      title: `Anggaran ${category} terlampaui`,
      body: `Pengeluaran ${rp(b.spent)} dari batas ${rp(b.limit)}`,
      link: '/budget?alert=1',
      dedupeKey: `budget:over:${category}:${month}`,
    })
  } else if (b.pct >= b.alertAt) {
    await notify(userId, {
      kind: 'budget',
      title: `Anggaran ${category} hampir habis`,
      body: `${b.pct}% terpakai - sisa ${rp(b.limit - b.spent)}`,
      link: '/budget',
      dedupeKey: `budget:warn:${category}:${month}`,
    })
  }
  return b
}