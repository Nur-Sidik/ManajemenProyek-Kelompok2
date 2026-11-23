// Pembantu tanggal dan format. Semua tanggal berupa teks 'YYYY-MM-DD'.
const TZ = process.env.APP_TZ || 'Asia/Jakarta'

const pad = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Tanggal hari ini menurut zona waktu aplikasi (bukan zona waktu server).
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export const monthOf = (date) => date.slice(0, 7)

export function addDays(date, n) {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + n)
  return fmt(d)
}

// Menambah bulan; kalau tanggalnya tidak ada di bulan tujuan, dipakai akhir bulan.
export function addMonths(date, n) {
  const d = parse(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return fmt(d)
}

export const monthStart = (date) => `${monthOf(date)}-01`
export const monthEnd = (date) => {
  const d = parse(monthStart(date))
  return fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

// Selisih bulan dari 'from' ke 'to', dibulatkan ke atas, minimal 0.
export function monthsBetween(from, to) {
  const a = parse(from)
  const b = parse(to)
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() > a.getUTCDate()) m += 1
  return Math.max(0, m)
}

export const dayOfWeek = (date) => parse(date).getUTCDay() // 0 = Minggu

export const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
export const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(parse(s)) === s
