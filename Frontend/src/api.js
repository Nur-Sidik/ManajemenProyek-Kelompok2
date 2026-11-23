// Klien REST API SaveSmart AI  ->  Backend/ (Express + SQLite), alamat dasar http://localhost:4000/api
// Daftar endpoint lengkap ada di Backend/README.md. Semua nominal berupa bilangan bulat Rupiah.
//
// Normalizer di bawah mengubah bentuk respons Backend menjadi bentuk yang dipakai layar-layar Frontend.
// Catatan perbedaan penting:
//   - transaksi pengeluaran bertanda negatif di Backend; di Frontend nominal selalu positif + field `type`
//   - anggaran dikenali lewat nama kategori (tidak ada id angka); `alertAt` Backend = `threshold` Frontend
//   - laporan: Backend mengirim `labels`/`values`; Frontend memakai `series: [{label, amount}]`

// Di development, ikuti host yang dipakai browser supaya HP di Wi-Fi yang sama
// otomatis memanggil Backend di IP laptop, bukan localhost milik HP.
const fallbackApi = typeof window === 'undefined'
  ? 'http://localhost:4000'
  : `${window.location.protocol}//${window.location.hostname || 'localhost'}:4000`;
export const API_URL = (import.meta.env.VITE_API_URL || fallbackApi).replace(/\/$/, '');

let getToken = () => null;
let onUnauthorized = () => {};
export function configureApi(opts) {
  if (opts.getToken) getToken = opts.getToken;
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data?.code ?? data?.error;
  }
}

async function request(method, path, { body, query, form, auth = true } = {}) {
  const url = new URL(API_URL + '/api' + path);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan Backend berjalan di ' + API_URL + '.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  if (!res.ok) {
    if (res.status === 401 && auth && token) onUnauthorized();
    const msg = data?.message || data?.error || `Terjadi kesalahan (${res.status}).`;
    throw new ApiError(typeof msg === 'string' ? msg : 'Terjadi kesalahan.', res.status, data);
  }
  return data;
}

import { fmtDate } from './format.js';

// Backend membungkus data dalam objek bernama: { transactions: [...] }, { goal: {...}}, { user: {...} }, dst.
const pick = (d, key) => (d && typeof d === 'object' && !Array.isArray(d) && key in d ? d[key] : d);
const list = (d, key) => {
  const v = pick(d, key);
  return Array.isArray(v) ? v : [];
};
const num = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) return Number(v);
  return 0;
};
const pad2 = (n) => String(n).padStart(2, '0');
const enc = encodeURIComponent;

// ---------- normalizer ----------
export const normUser = (u = {}) => ({
  id: u.id,
  name: u.name ?? '',
  email: u.email ?? '',
  phone: u.phone ?? '',
  language: u.language ?? 'id',
  currency: u.currency ?? 'IDR',
  budgetPeriod: u.budgetPeriod ?? 'monthly',
  notifBudget: u.notifBudget ?? true,
  notifGoal: u.notifGoal ?? true,
  notifWeekly: u.notifWeekly ?? false,
});

export const normTx = (t = {}) => ({
  id: t.id,
  type: t.type === 'income' ? 'income' : 'expense',
  name: t.title ?? t.name ?? '-',
  amount: Math.abs(num(t.amount)),
  date: t.date,
  category: t.category ?? 'Lainnya',
  note: t.note ?? '',
});

export const normBudget = (b = {}) => ({
  id: b.category, // Backend memakai nama kategori sebagai pengenal anggaran
  category: b.category,
  limit: num(b.limit),
  spent: num(b.spent),
  threshold: num(b.alertAt) || 90,
});

export const normDeposit = (d = {}) => ({
  id: d.id,
  amount: num(d.amount),
  date: d.date,
  note: d.note ?? '',
  title: '',
});

export const normGoal = (g = {}) => ({
  id: g.id,
  name: g.name ?? '',
  target: num(g.target),
  saved: num(g.saved),
  months: g.months ?? null,
  deadline: g.deadline ?? null,
  active: g.active !== false,
  deposits: (g.deposits || []).map(normDeposit),
});

// Backend: kind = budget | receipt | goal; link = rute lama (mis. /target/3) -> ambil id target
const NOTIF_TYPE = { budget: 'budget', receipt: 'transaction', goal: 'goal' };
export const normNotification = (n = {}) => ({
  id: n.id,
  type: NOTIF_TYPE[n.kind] ?? 'info',
  severity: n.kind === 'budget' && /terlampaui/i.test(n.title || '') ? 'danger' : n.kind === 'budget' ? 'warning' : 'success',
  title: n.title ?? '',
  message: n.body ?? '',
  createdAt: n.createdAt,
  read: Boolean(n.read),
  refId: /^\/target\/(\d+)/.exec(n.to || '')?.[1] ?? null,
});

