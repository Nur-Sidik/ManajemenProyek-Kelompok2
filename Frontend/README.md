# SaveSmart AI - Frontend

React + Vite, responsif: tampilan web (sidebar kiri) di layar lebar, tampilan ponsel (menu bawah) di layar kecil.
Folder ini untuk dimasukkan ke `frontend/` di repository `ManajemenProyek-Kelompok2` (branch `Frontend`).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil ke dist/
```

## Struktur

```
src/
  App.jsx            routing (HashRouter) + proteksi login
  store.jsx          state global (localStorage), semua aksi: transaksi, anggaran, target, notifikasi
  data.js            data dummy sesuai angka di Figma
  ui.jsx             komponen bersama: BottomNav, Progress, Sheet, MoneyInput, ikon
  styles.css         seluruh styling (token warna di :root)
  services/ocr.js    MOCK AI Vision -> ganti dengan layanan di ocr/ai-service
  screens/
    Auth.jsx         Splash, Welcome, Login, Daftar
    Main.jsx         Beranda, Laporan, Notifikasi
    Scan.jsx         Scan, Konfirmasi, Gagal Baca, Tersimpan, Input Manual
    Budget.jsx       Anggaran Bulanan, Atur Anggaran, Modal Anggaran Terlampaui
    Goals.jsx        Target Tabungan, Buat Target, Detail Target, Profil
```

## Alur layar

Splash -> Welcome -> Daftar/Masuk -> Beranda.
Beranda -> Laporan, Notifikasi, Scan, Anggaran, Target, Profil (navigasi bawah).
Scan -> (membaca) -> Konfirmasi -> Tersimpan, atau -> Gagal Baca -> Scan Ulang / Input Manual.
Anggaran -> Atur Anggaran. Notifikasi "Anggaran Hiburan terlampaui" membuka modal peringatan.
Target -> Buat Target Baru, atau Detail Target -> Setor Tabungan.

## Yang masih perlu disambungkan ke backend

Cari komentar `TODO(backend)` dan `TODO(ai-service)`:

- Login/daftar (`store.jsx`, `screens/Auth.jsx`) - sekarang hanya validasi form lalu simpan ke localStorage.
- Semua data (`data.js`) - sekarang dummy.
- OCR struk (`services/ocr.js`) - sekarang mengembalikan hasil palsu setelah 2,4 detik.
  Tombol "Demo: simulasikan struk tidak terbaca" di layar Scan hanya untuk mencoba layar error.

Menu Profil > "Reset data demo" mengembalikan data ke kondisi awal.
