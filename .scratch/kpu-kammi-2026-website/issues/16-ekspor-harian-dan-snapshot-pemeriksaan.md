# 16: Ekspor Harian dan Snapshot Pemeriksaan

**What to build:** Setiap pukul 00.00 WIB, cron membuat ulang Ekspor Harian di `ekspor/terkini/`:

- satu CSV seluruh Bakal Calon Ketua Umum (data, Status Kelengkapan Berkas, penanda Minta ditutup);
- satu ZIP per akun berisi data akun, seluruh berkas, dan manifest SHA-256.

Paket baru menimpa paket hari sebelumnya, dan setiap run mencatat audit `ekspor_harian`. Run pada 5 Oktober 2026 00.00 WIB juga menyalin hasilnya satu kali ke `ekspor/pemeriksaan/` sebagai Snapshot Pemeriksaan yang tidak pernah ditimpa.

Admin mengunduh CSV "Terkini" dan "Pemeriksaan" dari `/admin/ekspor`, serta ZIP akun dari `/admin/:id`. Tidak ada pembuatan paket sesuai permintaan.

Aturan teknis:

- handler `scheduled` memakai `scheduledTime` sebagai "sekarang";
- ZIP memakai metode *store* tanpa kompresi dan dialirkan ke R2 dengan multipart upload (bagian ≥ 5 MiB kecuali terakhir);
- periksa dokumentasi terkini R2 multipart dan batas cron sebelum menulis.

Rujukan: [spec](../spec.md) bagian Ekspor Harian, Snapshot Pemeriksaan, Penghapusan Akhir.

**Blocked by:** 14

**Status:** ready-for-human

- [ ] Handler terjadwal pada tahap selain Selesai menulis `ekspor/terkini/bacalon.csv` dan `ekspor/terkini/<userId>.zip` untuk setiap Bakal Calon, lalu audit `ekspor_harian` berhasil beraktor `Sistem` (acceptance 31).
- [ ] Pengecualian yang tertangkap selama run menghasilkan audit `ekspor_harian` dengan hasil `gagal`.
- [ ] CSV dan ZIP tidak memuat hash kata sandi, token sesi, isi `account`/`session`/`verification`, atau `percobaanLogin` (acceptance 24).
- [ ] Manifest ZIP mencantumkan SHA-256 tiap berkas yang cocok dengan isi berkas di ZIP. ZIP dapat dibuka pengekstrak standar.
- [ ] Run bertanggal WIB 5 Oktober 2026 menyalin hasil ke `ekspor/pemeriksaan/` bila belum ada. Run 6 Oktober tidak menimpanya (acceptance 31).
- [ ] Run berikutnya menimpa `ekspor/terkini/`, dan akun yang sudah tidak ada tidak tersisa di CSV terkini.
- [ ] `/admin/ekspor` mengunduh CSV terkini dan pemeriksaan. `/admin/:id` mengunduh ZIP terkini dan pemeriksaan akun itu. Semuanya sebagai attachment + `nosniff`, dan "belum tersedia" bila objek belum ada.
- [ ] Hanya sesi Admin yang dapat mengunduh ekspor. Setiap unduhan dicatat audit `ekspor`.
- [ ] Handler terjadwal diuji lewat seam Worker dengan `scheduledTime` pilihan, dan dapat dicoba lokal dengan `wrangler dev --test-scheduled`.

## Comments

- Diimplementasikan 2026-09-15. `buatEksporHarian` (`src/worker/lib/ekspor.ts`) memakai `controller.scheduledTime` sebagai "sekarang" (bukan jam fetch yang disuntikkan), menulis `ekspor/terkini/bacalon.csv` dan satu ZIP *store* per akun lewat R2 multipart upload (bagian ≥ 5 MiB, ditulis sendiri tanpa dependensi eksternal), menghapus objek `ekspor/terkini/` yang sudah tidak ada di roster, menyalin ke `ekspor/pemeriksaan/` tepat sekali pada tanggal WIB 5 Okt 2026, dan berhenti menulis begitu `tahapPada` bernilai Selesai (Penghapusan Akhir menyusul di tiket 18). Setiap run mencatat audit `ekspor_harian`.
- `GET /api/admin/ekspor/:kategori` (CSV) dan `GET /api/admin/:id/ekspor/:kategori` (ZIP) mengunduh varian `terkini`/`pemeriksaan`, 404 `belum_tersedia` bila objek belum ada, attachment + `nosniff`, dan mencatat audit `ekspor` per unduhan. Rute literal `/ekspor` didaftarkan sebelum `/:id` agar tidak tertelan sebagai parameter.
- Sisi klien: halaman `/admin/ekspor` (tautan navigasi baru di `AdminLayout`) untuk CSV Terkini/Pemeriksaan, dan tautan unduh ZIP Terkini/Pemeriksaan pada `/admin/:id`.
- Uji seam Worker (9 kasus baru) memverifikasi: tak ada data rahasia (`account`/`session`/`verification`/`percobaanLogin`/hash kata sandi) di CSV maupun ZIP; SHA-256 manifest cocok dengan isi ZIP sesungguhnya (pengurai ZIP minimal ditulis khusus untuk uji ini); kolom Minta ditutup hanya "ya" bila `banned` **dan** `banReason = 'penutupan_akun'` bersamaan; kegagalan tertangkap menghasilkan audit gagal; Snapshot 5 Okt tidak pernah ditimpa 6 Okt; run berikutnya menimpa Terkini dan membuang akun yang sudah tidak ada; tahap Selesai tidak menulis; unduhan CSV/ZIP dengan header yang benar, `belum_tersedia`, audit, dan penolakan non-Admin. `npm test`, `npm run lint`, dan `npm run build` lulus.
- Status tetap `ready-for-human`: walkthrough peramban dengan login sungguhan terhambat oleh isu lokal yang tampaknya tidak berkaitan dengan kode aplikasi — `wrangler dev` lokal menolak setiap origin dengan `INVALID_ORIGIN` pada `sign-in/email` meski `BETTER_AUTH_URL` di `wrangler.json` diubah dan `routes` dilepas sementara (dicoba beberapa kombinasi, semuanya gagal dengan pesan galat yang identik). Kemungkinan terkait resolusi origin spesifik versi Wrangler/Better Auth yang dipakai saat ini dan perlu ditelusuri terpisah dari kedua tiket ini. Rute `/admin/ekspor` sudah diverifikasi terdaftar dan mengarahkan ke `/masuk` tanpa galat konsol saat tanpa sesi; unduhan CSV/ZIP dan seluruh perilaku cron dibuktikan lewat uji seam Worker di atas.
