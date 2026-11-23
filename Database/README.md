# SaveSmart AI - Database

Skema SQLite. Setiap perubahan struktur ditulis sebagai file baru di `migrations/` (`002_nama.sql`, dst.)
dan dijalankan otomatis oleh backend satu kali. Jangan mengubah file migrasi yang sudah di-merge.

| Tabel | Isi |
|---|---|
| `users` | Akun (kata sandi disimpan sebagai hash bcrypt) |
| `transactions` | Pemasukan & pengeluaran, `source` = `manual` / `scan` |
| `budgets` | Batas anggaran per kategori per akun + ambang peringatan |
| `goals` | Target tabungan |
| `deposits` | Setoran ke target (jumlah terkumpul = total setoran) |
| `notifications` | Notifikasi; `dedupe_key` mencegah notifikasi ganda |

Nominal = bilangan bulat Rupiah. Tanggal = teks ISO.
