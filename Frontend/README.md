# SaveSmart AI — Frontend (React + Vite)

Aplikasi web dengan sidebar kiri di desktop dan menu drawer di HP, palet hijau zamrud, dan 20 alur layar sesuai desain.

## Menjalankan
```bash
cd Frontend
npm install
cp .env.example .env     # opsional, default mengikuti host browser
npm run dev              # http://localhost:5173
```
Belum punya Backend? Jalankan mock API (tanpa dependensi) di terminal lain:
```bash
npm run mock             # http://localhost:4000  — akun demo: demo@savesmart.ai / password123
```
Saat development Backend mengizinkan origin LAN secara otomatis. Untuk production, isi **CORS** (`CORS_ORIGINS`) dengan domain frontend.

## Buka di HP (satu Wi-Fi)
1. Jalankan MySQL dan Backend (`cd Backend && npm run dev`).
2. Jalankan frontend (`cd Frontend && npm run dev`). Vite menampilkan alamat **Network**, mis. `http://192.168.1.10:5173`.
3. Buka alamat Network itu di browser HP. Alamat API otomatis mengikuti IP yang sama, jadi tidak perlu mengubah `.env`.
4. Jika tidak bisa dibuka: pastikan HP dan laptop satu Wi-Fi, buka firewall port **5173** dan **4000**, atau gunakan hotspot HP lalu sambungkan laptop ke hotspot tersebut.
5. Untuk production, tetap set `VITE_API_URL=https://domain-backend` saat build dan isi `CORS_ORIGINS` di Backend.

## Struktur
| File | Isi |
|---|---|
| `src/api.js` | Klien REST + normalizer respons. **Kontrak endpoint ada di komentar atas file.** |
| `src/store.jsx` | Sesi (token), router hash, toast, badge notifikasi, hook `useFetch` |
| `src/format.js` | Format Rupiah/tanggal, status anggaran, hitung rencana target |
| `src/ui.jsx` | Layout (sidebar + topbar), ikon, tombol, form, modal |
| `screens/Auth.jsx` | 1. Masuk · 2. Daftar |
| `screens/Main.jsx` | 3. Beranda · 4. Laporan Keuangan (Minggu/Bulan/Tahun) · 5. Notifikasi |
| `screens/Scan.jsx` | 6. Scan Struk · 7. Konfirmasi · 8. Struk Tidak Terbaca · 9. Input Manual Pengeluaran · 10. Input Manual Pemasukan · 11. Transaksi Tersimpan |
| `screens/Budget.jsx` | 12. Anggaran Bulanan · 13. Edit Anggaran (ambang 70/80/90%) |
| `screens/Goals.jsx` | 14. Target Tabungan · 15. Detail + Riwayat Setoran · 16. Tambah Target · 17. Edit Target · 18. Setor Tabungan · 19. Nonaktifkan Target |
| `screens/Profile.jsx` | 20. Profil & Logout |

## Catatan kontrak API
Desain tidak menyertakan spesifikasi Backend, jadi endpoint di `src/api.js` adalah asumsi
(`/auth/login`, `/summary`, `/transactions`, `/receipts/scan`, `/reports?period=`, `/budgets`, `/goals`, `/notifications`, …).
Jika Backend Anda berbeda, cukup ubah path/field di `api.js` — layar tidak perlu diubah.
Struk tidak terbaca = respons HTTP **422** dari `/receipts/scan`.