const normReport = (r = {}) => {
  const cats = (r.categories || []).map((c) => ({ name: c.name, amount: num(c.amount), percent: num(c.pct) }));
  const total = num(r.total);
  const days = num(r.days) || 1;
  // minggu/bulan: rata-rata per hari; tahun: rata-rata per bulan (12 bulan)
  const dailyAverage = r.range === 'year' ? Math.round(total / 12) : Math.round(total / days);
  return {
    range: r.from && r.to ? `${fmtDate(r.from)} – ${fmtDate(r.to)}` : '',
    total,
    dailyAverage,
    topCategory: cats[0] ? { ...cats[0] } : null,
    series: (r.labels || []).map((label, i) => ({ label, amount: num((r.values || [])[i]) })),
    categories: cats,
  };
};

const normScan = (r = {}) => {
  let conf = num(r.accuracy, r.confidence);
  if (conf > 0 && conf <= 1) conf *= 100;
  return {
    merchant: r.store ?? '',
    date: r.date ?? '',
    category: r.category ?? 'Lainnya',
    items: (r.items || []).map((i) => ({ name: i.name, amount: num(i.price, i.amount) })),
    total: num(r.total),
    confidence: Math.round(conf),
  };
};

// "2026-11" -> { from: "2026-11-01", to: "2026-11-30" }
const monthRange = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return {};
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: `${month}-${pad2(new Date(y, m, 0).getDate())}` };
};

// ---------- endpoint ----------
export const api = {
  // auth
  login: async (body) => {
    const d = await request('POST', '/auth/login', { body, auth: false });
    return { token: d.token, user: normUser(d.user) };
  },
  register: async (body) => {
    const d = await request('POST', '/auth/register', { body, auth: false });
    return { token: d.token ?? null, user: normUser(d.user) };
  },
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { body: { email }, auth: false }),

  // profil
  me: async () => normUser(pick(await request('GET', '/users/me'), 'user')),
  updateMe: async (body) => normUser(pick(await request('PUT', '/users/me', { body }), 'user')),
  changePassword: (body) => request('PUT', '/users/me/password', { body }),

  // ringkasan & transaksi
  summary: async (month) => {
    const d = await request('GET', '/summary', { query: { month } });
    return { balance: num(d.balance), income: num(d.income), expense: num(d.expense) };
  },
  transactions: async ({ limit, month } = {}) =>
    list(await request('GET', '/transactions', { query: { limit, ...monthRange(month) } }), 'transactions').map(normTx),
  createTransaction: async ({ name, items, ...rest }) => {
    // `items` (rincian struk) belum disimpan oleh Backend, hanya total transaksinya
    const d = await request('POST', '/transactions', { body: { ...rest, title: name } });
    return normTx(pick(d, 'transaction'));
  },
  scanReceipt: async (file) => {
    const form = new FormData();
    form.append('receipt', file);
    const r = normScan(pick(await request('POST', '/scan', { form }), 'result'));
    if (!r.total) throw new ApiError('Struk tidak terbaca.', 422, { error: 'UNREADABLE' });
    return r;
  },

  // laporan
  report: async (period) => normReport(await request('GET', '/report', { query: { range: period } })),

  // anggaran (pengenal = nama kategori)
  budgets: async (month) => list(await request('GET', '/budgets', { query: { month } }), 'budgets').map(normBudget),
  createBudget: ({ category, limit, threshold }) =>
    request('PUT', `/budgets/${enc(category)}`, { body: { limit, alertAt: threshold } }),
  updateBudget: (category, { limit, threshold }) =>
    request('PUT', `/budgets/${enc(category)}`, { body: { limit, alertAt: threshold } }),
  deleteBudget: (category) => request('DELETE', `/budgets/${enc(category)}`),

  // target tabungan
  goals: async (status) => list(await request('GET', '/goals', { query: { status } }), 'goals').map(normGoal),
  goal: async (id) => normGoal(pick(await request('GET', `/goals/${enc(id)}`), 'goal')),
  createGoal: ({ name, targetAmount, months, initialAmount }) =>
    request('POST', '/goals', { body: { name, target: targetAmount, months: months || null, initialAmount: initialAmount || 0 } }),
  updateGoal: (id, { name, targetAmount, months }) =>
    request('PUT', `/goals/${enc(id)}`, { body: { name, target: targetAmount, months: months || null } }),
  deposit: (id, body) => request('POST', `/goals/${enc(id)}/deposits`, { body }),
  setGoalStatus: (id, active) => request('PATCH', `/goals/${enc(id)}/status`, { body: { status: active ? 'active' : 'inactive' } }),

  // notifikasi
  notifications: async () => list(await request('GET', '/notifications'), 'notifications').map(normNotification),
  readAllNotifications: () => request('POST', '/notifications/read-all'),
  readNotification: (id) => request('POST', `/notifications/${enc(id)}/read`),
};
