// Utilitas format angka, tanggal, dan kategori (Bahasa Indonesia).

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const EXPENSE_CATEGORIES = ['Makanan', 'Transport', 'Hiburan', 'Belanja', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
export const INCOME_CATEGORIES = ['Uang Saku', 'Gaji', 'Bonus', 'Hadiah', 'Lainnya'];
export const THRESHOLDS = [70, 80, 90];

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const rupiah = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + 'Rp ' + group(Math.abs(v));
};
export const signedRupiah = (n, type) =>
  (type === 'income' ? '+' : '−') + 'Rp ' + group(Math.abs(Math.round(Number(n) || 0)));

// "Rp 12.000.000" -> 12000000
export const parseAmount = (s) => Number(String(s ?? '').replace(/\D/g, '')) || 0;
export const amountInput = (n) => (n ? 'Rp ' + group(Math.round(n)) : '');

// Singkat untuk sumbu grafik: 75 rb, 1,5 jt
export const compact = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (n >= 1000) return Math.round(n / 1000) + ' rb';
  return String(Math.round(n));
};

export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

export const fmtDate = (v) => {
  const d = parseDate(v);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : '-';
};

export const monthYear = (v, long = true) => {
  const d = parseDate(v);
  return d ? `${(long ? MONTHS_LONG : MONTHS_SHORT)[d.getMonth()]} ${d.getFullYear()}` : '-';
};

export const monthName = (v) => {
  const d = parseDate(v);
  return d ? MONTHS_LONG[d.getMonth()] : '';
};

// ---- kunci bulan "YYYY-MM" ----
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const monthKeyLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};
export const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};
export const recentMonthKeys = (count = 12) => {
  const now = monthKey();
  return Array.from({ length: count }, (_, i) => shiftMonth(now, -i));
};
export const daysLeftInMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  const end = new Date(y, m, 0);
  const now = new Date();
  if (monthKey(now) !== key) return monthKey(now) < key ? end.getDate() : 0;
  return Math.max(0, end.getDate() - now.getDate());
};

// ---- waktu relatif ----
export const dayLabel = (v) => {
  const d = parseDate(v);
  if (!d) return '';
  const t = new Date();
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  return fmtDate(d);
};
export const relTime = (v) => {
  const d = parseDate(v);
  if (!d) return '';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 172800) return 'Kemarin';
  return fmtDate(d);
};

// ---- persentase & status anggaran ----
export const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
export const pctLabel = (p) => `${Math.round(p)}%`;

export function budgetStatus(percent, threshold = 80) {
  if (percent > 100) return { key: 'over', label: 'Melebihi batas', tone: 'red' };
  if (percent >= threshold) return { key: 'warn', label: 'Hampir habis', tone: 'amber' };
  return { key: 'ok', label: 'Aman', tone: 'green' };
}

// ---- rencana target tabungan ----
export const monthsBetween = (from, to) => {
  const a = parseDate(from), b = parseDate(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};
export const addMonthsISO = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + Number(months || 0));
  return toISO(d);
};

export function goalPlan(goal) {
  const remaining = Math.max(0, goal.target - goal.saved);
  let months = goal.months ? Number(goal.months) : 0;
  if (goal.deadline) months = Math.max(1, monthsBetween(new Date(), goal.deadline));
  const endLabel = months ? monthYear(goal.deadline || addMonthsISO(months)) : 'Fleksibel';
  return {
    remaining,
    months,
    endLabel,
    perMonth: months ? Math.ceil(remaining / months) : 0,
    percent: Math.min(100, pct(goal.saved, goal.target)),
  };
}

// ---- warna kategori ----
const CAT_COLORS = {
  Makanan: '#0a7f5a', Transport: '#6b9c8b', Hiburan: '#c0714f', Lainnya: '#c9a64a',
  Belanja: '#4f8fa3', Tagihan: '#7b6fb0', Kesehatan: '#d0657a', Pendidikan: '#3f6f4a',
};
export const catColor = (name) => CAT_COLORS[name] || '#8aa399';

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'Kamu';
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'S';
