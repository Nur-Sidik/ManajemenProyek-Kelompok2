import { query, queryOne, withTransaction } from '../db/index.js'
import { addMonths, monthsBetween, rp, today } from '../util.js'
import { notify } from './notify.js'

const MILESTONES = [100, 75, 50, 25]

async function shape(g) {
  const sumRow = await queryOne('SELECT COALESCE(SUM(amount),0) AS s FROM deposits WHERE goal_id = ?', [g.id])
  const saved = Number(sumRow?.s ?? 0)
  const target = Number(g.target_amount)
  const depositsRaw = await query(
    'SELECT id, amount, date, note FROM deposits WHERE goal_id = ? ORDER BY date DESC, id DESC LIMIT 30',
    [g.id]
  )
  const deposits = depositsRaw.map((d) => ({ ...d, amount: Number(d.amount) }))
  const monthsLeft = g.deadline ? monthsBetween(today(), g.deadline) : null
  const remaining = Math.max(target - saved, 0)
  return {
    id: g.id,
    name: g.name,
    target,
    saved,
    pct: Math.min(100, Math.round((saved / target) * 100)),
    deadline: g.deadline,
    months: g.months ?? null,
    active: g.status !== 'inactive',
    monthsLeft,
    monthlyNeed: monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null,
    deposits,
  }
}

export async function listGoals(userId, status) {
  const rows = status
    ? await query('SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY id', [userId, status])
    : await query('SELECT * FROM goals WHERE user_id = ? ORDER BY id', [userId])
  return Promise.all(rows.map(shape))
}

export async function getGoal(userId, id) {
  const g = await queryOne('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, userId])
  return g ? shape(g) : null
}

export async function createGoal(userId, { name, target, months, initialAmount }) {
  const deadline = months ? addMonths(today(), months) : null
  const id = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO goals (user_id, name, target_amount, deadline, months) VALUES (?,?,?,?,?)',
      [userId, name, target, deadline, months ?? null]
    )
    if (initialAmount) {
      await conn.execute(
        'INSERT INTO deposits (goal_id, amount, date, note) VALUES (?,?,?,?)',
        [r.insertId, initialAmount, today(), 'Tabungan awal']
      )
    }
    return r.insertId
  })
  return getGoal(userId, id)
}

export async function updateGoal(userId, id, { name, target, months }) {
  const g = await queryOne('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, userId])
  if (!g) return null
  const deadline = months ? addMonths(today(), months) : null
  await query(
    'UPDATE goals SET name = ?, target_amount = ?, deadline = ?, months = ? WHERE id = ?',
    [name, target, deadline, months ?? null, id]
  )
  return getGoal(userId, id)
}

export async function setGoalStatus(userId, id, status) {
  const r = await query('UPDATE goals SET status = ? WHERE id = ? AND user_id = ?', [status, id, userId])
  return r.affectedRows ? getGoal(userId, id) : null
}

export async function addDeposit(userId, id, amount, { date = today(), note = '' } = {}) {
  const before = await getGoal(userId, id)
  if (!before) return null
  await query('INSERT INTO deposits (goal_id, amount, date, note) VALUES (?,?,?,?)', [id, amount, date, note])
  const after = await getGoal(userId, id)

  const reached = MILESTONES.find((m) => after.pct >= m && before.pct < m)
  if (reached) {
    await notify(userId, {
      kind: 'goal',
      title: reached >= 100 ? `Target ${after.name} tercapai` : `Target ${after.name} ${after.pct}% tercapai`,
      body: reached >= 100 ? 'Selamat, targetmu sudah terkumpul' : `Tinggal ${rp(after.target - after.saved)} lagi`,
      link: `/target/${id}`,
      dedupeKey: `goal:${id}:${reached}`,
    })
  }
  return after
}