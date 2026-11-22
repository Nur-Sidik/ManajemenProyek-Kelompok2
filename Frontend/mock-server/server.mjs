// Mock REST API SaveSmart AI (tanpa dependensi) — untuk pengembangan Frontend tanpa Backend asli.
// Jalankan: npm run mock   → http://localhost:4000
// Akun demo: demo@savesmart.ai / password123
import http from 'node:http';

const PORT = process.env.PORT || 4000;
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const monthOf = (s) => String(s).slice(0, 7);
let seq = 100;
const nid = () => String(++seq);

const db = {
  user: { id: '1', name: 'Abdullah Duwi Putro', email: 'demo@savesmart.ai', phone: '+62 812 3456 7890', language: 'id', currency: 'IDR', budgetPeriod: 'monthly', notifBudget: true, notifGoal: true, notifWeekly: false, password: 'password123' },
  tx: [
    { id: 't1', type: 'expense', name: 'Indomaret', amount: 52000, date: iso(daysAgo(0)), category: 'Makanan' },
    { id: 't2', type: 'expense', name: 'Gojek', amount: 32000, date: iso(daysAgo(1)), category: 'Transport' },
    { id: 't3', type: 'income', name: 'Uang Saku', amount: 5000000, date: iso(daysAgo(3)), category: 'Uang Saku' },
    { id: 't4', type: 'expense', name: 'Warung Makan', amount: 98000, date: iso(daysAgo(2)), category: 'Makanan' },
    { id: 't5', type: 'expense', name: 'Bioskop', amount: 150000, date: iso(daysAgo(4)), category: 'Hiburan' },
    { id: 't6', type: 'expense', name: 'Kopi', amount: 45000, date: iso(daysAgo(5)), category: 'Makanan' },
    { id: 't7', type: 'expense', name: 'Fotokopi', amount: 112500, date: iso(daysAgo(6)), category: 'Lainnya' },
    { id: 't8', type: 'expense', name: 'Bensin', amount: 118000, date: iso(daysAgo(3)), category: 'Transport' },
    { id: 't9', type: 'expense', name: 'Makan Malam', amount: 142500, date: iso(daysAgo(0)), category: 'Makanan' },
  ],
  budgets: [
    { id: 'b1', category: 'Makanan', limit: 1000000, threshold: 80 },
    { id: 'b2', category: 'Transport', limit: 500000, threshold: 80 },
    { id: 'b3', category: 'Hiburan', limit: 100000, threshold: 70 },
    { id: 'b4', category: 'Lainnya', limit: 1000000, threshold: 90 },
  ],
  goals: [
    { id: 'g1', name: 'Laptop Baru', target: 12000000, saved: 4200000, months: 8, deadline: iso(new Date(new Date().getFullYear(), new Date().getMonth() + 8, 1)), active: true,
      deposits: [
        { id: 'd1', amount: 975000, date: iso(daysAgo(23)), note: 'Tabungan rutin' },
        { id: 'd2', amount: 975000, date: iso(daysAgo(53)), note: 'Tabungan rutin' },
      ] },
    { id: 'g2', name: 'Dana Darurat', target: 5000000, saved: 1500000, months: null, deadline: null, active: true, deposits: [] },
  ],
  notifs: [
    { id: 'n1', type: 'budget', severity: 'danger', title: 'Anggaran Hiburan terlampaui', message: 'Pengeluaran Rp 550.000 dari batas Rp 500.000. Kurangi pengeluaran kategori ini agar target tabunganmu tetap aman.', createdAt: new Date(Date.now() - 20e3).toISOString(), read: false },
    { id: 'n2', type: 'transaction', title: 'Struk Indomaret tersimpan', message: 'Rp 52.000 berhasil dicatat dalam kategori Makanan. Periksa kembali detail transaksi jika ada yang perlu diperbarui.', createdAt: new Date(Date.now() - 5 * 60e3).toISOString(), read: false },
    { id: 'n3', type: 'goal', title: 'Target Laptop 35% tercapai', message: 'Tabunganmu sudah Rp 4.200.000. Tinggal Rp 7.800.000 lagi untuk mewujudkan Laptop Baru.', createdAt: new Date(Date.now() - 3600e3).toISOString(), read: false, refId: 'g1' },
  ],
};

const spentFor = (cat, month) => db.tx.filter((t) => t.type === 'expense' && t.category === cat && monthOf(t.date) === month).reduce((s, t) => s + t.amount, 0);
const budgetOut = (b, month) => ({ ...b, spent: spentFor(b.category, month) });
const goalOut = (g, full) => ({ id: g.id, name: g.name, targetAmount: g.target, savedAmount: g.saved, months: g.months, deadline: g.deadline, status: g.active ? 'active' : 'inactive', ...(full ? { deposits: g.deposits } : {}) });

