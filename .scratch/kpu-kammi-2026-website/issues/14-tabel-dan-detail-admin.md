# 14: Tabel dan detail Admin

**What to build:** Admin membuka `/admin` dan melihat tabel seluruh Bakal Calon Ketua Umum: nama, WhatsApp, waktu terdaftar, `x/10`, dan `Lengkap` atau `Belum lengkap`, dengan pencarian nama. Dari tabel, Admin membuka `/admin/:id` untuk melihat data pribadi dan sepuluh kelompok berkas beserta tombol unduh per berkas. Setiap unduhan melewati Worker sebagai attachment. Admin dapat bekerja di semua tahap selain Selesai.

Tabel hanya membaca `user` dengan peran `bacalon` yang digabung dengan `vKelengkapan`. Tidak ada status pencalonan di antarmuka.

Rujukan: [spec](../spec.md) bagian Klien React (sitemap Admin), Kelompok berkas dan unggahan (unduh), dan Audit.

**Blocked by:** 12, 13

**Status:** ready-for-agent

- [ ] Tabel menampilkan `x/10` dan label yang sama persis dengan yang dilihat pemilik akun (acceptance 21).
- [ ] Pencarian nama menyaring tabel. Baris Admin tidak pernah muncul.
- [ ] `/admin/:id` menampilkan data pribadi dan sepuluh kelompok dengan berkasnya. Id yang tidak ada menjawab 404.
- [ ] Unduhan berkas oleh Admin memakai `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff` dan tidak pernah tampil inline (acceptance 22).
- [ ] Sesi Bakal Calon ditolak di API tabel, detail, dan unduh Admin (acceptance 20).
- [ ] Respons seluruh API publik tidak memuat nama, kontak, atau berkas Bakal Calon, diuji dengan data Bakal Calon yang ada (acceptance 1).
- [ ] Antarmuka tidak memuat label `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`, `Calon Ketua Umum` sebagai status, atau `kandidat`.
- [ ] Butir server diuji lewat seam Worker.
