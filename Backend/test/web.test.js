import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
process.env.OCR_MOCK_DELAY_MS = '0'
process.env.AUTH_RATE_LIMIT = '1000'

let server, base
const call = async (method, path, { token, body } = {}) => {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  let payload
  if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body) }
  const res = await fetch(base + path, { method, headers, body: payload })
  return { status: res.status, json: await res.json().catch(() => null) }
}

before(async () => {
  const { createApp } = await import('../src/app.js')
  await new Promise((r) => { server = createApp().listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  server.close()
  const { closeDb } = await import('../src/db/index.js')
  closeDb()
})

const register = async (email) => {
  const r = await call('POST', '/api/auth/register', { body: { name: 'Uji Web', email, password: 'password123' } })
  assert.equal(r.status, 201)
  return r.json.token
}

test('profil: baca, ubah, email ganda, ganti kata sandi', async () => {
  const t = await register('p1@mail.com')
  await register('p2@mail.com')
  const me = (await call('GET', '/api/users/me', { token: t })).json.user
  assert.equal(me.language, 'id')
  assert.equal(me.notifBudget, true)

  const up = await call('PUT', '/api/users/me', { token: t, body: { name: 'Nama Baru', email: 'p1@mail.com', phone: '+62 812', language: 'en', budgetPeriod: 'weekly', notifWeekly: true } })
  assert.equal(up.status, 200)
  assert.equal(up.json.user.name, 'Nama Baru')
  assert.equal(up.json.user.phone, '+62 812')
  assert.equal(up.json.user.budgetPeriod, 'weekly')
  assert.equal(up.json.user.notifWeekly, true)

  const dup = await call('PUT', '/api/users/me', { token: t, body: { name: 'X', email: 'p2@mail.com' } })
  assert.equal(dup.status, 409)
  assert.equal((await call('PUT', '/api/users/me', { token: t, body: { name: '', email: 'bukan-email' } })).status, 400)

  assert.equal((await call('PUT', '/api/users/me/password', { token: t, body: { currentPassword: 'salahsalah', newPassword: 'passwordbaru1' } })).status, 400)
  assert.equal((await call('PUT', '/api/users/me/password', { token: t, body: { currentPassword: 'password123', newPassword: 'pendek' } })).status, 400)
  assert.equal((await call('PUT', '/api/users/me/password', { token: t, body: { currentPassword: 'password123', newPassword: 'passwordbaru1' } })).status, 200)
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'p1@mail.com', password: 'passwordbaru1' } })).status, 200)
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'p1@mail.com', password: 'password123' } })).status, 401)
  assert.equal((await call('GET', '/api/users/me')).status, 401)
})

test('lupa kata sandi: jawaban sama untuk email terdaftar atau tidak', async () => {
  await register('lupa@mail.com')
  const a = await call('POST', '/api/auth/forgot-password', { body: { email: 'lupa@mail.com' } })
  const b = await call('POST', '/api/auth/forgot-password', { body: { email: 'tidakada@mail.com' } })
  assert.equal(a.status, 202)
  assert.deepEqual(a.json, b.json)
})

test('transaksi: kategori baru, catatan, sumber pemasukan, ringkasan per bulan', async () => {
  const t = await register('tx@mail.com')
  const r = await call('POST', '/api/transactions', { token: t, body: { title: 'Obat', amount: 25000, category: 'Kesehatan', note: 'flu' } })
  assert.equal(r.status, 201)
  assert.equal(r.json.transaction.category, 'Kesehatan')
  assert.equal(r.json.transaction.note, 'flu')
  const inc = await call('POST', '/api/transactions', { token: t, body: { title: 'Gaji Magang', amount: 500000, type: 'income', category: 'Gaji' } })
  assert.equal(inc.json.transaction.category, 'Gaji')
  const noCat = await call('POST', '/api/transactions', { token: t, body: { title: 'Lain', amount: 1000, type: 'income' } })
  assert.equal(noCat.json.transaction.category, 'Pemasukan')
  assert.equal((await call('POST', '/api/transactions', { token: t, body: { title: 'x', amount: 1000, category: 'Judi' } })).status, 400)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const s1 = (await call('GET', `/api/summary?month=${thisMonth}`, { token: t })).json
  assert.ok(s1.expense >= 25000)
  const s2 = (await call('GET', '/api/summary?month=2001-01', { token: t })).json
  assert.equal(s2.expense, 0)
  assert.equal(s2.income, 0)
  assert.equal((await call('GET', '/api/summary?month=abc', { token: t })).status, 400)
})

