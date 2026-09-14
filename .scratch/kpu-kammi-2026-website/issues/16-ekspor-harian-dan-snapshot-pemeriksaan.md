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

**Status:** ready-for-agent

- [ ] Handler terjadwal pada tahap selain Selesai menulis `ekspor/terkini/bacalon.csv` dan `ekspor/terkini/<userId>.zip` untuk setiap Bakal Calon, lalu audit `ekspor_harian` berhasil beraktor `Sistem` (acceptance 31).
- [ ] Pengecualian yang tertangkap selama run menghasilkan audit `ekspor_harian` dengan hasil `gagal`.
- [ ] CSV dan ZIP tidak memuat hash kata sandi, token sesi, isi `account`/`session`/`verification`, atau `percobaanLogin` (acceptance 24).
- [ ] Manifest ZIP mencantumkan SHA-256 tiap berkas yang cocok dengan isi berkas di ZIP. ZIP dapat dibuka pengekstrak standar.
- [ ] Run bertanggal WIB 5 Oktober 2026 menyalin hasil ke `ekspor/pemeriksaan/` bila belum ada. Run 6 Oktober tidak menimpanya (acceptance 31).
- [ ] Run berikutnya menimpa `ekspor/terkini/`, dan akun yang sudah tidak ada tidak tersisa di CSV terkini.
- [ ] `/admin/ekspor` mengunduh CSV terkini dan pemeriksaan. `/admin/:id` mengunduh ZIP terkini dan pemeriksaan akun itu. Semuanya sebagai attachment + `nosniff`, dan "belum tersedia" bila objek belum ada.
- [ ] Hanya sesi Admin yang dapat mengunduh ekspor. Setiap unduhan dicatat audit `ekspor`.
- [ ] Handler terjadwal diuji lewat seam Worker dengan `scheduledTime` pilihan, dan dapat dicoba lokal dengan `wrangler dev --test-scheduled`.
