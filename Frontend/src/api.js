// Klien REST API SaveSmart AI  ->  http://localhost:4000
//
// Kontrak endpoint (semua di bawah API_URL, JSON, Authorization: Bearer <token>):
//   POST   /auth/register            {name,email,password}            -> {token,user}
//   POST   /auth/login               {email,password}                 -> {token,user}
//   POST   /auth/forgot-password     {email}
//   GET    /users/me                                                  -> user
//   PUT    /users/me                 {name,email,phone,language,currency,budgetPeriod,notifBudget,notifGoal,notifWeekly}
//   PUT    /users/me/password        {currentPassword,newPassword}
//   GET    /summary?month=YYYY-MM                                     -> {balance,income,expense}
//   GET    /transactions?limit=&month=                                -> [tx]
//   POST   /transactions             {type,name,amount,date,category,note,source}
//   POST   /receipts/scan            multipart(file)                  -> {merchant,date,category,items,total,confidence}  (422 = tidak terbaca)
//   GET    /reports?period=week|month|year                            -> {range,total,dailyAverage,topCategory,series,categories}
//   GET    /budgets?month=YYYY-MM                                     -> [budget]
//   POST   /budgets                  {category,limit,threshold,month}
//   PUT    /budgets/:id              {limit,threshold}
//   DELETE /budgets/:id
//   GET    /goals?status=active|inactive                              -> [goal]
//   GET    /goals/:id                                                 -> goal + deposits
//   POST   /goals                    {name,targetAmount,initialAmount,months,deadline}
//   PUT    /goals/:id                {name,targetAmount,months,deadline}
//   POST   /goals/:id/deposits       {amount,date,note}
//   PATCH  /goals/:id/status         {status:'active'|'inactive'}
//   GET    /notifications                                             -> [notification]
//   POST   /notifications/read-all
//   PATCH  /notifications/:id/read
//
// Normalizer di bawah menerima beberapa alias nama field (camelCase/snake_case)
// supaya mudah disesuaikan dengan bentuk respons Backend yang sebenarnya.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

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
    this.code = data?.code;
  }
}

async function request(method, path, { body, query, form, auth = true } = {}) {
  const url = new URL(API_URL + path);
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

const unwrap = (d) =>
  d && typeof d === 'object' && !Array.isArray(d) && 'data' in d && Object.keys(d).length <= 3 ? d.data : d;
const list = (d) => {
  const v = unwrap(d);
  if (Array.isArray(v)) return v;
  return v?.items || v?.results || [];
};
const num = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) return Number(v);
  return 0;
};

// ---------- normalizer ----------
export const normUser = (u = {}) => ({
  id: u.id ?? u._id,
  name: u.name ?? u.fullName ?? u.full_name ?? '',
  email: u.email ?? '',
  phone: u.phone ?? u.phoneNumber ?? '',
  language: u.language ?? 'id',
  currency: u.currency ?? 'IDR',
  budgetPeriod: u.budgetPeriod ?? u.budget_period ?? 'monthly',
  notifBudget: u.notifBudget ?? u.notif_budget ?? true,
  notifGoal: u.notifGoal ?? u.notif_goal ?? true,
  notifWeekly: u.notifWeekly ?? u.notif_weekly ?? false,
});

export const normTx = (t = {}) => ({
  id: t.id ?? t._id,
  type: ['income', 'pemasukan'].includes(String(t.type).toLowerCase()) ? 'income' : 'expense',
  name: t.name ?? t.title ?? t.merchant ?? '-',
  amount: num(t.amount, t.total),
  date: t.date ?? t.createdAt ?? t.created_at,
  category: t.category?.name ?? t.category ?? 'Lainnya',
  note: t.note ?? '',
});

export const normBudget = (b = {}) => ({
  id: b.id ?? b._id,
  category: b.category?.name ?? b.category,
  limit: num(b.limit, b.amount, b.limitAmount),
  spent: num(b.spent, b.used, b.usedAmount),
  threshold: num(b.threshold, b.alertThreshold, b.alert_threshold) || 80,
});

export const normDeposit = (d = {}) => ({
  id: d.id ?? d._id,
  amount: num(d.amount),
  date: d.date ?? d.createdAt ?? d.created_at,
  note: d.note ?? '',
  title: d.title ?? '',
});

export const normGoal = (g = {}) => ({
  id: g.id ?? g._id,
  name: g.name ?? g.title ?? '',
  target: num(g.targetAmount, g.target, g.target_amount),
  saved: num(g.savedAmount, g.saved, g.currentAmount, g.current_amount),
  months: g.months ?? g.durationMonths ?? null,
  deadline: g.deadline ?? g.targetDate ?? g.target_date ?? null,
  active: g.status ? g.status === 'active' : g.active !== false,
  deposits: list(g.deposits || []).map(normDeposit),
});