test('anggaran: kategori baru, per bulan, hapus', async () => {
  const t = await register('bud2@mail.com')
  const put = await call('PUT', '/api/budgets/Belanja', { token: t, body: { limit: 300000, alertAt: 80 } })
  assert.equal(put.status, 200)
  const old = (await call('GET', '/api/budgets?month=2001-01', { token: t })).json.budgets
  assert.equal(old.find((b) => b.category === 'Belanja').spent, 0) // bulan lain: belum ada pengeluaran
  assert.equal((await call('DELETE', '/api/budgets/Belanja', { token: t })).status, 200)
  assert.equal((await call('DELETE', '/api/budgets/Belanja', { token: t })).status, 404)
  assert.equal((await call('DELETE', '/api/budgets/Judi', { token: t })).status, 400)
  const now = (await call('GET', '/api/budgets', { token: t })).json.budgets
  assert.ok(!now.some((b) => b.category === 'Belanja'))
})

test('target: tabungan awal, fleksibel, ubah, nonaktifkan, setoran bercatatan', async () => {
  const t = await register('goal2@mail.com')
  const c = await call('POST', '/api/goals', { token: t, body: { name: 'Motor', target: 10000000, months: 10, initialAmount: 1000000 } })
  assert.equal(c.status, 201)
  const g = c.json.goal
  assert.equal(g.saved, 1000000)
  assert.equal(g.months, 10)
  assert.equal(g.active, true)
  assert.equal((await call('POST', '/api/goals', { token: t, body: { name: 'X', target: 1000, months: 3, initialAmount: 5000 } })).status, 400)

  const flex = await call('POST', '/api/goals', { token: t, body: { name: 'Fleksibel', target: 2000000, months: null } })
  assert.equal(flex.status, 201)
  assert.equal(flex.json.goal.deadline, null)
  assert.equal(flex.json.goal.months, null)

  const up = await call('PUT', `/api/goals/${g.id}`, { token: t, body: { name: 'Motor Baru', target: 12000000, months: 12 } })
  assert.equal(up.status, 200)
  assert.equal(up.json.goal.name, 'Motor Baru')
  assert.equal(up.json.goal.saved, 1000000) // setoran tidak hilang

  const dep = await call('POST', `/api/goals/${g.id}/deposits`, { token: t, body: { amount: 500000, date: '2026-11-01', note: 'Bonus' } })
  assert.equal(dep.status, 201)
  assert.equal(dep.json.goal.deposits.find((d) => d.note === 'Bonus').date, '2026-11-01')
  assert.equal((await call('POST', `/api/goals/${g.id}/deposits`, { token: t, body: { amount: 1000, date: '2999-01-01' } })).status, 400)

  const off = await call('PATCH', `/api/goals/${g.id}/status`, { token: t, body: { status: 'inactive' } })
  assert.equal(off.json.goal.active, false)
  const active = (await call('GET', '/api/goals?status=active', { token: t })).json.goals
  const inactive = (await call('GET', '/api/goals?status=inactive', { token: t })).json.goals
  assert.ok(!active.some((x) => x.id === g.id))
  assert.ok(inactive.some((x) => x.id === g.id))

  const other = await register('goal3@mail.com')
  assert.equal((await call('PUT', `/api/goals/${g.id}`, { token: other, body: { name: 'Curi', target: 1000, months: 1 } })).status, 404)
  assert.equal((await call('PATCH', `/api/goals/${g.id}/status`, { token: other, body: { status: 'active' } })).status, 404)
})

test('laporan: rentang tanggal dan kategori baru', async () => {
  const t = await register('rep2@mail.com')
  await call('POST', '/api/transactions', { token: t, body: { title: 'Buku', amount: 80000, category: 'Pendidikan' } })
  const w = (await call('GET', '/api/report?range=week', { token: t })).json
  assert.equal(w.days, 7)
  assert.ok(w.from && w.to)
  assert.ok(w.categories.some((c) => c.name === 'Pendidikan'))
  assert.ok(w.categories.every((c) => c.amount > 0))
})
