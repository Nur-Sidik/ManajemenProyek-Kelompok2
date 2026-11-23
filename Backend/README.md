# SaveSmart AI - Backend

REST API dengan **Node.js + Express + SQLite**. Skema database ada di `../Database/migrations`.

**Butuh Node.js 22.13 atau lebih baru** (cek dengan `node -v`; unduh versi LTS dari https://nodejs.org).
SQLite memakai modul bawaan Node, jadi tidak ada paket native yang perlu dikompilasi. Peringatan
`ExperimentalWarning: SQLite is an experimental feature` saat server menyala adalah normal.

## Menjalankan

```bash
cd Backend
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev              # http://localhost:4000
npm test                 # tes otomatis (database sementara di memori)
```

Tabel dibuat otomatis saat server pertama kali berjalan (migrasi `Database/migrations/*.sql`, termasuk `002_frontend_web.sql` untuk frontend versi web). File database ada di `Backend/data/` (tidak ikut Git).
Jalankan frontend di terminal lain (`cd Frontend && npm run dev`); permintaan `/api` otomatis diteruskan ke port 4000.

Perintah lain: `npm run db:migrate` (hanya migrasi) dan `npm run db:seed -- email@contoh.com` (isi ulang data contoh satu akun).

## Aturan penting

- Semua nominal berupa **bilangan bulat Rupiah**. Pengeluaran bertanda negatif di respons transaksi.
- Semua endpoint selain `/api/auth/*` dan `/api/health` butuh header `Authorization: Bearer <token>`.
- Data selalu dibatasi per akun; mengakses data akun lain mengembalikan 404.
- Peringatan anggaran dibuat otomatis (sekali per kategori per bulan): saat terpakai >= ambang (`alertAt`) dan saat terlampaui.
- Notifikasi target dibuat saat tabungan melewati 25%, 50%, 75%, dan 100%.
- Format error: `{ "error": "KODE", "message": "...", "fields": { "namaField": "..." } }`.

## Endpoint

| Metode | Alamat | Fungsi |
|---|---|---|
| POST | `/api/auth/register` | Daftar `{name, email, password}` -> `{token, user}` |
| POST | `/api/auth/login` | Masuk `{email, password}` -> `{token, user}` |
| POST | `/api/auth/forgot-password` | Lupa kata sandi `{email}` -> 202 (jawaban seragam; belum mengirim email) |
| GET | `/api/auth/me` | Data akun yang sedang masuk |
| GET | `/api/users/me` | Profil lengkap + preferensi |
| PUT | `/api/users/me` | Ubah profil `{name, email, phone?, language?, currency?, budgetPeriod?, notifBudget?, notifGoal?, notifWeekly?}` |
| PUT | `/api/users/me/password` | Ganti kata sandi `{currentPassword, newPassword}` |
| GET | `/api/summary?month=YYYY-MM` | Pemasukan & pengeluaran bulan itu (default bulan ini), saldo |
| GET | `/api/transactions?limit=&category=&from=&to=` | Daftar transaksi terbaru |
| POST | `/api/transactions` | Catat `{title, amount, category?, type?, date?, source?, note?}` -> `{transaction, budget}` |
| GET | `/api/budgets?month=YYYY-MM` | Anggaran + terpakai di bulan itu (default bulan ini) |
| PUT | `/api/budgets/:category` | Atur `{limit, alertAt}` |
| DELETE | `/api/budgets/:category` | Hapus anggaran kategori |
| GET | `/api/goals?status=active` atau `inactive` | Daftar target + riwayat setoran |
| POST | `/api/goals` | Buat `{name, target, months?, initialAmount?}` (`months` kosong = fleksibel) |
| GET | `/api/goals/:id` | Detail target |
| PUT | `/api/goals/:id` | Ubah `{name, target, months?}` (setoran tidak berubah) |
| PATCH | `/api/goals/:id/status` | Aktif / nonaktifkan `{status: "active"}` atau `"inactive"` |
| POST | `/api/goals/:id/deposits` | Setor `{amount, date?, note?}` |
| GET | `/api/notifications` | Daftar notifikasi |
| POST | `/api/notifications/:id/read` | Tandai dibaca (`/read-all` untuk semua) |
| GET | `/api/report?range=week`, `month`, atau `year` | Data grafik + porsi per kategori + rentang tanggal |
| POST | `/api/scan` | Unggah foto struk (form field `receipt`) -> hasil OCR |
| POST | `/api/demo/reset` | Kembalikan data contoh akun ini |

Kategori pengeluaran: `Makanan`, `Transport`, `Hiburan`, `Belanja`, `Tagihan`, `Kesehatan`, `Pendidikan`, `Lainnya`.
Kategori pemasukan: `Uang Saku`, `Gaji`, `Bonus`, `Hadiah`, `Lainnya` (kalau kosong otomatis `Pemasukan`).

## OCR struk dengan Gemini

`OCR_MODE=mock` mengembalikan hasil contoh. Untuk memakai Gemini, atur variabel berikut di `.env` backend:

```env
OCR_MODE=service
GEMINI_API_KEY=isi_api_key_gemini
GEMINI_MODEL=gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash
MAX_UPLOAD_MB=8
```

`GEMINI_MODEL` menerima daftar model dipisahkan koma dan dicoba berurutan. Jika model kena rate limit, kapasitas penuh, atau ID model tidak tersedia, backend mencoba model berikutnya. Gunakan ID model Gemini yang valid. Backend mengirim gambar struk yang sudah diperkecil langsung ke Gemini API. API key hanya dibaca dari environment backend dan tidak dikirim ke frontend. Model mengembalikan nama merchant, nominal, kategori, dan tanggal dalam JSON.

## Sebelum production

- Isi `JWT_SECRET` dengan nilai acak (server menolak berjalan tanpa itu saat `NODE_ENV=production`).
- Set `SEED_ON_REGISTER=false` dan `CORS_ORIGINS` ke alamat frontend yang sebenarnya.
- Jalankan di belakang HTTPS.