export const normNotification = (n = {}) => ({
  id: n.id ?? n._id,
  type: n.type ?? 'info', // budget | transaction | goal | info
  severity: n.severity ?? (n.type === 'budget' ? 'warning' : 'success'),
  title: n.title ?? '',
  message: n.message ?? n.body ?? '',
  createdAt: n.createdAt ?? n.created_at ?? n.date,
  read: Boolean(n.read ?? n.isRead ?? n.is_read),
  refId: n.refId ?? n.ref_id ?? n.targetId ?? null,
});

const normReport = (r = {}) => ({
  range: r.range ?? r.label ?? '',
  total: num(r.total, r.totalExpense),
  dailyAverage: num(r.dailyAverage, r.average, r.avgDaily),
  topCategory: r.topCategory
    ? { name: r.topCategory.name ?? r.topCategory.category, amount: num(r.topCategory.amount), percent: num(r.topCategory.percent) }
    : null,
  series: (r.series || r.chart || []).map((s) => ({ label: s.label ?? s.name, amount: num(s.amount, s.value, s.total) })),
  categories: (r.categories || r.byCategory || []).map((c) => ({
    name: c.name ?? c.category,
    amount: num(c.amount, c.total),
    percent: num(c.percent, c.percentage),
  })),
});

const normScan = (r = {}) => {
  const items = (r.items || []).map((i) => ({ name: i.name ?? i.title, amount: num(i.amount, i.price, i.total) }));
  let conf = num(r.confidence, r.accuracy);
  if (conf > 0 && conf <= 1) conf *= 100;
  return {
    merchant: r.merchant ?? r.store ?? r.name ?? '',
    date: r.date ?? '',
    category: r.category?.name ?? r.category ?? 'Lainnya',
    items,
    total: num(r.total, r.amount),
    confidence: Math.round(conf),
  };
};

// ---------- endpoint ----------
export const api = {
  // auth
  login: async (body) => {
    const d = unwrap(await request('POST', '/auth/login', { body, auth: false }));
    return { token: d.token ?? d.accessToken, user: normUser(d.user ?? {}) };
  },
  register: async (body) => {
    const d = unwrap(await request('POST', '/auth/register', { body, auth: false }));
    return { token: d.token ?? d.accessToken ?? null, user: normUser(d.user ?? {}) };
  },
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { body: { email }, auth: false }),

  // profil
  me: async () => normUser(unwrap(await request('GET', '/users/me'))),
  updateMe: async (body) => normUser(unwrap(await request('PUT', '/users/me', { body }))),
  changePassword: (body) => request('PUT', '/users/me/password', { body }),

  // ringkasan & transaksi
  summary: async (month) => {
    const d = unwrap(await request('GET', '/summary', { query: { month } }));
    return {
      balance: num(d.balance, d.totalBalance),
      income: num(d.income, d.totalIncome),
      expense: num(d.expense7d, d.expense, d.totalExpense),
    };
  },
  transactions: async (query) => list(await request('GET', '/transactions', { query })).map(normTx),
  createTransaction: async (body) => normTx(unwrap(await request('POST', '/transactions', { body }))),
  scanReceipt: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const r = normScan(unwrap(await request('POST', '/receipts/scan', { form })));
    if (!r.total) throw new ApiError('Struk tidak terbaca.', 422, { code: 'RECEIPT_UNREADABLE' });
    return r;
  },

  // laporan
  report: async (period) => normReport(unwrap(await request('GET', '/reports', { query: { period } }))),

  // anggaran
  budgets: async (month) => list(await request('GET', '/budgets', { query: { month } })).map(normBudget),
  createBudget: (body) => request('POST', '/budgets', { body }),
  updateBudget: (id, body) => request('PUT', `/budgets/${id}`, { body }),
  deleteBudget: (id) => request('DELETE', `/budgets/${id}`),

  // target tabungan
  goals: async (status) => list(await request('GET', '/goals', { query: { status } })).map(normGoal),
  goal: async (id) => normGoal(unwrap(await request('GET', `/goals/${id}`))),
  createGoal: (body) => request('POST', '/goals', { body }),
  updateGoal: (id, body) => request('PUT', `/goals/${id}`, { body }),
  deposit: (id, body) => request('POST', `/goals/${id}/deposits`, { body }),
  setGoalStatus: (id, active) => request('PATCH', `/goals/${id}/status`, { body: { status: active ? 'active' : 'inactive' } }),

  // notifikasi
  notifications: async () => list(await request('GET', '/notifications')).map(normNotification),
  readAllNotifications: () => request('POST', '/notifications/read-all'),
  readNotification: (id) => request('PATCH', `/notifications/${id}/read`),
};
