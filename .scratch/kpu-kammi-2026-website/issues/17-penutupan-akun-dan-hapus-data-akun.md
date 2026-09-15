# 17: Penutupan Akun dan Hapus data akun

**What to build:** Bakal Calon Ketua Umum membuka `/akun/pengaturan` dan mengajukan Permintaan Penutupan Akun dan Penarikan Persetujuan dengan konfirmasi kata sandi. Antarmuka menjelaskan bahwa permintaan ini tidak menetapkan status Mengundurkan Diri dan diproses KPU paling lambat 3×24 jam. Akun langsung terkunci dan seluruh sesinya dicabut. Permintaan tersedia di semua tahap selain Selesai.

Tabel `/admin` menampilkan penanda **Minta ditutup**. Hanya untuk akun berpenanda itu, `/admin/:id` menampilkan tombol **Hapus data akun** dengan konfirmasi kata sandi Admin (fungsi bersama dari tiket 15). Tombol menghapus:

- seluruh data akun di D1 (berantai);
- audit yang menyebut akun itu, kecuali `hapus_data`;
- berkasnya di R2;
- kedua ZIP ekspor akun itu;
- barisnya di CSV terkini dan CSV pemeriksaan.

Setelah itu satu audit `hapus_data` dicatat.

Rujukan: [spec](../spec.md) bagian Penutupan akun dan Hapus data akun, dan Konfirmasi kata sandi Admin.

**Blocked by:** 15, 16

**Status:** ready-for-human

- [ ] Permintaan penutupan menolak kata sandi salah. Bila benar, `banned = 1`, `banReason = 'penutupan_akun'`, seluruh sesi terhapus, dan audit `penutupan_akun` tercatat dalam satu batch (acceptance 19).
- [ ] Akun yang ditutup tidak dapat login.
- [ ] Permintaan diterima pada Belum dibuka sampai Terkunci dan ditolak pada Selesai.
- [ ] Tabel Admin menampilkan penanda Minta ditutup hanya untuk `banned = 1` dengan `banReason = 'penutupan_akun'`.
- [ ] Tombol Hapus data akun hanya muncul untuk akun berpenanda Minta ditutup. API menolak penghapusan akun tanpa penanda, dan menolak kata sandi Admin yang salah dengan penghitung konfirmasi yang sama (acceptance 30).
- [ ] Setelah dihapus, tidak ada baris `user`, `profil`, `berkas`, `session`, atau `account` akun itu. Objek `berkas/` akun itu, `ekspor/terkini/<userId>.zip`, dan `ekspor/pemeriksaan/<userId>.zip` hilang. Kedua CSV tidak lagi memuat barisnya (acceptance 30).
- [ ] Audit yang menyebut akun itu terhapus, kecuali satu audit `hapus_data` baru.
- [ ] Butir server diuji lewat seam Worker, termasuk keadaan dengan dan tanpa ekspor yang sudah ada.

## Comments

- Diimplementasikan 2026-09-15. Permintaan Penutupan Akun: `POST /api/akun/pengaturan/penutupan` (`src/worker/index.ts`) memverifikasi kata sandi Bakal Calon sendiri lewat `auth.api.verifyPassword` (bukan `konfirmasiKataSandiAdmin` — itu khusus aksi Admin dengan penghitung bersama), lalu satu `DB.batch` menjalankan `banned = 1`, `banReason = 'penutupan_akun'`, `DELETE` seluruh sesi akun, dan audit `penutupan_akun`. Tersedia di semua tahap selain Selesai lewat `layananAktif`.
- Hapus data akun: `POST /api/admin/:id/hapus-data` (`src/worker/routes/adminBacalon.ts`) menuntut penanda Minta ditutup (`banned=1 AND banReason='penutupan_akun'`, 404 tanpa penanda) dan memakai `konfirmasiKataSandiAdmin` yang sama dengan Reset Password (penghitung kegagalan bersama, diverifikasi lewat uji). Urutan: kumpulkan `r2Key` seluruh berkas → satu `DB.batch` (`DELETE "user"` berantai, `DELETE "audit" WHERE (sasaranUserId=? OR aktorUserId=?) AND tindakan != 'hapus_data'`, lalu `INSERT` audit `hapus_data` baru) → hapus objek `berkas/` dan kedua ZIP ekspor → `hapusBarisCsvBacalon` (baru, `lib/ekspor.ts`) menghapus baris akun itu dari kedua CSV tanpa menyusun ulang isinya (CSV Pemeriksaan adalah snapshot, tak bisa dibangun ulang dari D1 terkini).
- Tabel dan detail Admin (`/api/admin`, `/api/admin/:id`) menyertakan `mintaDitutup` lewat ekspresi SQL bersama `KOLOM_MINTA_DITUTUP` (diekspor dari `lib/ekspor.ts`, dipakai juga oleh CSV) — satu sumber, bukan dua definisi yang bisa menyimpang.
- Klien: `PenutupanAkunDialog` di `/akun/pengaturan` (redirect ke `/masuk` setelah berhasil, karena sesi sendiri sudah dicabut) dan `HapusDataAkunDialog` + pil "Minta ditutup" di `/admin` dan `/admin/:id`, tombol hanya tampil bila `mintaDitutup`.
- Uji seam Worker: `akunPengaturan.test.ts` (4 kasus: kata sandi salah, berhasil, gerbang tahap Belum dibuka–Terkunci vs Selesai, tanpa sesi) dan describe baru "Hapus data akun" di `adminBacalon.test.ts` (4 kasus: tanpa penanda, sesi Bakal Calon, penghitung kegagalan bersama dengan Reset Password, dan penghapusan penuh D1+R2+kedua ZIP+kedua CSV dengan tepat satu audit `hapus_data` tersisa).
- Walkthrough peramban sungguhan (bukan hanya curl) dilakukan dengan `wrangler dev` lokal: registrasi → ajukan penutupan (kata sandi salah lalu benar) → sesi tercabut, login ditolak → login Admin → tabel menampilkan "Minta ditutup" → detail menampilkan tombol Hapus data akun → konfirmasi → akun hilang dari tabel, audit `hapus_data` tercatat. Isu origin lokal yang menghambat tiket 15/16 diselesaikan dengan menyamakan `BETTER_AUTH_URL` di `.dev.vars` (khusus lokal, tak pernah dikomit) ke port dev server sesungguhnya.
- `npm test` (123/123), `npx tsc -b`, dan `npx eslint .` lulus bersih. Direview lewat `/code-review` dua sumbu (Standards + Spec); dua temuan duplikasi ditindaklanjuti (`KOLOM_MINTA_DITUTUP` dan pemeriksa payload kata sandi kini satu sumber di `lib/konfirmasiAdmin.ts`).
