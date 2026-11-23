import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
process.env.OCR_MOCK_DELAY_MS = '0'
process.env.AUTH_RATE_LIMIT = '1000'

let server, base
const call = async (method, path, { token, body, form } = {}) => {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body) }
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

const register = async (email, name = 'Uji Coba') => {
  const r = await call('POST', '/api/auth/register', { body: { name, email, password: 'password123' } })
  assert.equal(r.status, 201)
  return r.json.token
}

test('auth: daftar, masuk, validasi, email ganda', async () => {
  const bad = await call('POST', '/api/auth/register', { body: { name: '', email: 'x', password: '123' } })
  assert.equal(bad.status, 400)
  assert.ok(bad.json.fields.name && bad.json.fields.email && bad.json.fields.password)

  const token = await register('Budi@Mail.com')
  const dup = await call('POST', '/api/auth/register', { body: { name: 'B', email: 'budi@mail.com', password: 'password123' } })
  assert.equal(dup.status, 409) // email tidak membedakan huruf besar/kecil

  const wrong = await call('POST', '/api/auth/login', { body: { email: 'budi@mail.com', password: 'salahsalah' } })
  assert.equal(wrong.status, 401)
  const nouser = await call('POST', '/api/auth/login', { body: { email: 'tidak@ada.com', password: 'password123' } })
  assert.equal(nouser.status, 401)
  assert.equal(nouser.json.message, wrong.json.message) // pesan sama: tidak membocorkan email terdaftar

  const ok = await call('POST', '/api/auth/login', { body: { email: 'BUDI@mail.com', password: 'password123' } })
  assert.equal(ok.status, 200)
  const me = await call('GET', '/api/auth/me', { token: ok.json.token })
  assert.equal(me.json.user.email, 'budi@mail.com')
  assert.equal(JSON.stringify(me.json).includes('password'), false)
  assert.ok(token)
})

test('endpoint data butuh token', async () => {
  assert.equal((await call('GET', '/api/summary')).status, 401)
  assert.equal((await call('GET', '/api/summary', { token: 'palsu' })).status, 401)
})

test('data contoh sesuai desain Figma', async () => {
  const t = await register('seed@mail.com')
  const b = (await call('GET', '/api/budgets', { token: t })).json.budgets
  const by = Object.fromEntries(b.map((x) => [x.category, x]))
  assert.equal(by.Makanan.spent, 850000)
  assert.equal(by.Transport.spent, 225000)
  assert.equal(by.Hiburan.spent, 550000)
  assert.equal(by.Hiburan.pct, 110)
  assert.equal(by.Lainnya.spent, 525000)

  const s = (await call('GET', '/api/summary', { token: t })).json
  assert.equal(s.income, 5000000)
  assert.equal(s.expense, 2150000)
  assert.equal(s.balance, 2850000)

  const g = (await call('GET', '/api/goals', { token: t })).json.goals
  assert.equal(g[0].name, 'Laptop Baru')
  assert.equal(g[0].saved, 4200000)
  assert.equal(g[0].pct, 35)
  assert.equal(g[0].monthsLeft, 8)
  assert.equal(g[0].monthlyNeed, 975000) // (12.000.000 - 4.200.000) / 8
  assert.equal(g[0].deposits.length, 3)

  const n = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.equal(n.length, 3)
  assert.equal(n[0].title, 'Anggaran Hiburan terlampaui')
  assert.equal(n[0].to, '/budget?alert=1')
})