function report(period) {
  const now = new Date();
  const expenses = db.tx.filter((t) => t.type === 'expense');
  let series = [], from, label;
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  if (period === 'week') {
    from = daysAgo(6);
    series = Array.from({ length: 7 }, (_, i) => { const d = daysAgo(6 - i); return { label: DAYS[d.getDay()], amount: expenses.filter((t) => t.date === iso(d)).reduce((s, t) => s + t.amount, 0) }; });
    label = `${from.getDate()} – ${now.getDate()} ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    series = Array.from({ length: dim }, (_, i) => ({ label: String(i + 1), amount: expenses.filter((t) => t.date === iso(new Date(now.getFullYear(), now.getMonth(), i + 1))).reduce((s, t) => s + t.amount, 0) }));
    label = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    series = M.map((m, i) => ({ label: m, amount: expenses.filter((t) => t.date.startsWith(`${now.getFullYear()}-${pad(i + 1)}`)).reduce((s, t) => s + t.amount, 0) }));
    label = `Tahun ${now.getFullYear()}`;
  }
  const inRange = expenses.filter((t) => t.date >= iso(from));
  const total = inRange.reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  inRange.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const categories = Object.entries(byCat).map(([name, amount]) => ({ name, amount, percent: total ? (amount / total) * 100 : 0 })).sort((a, b) => b.amount - a.amount);
  const divisor = period === 'week' ? 7 : period === 'month' ? now.getDate() : now.getMonth() + 1;
  return { range: label, total, dailyAverage: Math.round(total / divisor), topCategory: categories[0] || null, series, categories };
}

function checkBudgetNotif(tx) {
  if (tx.type !== 'expense') return;
  const b = db.budgets.find((x) => x.category === tx.category);
  if (!b) return;
  const p = (spentFor(b.category, monthOf(tx.date)) / b.limit) * 100;
  if (p >= b.threshold) db.notifs.unshift({ id: nid(), type: 'budget', severity: p > 100 ? 'danger' : 'warning', title: `Anggaran ${b.category} ${p > 100 ? 'terlampaui' : 'hampir habis'}`, message: `${Math.round(p)}% anggaran ${b.category} terpakai.`, createdAt: new Date().toISOString(), read: false });
}

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); });
const publicUser = () => { const { password, ...u } = db.user; return u; };
const TOKEN = 'mock-token';

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;
  const q = Object.fromEntries(url.searchParams);
  const raw = await readBody(req);
  const isJson = (req.headers['content-type'] || '').includes('json');
  const body = isJson && raw.length ? JSON.parse(raw) : {};
  const m = req.method;
  console.log(m, req.url);

  if (m === 'POST' && path === '/auth/login') {
    if (body.email === db.user.email && body.password === db.user.password) return send(res, 200, { token: TOKEN, user: publicUser() });
    return send(res, 401, { message: 'Email atau kata sandi salah.' });
  }
  if (m === 'POST' && path === '/auth/register') {
    if (body.email === db.user.email) return send(res, 409, { message: 'Email sudah terdaftar.' });
    Object.assign(db.user, { name: body.name, email: body.email, password: body.password });
    return send(res, 201, { token: TOKEN, user: publicUser() });
  }
  if (m === 'POST' && path === '/auth/forgot-password') return send(res, 200, { ok: true });

  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: 'Tidak terautentikasi.' });

  if (path === '/users/me' && m === 'GET') return send(res, 200, publicUser());
  if (path === '/users/me' && m === 'PUT') { const { password, ...rest } = body; Object.assign(db.user, rest); return send(res, 200, publicUser()); }
  if (path === '/users/me/password' && m === 'PUT') {
    if (body.currentPassword !== db.user.password) return send(res, 400, { message: 'Kata sandi saat ini salah.' });
    db.user.password = body.newPassword; return send(res, 200, { ok: true });
  }

  if (path === '/summary') {
    const income = db.tx.filter((t) => t.type === 'income' && monthOf(t.date) === q.month).reduce((s, t) => s + t.amount, 0);
    const exp = db.tx.filter((t) => t.type === 'expense');
    const balance = db.tx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) + 2000000;
    const expense7d = exp.filter((t) => t.date >= iso(daysAgo(6))).reduce((s, t) => s + t.amount, 0);
    return send(res, 200, { balance, income, expense7d });
  }
  if (path === '/transactions' && m === 'GET') {
    let list = db.tx.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (q.month) list = list.filter((t) => monthOf(t.date) === q.month);
    return send(res, 200, list.slice(0, Number(q.limit) || 100));
  }
  if (path === '/transactions' && m === 'POST') {
    const tx = { id: nid(), type: body.type, name: body.name, amount: body.amount, date: body.date, category: body.category, note: body.note };
    db.tx.push(tx);
    checkBudgetNotif(tx);
    if (tx.type === 'expense' && body.source === 'scan') db.notifs.unshift({ id: nid(), type: 'transaction', title: `Struk ${tx.name} tersimpan`, message: `Rp ${tx.amount.toLocaleString('id-ID')} berhasil dicatat dalam kategori ${tx.category}.`, createdAt: new Date().toISOString(), read: false });
    return send(res, 201, tx);
  }
  if (path === '/receipts/scan' && m === 'POST') {
    // Simulasi OCR: file yang namanya mengandung "buram"/"blur" dianggap tidak terbaca
    if (/(buram|blur|gelap)/i.test(raw.toString('latin1', 0, Math.min(raw.length, 600)))) return send(res, 422, { code: 'RECEIPT_UNREADABLE', message: 'Struk tidak terbaca.' });
    return send(res, 200, { merchant: 'Indomaret Kaliurang', date: iso(new Date()), category: 'Makanan', confidence: 0.96, total: 52000, items: [{ name: 'Susu UHT 1L', price: 18000 }, { name: 'Roti Tawar', price: 16500 }, { name: 'Mie Instan x5', price: 17500 }] });
  }
  if (path === '/reports') return send(res, 200, report(q.period || 'week'));

  if (path === '/budgets' && m === 'GET') return send(res, 200, db.budgets.map((b) => budgetOut(b, q.month)));
  if (path === '/budgets' && m === 'POST') { const b = { id: nid(), category: body.category, limit: body.limit, threshold: body.threshold }; db.budgets.push(b); return send(res, 201, b); }
  let mm = path.match(/^\/budgets\/(.+)$/);
  if (mm && m === 'PUT') { const b = db.budgets.find((x) => x.id === mm[1]); if (!b) return send(res, 404, { message: 'Tidak ditemukan.' }); Object.assign(b, { limit: body.limit, threshold: body.threshold }); return send(res, 200, b); }
  if (mm && m === 'DELETE') { db.budgets = db.budgets.filter((x) => x.id !== mm[1]); return send(res, 200, { ok: true }); }

  if (path === '/goals' && m === 'GET') return send(res, 200, db.goals.filter((g) => !q.status || (q.status === 'active') === g.active).map((g) => goalOut(g)));
  if (path === '/goals' && m === 'POST') {
    const g = { id: nid(), name: body.name, target: body.targetAmount, saved: body.initialAmount || 0, months: body.months, deadline: body.deadline, active: true, deposits: [] };
    if (g.saved) g.deposits.push({ id: nid(), amount: g.saved, date: iso(new Date()), note: 'Tabungan awal' });
    db.goals.push(g); return send(res, 201, goalOut(g, true));
  }
  mm = path.match(/^\/goals\/([^/]+)$/);
  if (mm) {
    const g = db.goals.find((x) => x.id === mm[1]);
    if (!g) return send(res, 404, { message: 'Target tidak ditemukan.' });
    if (m === 'GET') return send(res, 200, goalOut(g, true));
    if (m === 'PUT') { Object.assign(g, { name: body.name, target: body.targetAmount, months: body.months, deadline: body.deadline }); return send(res, 200, goalOut(g, true)); }
  }
  mm = path.match(/^\/goals\/([^/]+)\/deposits$/);
  if (mm && m === 'POST') {
    const g = db.goals.find((x) => x.id === mm[1]);
    if (!g) return send(res, 404, { message: 'Target tidak ditemukan.' });
    g.saved += body.amount; g.deposits.push({ id: nid(), amount: body.amount, date: body.date, note: body.note });
    return send(res, 201, goalOut(g, true));
  }
  mm = path.match(/^\/goals\/([^/]+)\/status$/);
  if (mm && m === 'PATCH') {
    const g = db.goals.find((x) => x.id === mm[1]);
    if (!g) return send(res, 404, { message: 'Target tidak ditemukan.' });
    g.active = body.status === 'active'; return send(res, 200, goalOut(g));
  }

  if (path === '/notifications' && m === 'GET') return send(res, 200, db.notifs);
  if (path === '/notifications/read-all' && m === 'POST') { db.notifs.forEach((n) => (n.read = true)); return send(res, 200, { ok: true }); }
  mm = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (mm && m === 'PATCH') { const n = db.notifs.find((x) => x.id === mm[1]); if (n) n.read = true; return send(res, 200, { ok: true }); }

  send(res, 404, { message: 'Endpoint tidak ditemukan.' });
}).listen(PORT, () => console.log(`SaveSmart AI mock API → http://localhost:${PORT}  (demo@savesmart.ai / password123)`));
