import { withTransaction } from '../db/index.js'
import { addDays, addMonths, monthOf, monthStart, today } from '../util.js'
import { notify } from './notify.js'

const EXPENSES = [
  ['Indomaret', 'Makanan', 52000, 0],
  ['Warung Makan Bu Tini', 'Makanan', 35000, 2],
  ['Kopi Kenangan', 'Makanan', 28000, 3],
  ['Superindo', 'Makanan', 215000, 5],
  ['Warteg Bahari', 'Makanan', 40000, 7],
  ['Pasar Kranggan', 'Makanan', 480000, 9],
  ['Gojek', 'Transport', 32000, 1],
  ['Bensin Pertamina', 'Transport', 150000, 4],
  ['Parkir Mall', 'Transport', 43000, 8],
  ['Netflix', 'Hiburan', 186000, 6],
  ['Bioskop XXI', 'Hiburan', 120000, 10],
  ['Top Up Game', 'Hiburan', 244000, 11],
  ['Pulsa Telkomsel', 'Lainnya', 100000, 3],
  ['Fotokopi dan ATK', 'Lainnya', 25000, 5],
  ['Skincare', 'Lainnya', 400000, 12],
]

const BUDGETS = [
  ['Makanan', 1000000],
  ['Transport', 500000],
  ['Hiburan', 500000],
  ['Lainnya', 1000000],
]

// Mengosongkan data milik user lalu mengisi ulang dengan data contoh.
export async function seedDemo(userId) {
  let laptopId
  const t = today()

  await withTransaction(async (conn) => {
    for (const table of ['transactions', 'budgets', 'goals', 'notifications']) {
      await conn.execute(`DELETE FROM ${table} WHERE user_id = ?`, [userId])
    }
    const first = monthStart(t)
    const ago = (n) => { const d = addDays(t, -n); return d < first ? first : d }

    const txSql = 'INSERT INTO transactions (user_id, title, category, amount, type, date, source) VALUES (?,?,?,?,?,?,?)'
    await conn.execute(txSql, [userId, 'Uang Saku', 'Pemasukan', 2000000, 'income', first, 'manual'])
    await conn.execute(txSql, [userId, 'Kiriman Orang Tua', 'Pemasukan', 3000000, 'income', first, 'manual'])
    for (const [title, cat, amount, n] of EXPENSES) {
      await conn.execute(txSql, [userId, title, cat, amount, 'expense', ago(n), title === 'Indomaret' ? 'scan' : 'manual'])
    }

    for (const [cat, limit] of BUDGETS) {
      await conn.execute('INSERT INTO budgets (user_id, category, limit_amount, alert_at) VALUES (?,?,?,90)', [userId, cat, limit])
    }

    const [laptopRes] = await conn.execute('INSERT INTO goals (user_id, name, target_amount, deadline) VALUES (?,?,?,?)', [userId, 'Laptop Baru', 12000000, addMonths(t, 8)])
    laptopId = laptopRes.insertId
    await conn.execute('INSERT INTO deposits (goal_id, amount, date) VALUES (?,?,?)', [laptopId, 2250000, addMonths(t, -3)])
    await conn.execute('INSERT INTO deposits (goal_id, amount, date) VALUES (?,?,?)', [laptopId, 975000, addMonths(t, -2)])
    await conn.execute('INSERT INTO deposits (goal_id, amount, date) VALUES (?,?,?)', [laptopId, 975000, addMonths(t, -1)])

    const [daruratRes] = await conn.execute('INSERT INTO goals (user_id, name, target_amount, deadline) VALUES (?,?,?,?)', [userId, 'Dana Darurat', 5000000, null])
    await conn.execute('INSERT INTO deposits (goal_id, amount, date) VALUES (?,?,?)', [daruratRes.insertId, 1500000, addMonths(t, -1)])
  })

  // Notifikasi awal setelah transaksi database selesai di-commit
  await notify(userId, { kind: 'goal', title: 'Target Laptop Baru 35% tercapai', body: 'Tinggal Rp 7.800.000 lagi', link: `/target/${laptopId}`, dedupeKey: `goal:${laptopId}:25` })
  await notify(userId, { kind: 'receipt', title: 'Struk Indomaret tersimpan', body: 'Rp 52.000 - kategori Makanan', link: '/report', dedupeKey: 'receipt:seed' })
  await notify(userId, { kind: 'budget', title: 'Anggaran Hiburan terlampaui', body: 'Pengeluaran Rp 550.000 dari batas Rp 500.000', link: '/budget?alert=1', dedupeKey: `budget:over:Hiburan:${monthOf(t)}` })
}