test('transaksi: validasi, saldo, anggaran, notifikasi', async () => {
  const t = await register('tx@mail.com')
  const bad = await call('POST', '/api/transactions', { token: t, body: { title: 'x', amount: -5, category: 'Makanan' } })
  assert.equal(bad.status, 400)
  const nocat = await call('POST', '/api/transactions', { token: t, body: { title: 'x', amount: 5000 } })
  assert.equal(nocat.json.fields.category, 'Kategori wajib dipilih.')
  const future = await call('POST', '/api/transactions', { token: t, body: { title: 'x', amount: 5000, category: 'Makanan', date: '2999-01-01' } })
  assert.equal(future.status, 400)
  const badcat = await call('POST', '/api/transactions', { token: t, body: { title: 'x', amount: 5000, category: 'Judi' } })
  assert.equal(badcat.status, 400)

  const before = (await call('GET', '/api/summary', { token: t })).json
  // Makanan 850.000 / 1.000.000 -> tambah 60.000 = 91% (>= ambang 90) -> peringatan
  const r = await call('POST', '/api/transactions', { token: t, body: { title: 'Indomaret Test', amount: 60000, category: 'Makanan', source: 'scan' } })
  assert.equal(r.status, 201)
  assert.equal(r.json.transaction.amount, -60000)
  assert.equal(r.json.budget.pct, 91)
  const after = (await call('GET', '/api/summary', { token: t })).json
  assert.equal(after.balance, before.balance - 60000)
  assert.equal(after.expense, before.expense + 60000)

  const notifs = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.ok(notifs.some((n) => n.title === 'Anggaran Makanan hampir habis'))
  assert.ok(notifs.some((n) => n.title === 'Struk Indomaret tersimpan'))

  // Tambah lagi: tidak boleh membuat peringatan "hampir habis" kedua kali
  await call('POST', '/api/transactions', { token: t, body: { title: 'Lagi', amount: 1000, category: 'Makanan' } })
  const again = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.equal(again.filter((n) => n.title === 'Anggaran Makanan hampir habis').length, 1)

  const inc = await call('POST', '/api/transactions', { token: t, body: { title: 'Gaji', amount: 1000000, type: 'income' } })
  assert.equal(inc.json.transaction.category, 'Pemasukan')
  assert.equal(inc.json.transaction.amount, 1000000)
  assert.equal(inc.json.budget, null)

  const list = (await call('GET', '/api/transactions?limit=2', { token: t })).json.transactions
  assert.equal(list.length, 2)
})

test('anggaran: atur batas dan validasi', async () => {
  const t = await register('bud@mail.com')
  assert.equal((await call('PUT', '/api/budgets/Judi', { token: t, body: { limit: 1000 } })).status, 400)
  assert.equal((await call('PUT', '/api/budgets/Makanan', { token: t, body: { limit: 0 } })).status, 400)
  assert.equal((await call('PUT', '/api/budgets/Makanan', { token: t, body: { limit: 1000000, alertAt: 20 } })).status, 400)
  const ok = await call('PUT', '/api/budgets/Makanan', { token: t, body: { limit: 900000, alertAt: 70 } })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.budget.limit, 900000)
  assert.equal(ok.json.budget.alertAt, 70)
  // 850.000/900.000 = 94% >= 70% -> notifikasi peringatan langsung
  const n = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.ok(n.some((x) => x.title === 'Anggaran Makanan hampir habis'))
})

test('target tabungan: buat, setor, milestone, hak akses', async () => {
  const t = await register('goal@mail.com')
  const bad = await call('POST', '/api/goals', { token: t, body: { name: '', target: 0, months: 0 } })
  assert.equal(bad.status, 400)
  const c = await call('POST', '/api/goals', { token: t, body: { name: 'Liburan', target: 12000000, months: 8 } })
  assert.equal(c.status, 201)
  const g = c.json.goal
  assert.equal(g.monthsLeft, 8)
  assert.equal(g.monthlyNeed, 1500000)
  assert.equal(g.saved, 0)

  const d = await call('POST', `/api/goals/${g.id}/deposits`, { token: t, body: { amount: 3000000 } })
  assert.equal(d.json.goal.pct, 25)
  assert.equal(d.json.goal.saved, 3000000)
  const n = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.ok(n.some((x) => x.title === 'Target Liburan 25% tercapai'))
  assert.equal((await call('POST', `/api/goals/${g.id}/deposits`, { token: t, body: { amount: -1 } })).status, 400)

  // user lain tidak boleh melihat / menyetor ke target ini
  const other = await register('lain@mail.com')
  assert.equal((await call('GET', `/api/goals/${g.id}`, { token: other })).status, 404)
  assert.equal((await call('POST', `/api/goals/${g.id}/deposits`, { token: other, body: { amount: 1000 } })).status, 404)
  const otherGoals = (await call('GET', '/api/goals', { token: other })).json.goals
  assert.ok(!otherGoals.some((x) => x.id === g.id))
})

