// Data dummy awal. Angkanya disamakan dengan desain Figma.
// TODO(backend): ganti dengan data dari API saat endpoint backend sudah siap.

export const CATEGORIES = ['Makanan', 'Transport', 'Hiburan', 'Lainnya']

export const seed = () => ({
  user: null,
  summary: { income: 5000000, expense: 750000, balance: 4250000 },
  transactions: [
    { id: 1, title: 'Indomaret', category: 'Makanan', amount: -52000, when: 'Hari ini' },
    { id: 2, title: 'Gojek', category: 'Transport', amount: -32000, when: 'Kemarin' },
    { id: 3, title: 'Uang Saku', category: 'Pemasukan', amount: 2000000, when: '1 Nov' },
  ],
  // "Lainnya" disembunyikan di layar Anggaran (sesuai desain) tapi tetap dihitung di total.
  budgets: [
    { category: 'Makanan', spent: 850000, limit: 1000000, alertAt: 90 },
    { category: 'Transport', spent: 225000, limit: 500000, alertAt: 90 },
    { category: 'Hiburan', spent: 550000, limit: 500000, alertAt: 90 },
    { category: 'Lainnya', spent: 525000, limit: 1000000, alertAt: 90, hidden: true },
  ],
  goals: [
    {
      id: 1,
      name: 'Laptop Baru',
      target: 12000000,
      saved: 4200000,
      monthsLeft: 8,
      deadline: 'Juli 2027',
      deposits: [
        { id: 1, title: 'Setoran Oktober', when: '30 Okt', amount: 975000 },
        { id: 2, title: 'Setoran September', when: '30 Sep', amount: 975000 },
      ],
    },
    { id: 2, name: 'Dana Darurat', target: 5000000, saved: 1500000, deposits: [] },
  ],
  notifications: [
    {
      id: 1, kind: 'budget', letter: 'A', read: false, to: '/budget?alert=1',
      title: 'Anggaran Hiburan terlampaui',
      body: 'Pengeluaran Rp 550.000 dari batas Rp 500.000',
    },
    {
      id: 2, kind: 'receipt', letter: 'S', read: false, to: '/report',
      title: 'Struk Indomaret tersimpan',
      body: 'Rp 52.000 - kategori Makanan',
    },
    {
      id: 3, kind: 'goal', letter: 'T', read: false, to: '/target/1',
      title: 'Target Laptop 35% tercapai',
      body: 'Tinggal Rp 7.800.000 lagi',
    },
  ],
})

// Data grafik laporan (dalam ribuan rupiah). Sementara statis.
export const REPORT = {
  Minggu: { title: 'Pengeluaran 7 hari terakhir', labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], values: [45, 80, 40, 110, 70, 140, 58] },
  Bulan: { title: 'Pengeluaran 4 minggu terakhir', labels: ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4'], values: [520, 610, 480, 540] },
  Tahun: { title: 'Pengeluaran 12 bulan terakhir', labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], values: [1800, 2100, 1950, 2300, 2050, 2200, 2400, 1900, 2150, 2250, 2150, 0] },
}

export const CATEGORY_SHARE = [
  { name: 'Makanan', pct: 45, color: '#10B981' },
  { name: 'Transport', pct: 20, color: '#6366F1' },
  { name: 'Hiburan', pct: 20, color: '#EF4444' },
  { name: 'Lainnya', pct: 15, color: '#F59E0B' },
]