test('notifikasi: tandai dibaca, milik user lain ditolak', async () => {
  const t = await register('n1@mail.com')
  const other = await register('n2@mail.com')
  const [first] = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.equal((await call('POST', `/api/notifications/${first.id}/read`, { token: other })).status, 404)
  assert.equal((await call('POST', `/api/notifications/${first.id}/read`, { token: t })).status, 200)
  const after = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.equal(after.find((x) => x.id === first.id).read, true)
  await call('POST', '/api/notifications/read-all', { token: t })
  const all = (await call('GET', '/api/notifications', { token: t })).json.notifications
  assert.ok(all.every((x) => x.read))
})

test('laporan: minggu, bulan, tahun', async () => {
  const t = await register('rep@mail.com')
  const w = (await call('GET', '/api/report?range=week', { token: t })).json
  assert.equal(w.labels.length, 7)
  assert.equal(w.values.length, 7)
  const m = (await call('GET', '/api/report?range=month', { token: t })).json
  assert.deepEqual(m.labels, ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4'])
  const y = (await call('GET', '/api/report?range=year', { token: t })).json
  assert.equal(y.labels.length, 12)
  assert.equal(y.values.reduce((a, b) => a + b, 0), 2150000) // semua data contoh ada di bulan ini
  assert.equal(y.total, 2150000)
  assert.equal(y.categories.reduce((a, c) => a + c.amount, 0), 2150000)
  assert.equal((await call('GET', '/api/report?range=abc', { token: t })).status, 400)
})

test('scan struk: mock, gagal baca, file bukan foto', async () => {
  const t = await register('scan@mail.com')
  const ok = await call('POST', '/api/scan', { token: t, form: new FormData() })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.result.total, 52000)
  assert.equal(ok.json.result.category, 'Makanan')

  const f = new FormData()
  f.append('simulate', 'fail')
  const fail = await call('POST', '/api/scan', { token: t, form: f })
  assert.equal(fail.status, 422)
  assert.equal(fail.json.error, 'UNREADABLE')

  const txt = new FormData()
  txt.append('receipt', new Blob(['halo'], { type: 'text/plain' }), 'a.txt')
  const bad = await call('POST', '/api/scan', { token: t, form: txt })
  assert.equal(bad.status, 400)
  assert.equal(bad.json.error, 'FILE_INVALID')

  assert.equal((await call('POST', '/api/scan', { form: new FormData() })).status, 401)
})

test('reset data demo mengembalikan data awal', async () => {
  const t = await register('reset@mail.com')
  await call('POST', '/api/transactions', { token: t, body: { title: 'Tambahan', amount: 100000, category: 'Hiburan' } })
  assert.equal((await call('POST', '/api/demo/reset', { token: t })).status, 200)
  const b = (await call('GET', '/api/budgets', { token: t })).json.budgets
  assert.equal(b.find((x) => x.category === 'Hiburan').spent, 550000)
})

test('JSON rusak dan rute tidak ada', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{rusak' })
  assert.equal(res.status, 400)
  assert.equal((await call('GET', '/api/tidak-ada')).status, 401) // belum login
  const t = await register('nf@mail.com')
  assert.equal((await call('GET', '/api/tidak-ada', { token: t })).status, 404)
})
