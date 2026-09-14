# Peta Spesifikasi Minimum Website KPU KAMMI 2026

Label: wayfinder:map

## Destination

Spesifikasi implementasi minimum yang telah disetujui untuk website KPU KAMMI 2026, mencakup alur Publik, Admin, dan Bakal Calon; aturan pendaftaran; keamanan data dan berkas; serta batas operasional. Spesifikasi harus cukup tegas untuk langsung dibangun di repo ini tanpa keputusan produk yang masih terbuka.

## Notes

- Ini peta perencanaan. Jangan menulis fitur produksi sampai seluruh tiket keputusan selesai.
- Peraturan dalam `PKPU Muktamar KAMMI 2026.docx` adalah sumber normatif utama. `PKPU Muktamar KAMMI 2026.pptx` hanya sumber penjelas. Setiap perbedaan wajib dicatat dan diputuskan KPU, bukan diselesaikan dengan asumsi teknis.
- Preferensi tetap: jumlah tiket minimum, solusi paling sederhana yang aman untuk masa operasi singkat, satu akun Admin, registrasi Bakal Calon, Cloudflare Workers dengan D1 dan R2.
- `KPU` hanya berarti Komisi Penjaringan Umum Muktamar KAMMI. Produk tidak memiliki hubungan dengan KPU RI dan tidak boleh memuat referensi, identitas, fungsi, atau istilah pemilihan umum nasional.
- Repo saat ini memakai React 19, Vite 7, Hono, Workers Static Assets, dan Wrangler 4. Bindings D1 dan R2 belum dikonfigurasi.
- Setiap sesi keputusan memakai `grilling` dan `domain-modeling`. Sesi Cloudflare juga memakai `cloudflare`, `workers-best-practices`, dan `wrangler` serta dokumentasi resmi terkini. Sesi prototipe memakai `prototype`, `impeccable`, dan `shadcn`.

## Decisions so far

- [Baseline Regulasi dan Batas Platform](issues/01-baseline-regulasi-dan-platform.md): DOCX normatif, konflik kalender dan jalur rekomendasi wajib diputuskan KPU; D1 untuk data/metadata dan R2 privat untuk berkas adalah baseline teknis.
- [Model Operasi dan Kebijakan Pendaftaran](issues/02-model-operasi-dan-kebijakan-pendaftaran.md): operasi mengikuti jendela pendaftaran dan perbaikan WIB; aplikasi mengelola akun, sepuluh kelompok unggahan, serta kelengkapan berbasis keberadaan saja.
- [Identitas Keamanan dan Siklus Data](issues/03-identitas-keamanan-dan-siklus-data.md): registrasi email/kata sandi terbuka di atas Better Auth dengan D1 native dan Turnstile; satu kredensial Admin bersama, reset kata sandi oleh Admin, R2 privat dengan unduhan attachment, persetujuan eksplisit PP KAMMI, audit `Admin bersama`, dan retensi 90 hari setelah penutupan proses.
- [Blueprint Pengalaman Tiga Peran](issues/04-blueprint-tiga-peran.md): verdict manusia memilih Varian A, blueprint berbasis halaman, dengan sitemap tetap untuk Publik, Bakal Calon Ketua Umum, dan Admin, batas implementasi, serta acceptance checklist 25 butir.

## Not yet specified

<!-- kosong: kedua kabut sebelumnya sudah menjadi tiket 05 dan 06 -->

## Out of scope

- Pemungutan, penghitungan, atau penetapan suara dalam forum Muktamar.
- Payment gateway, rekonsiliasi, atau verifikasi pembayaran; aplikasi hanya mencatat keberadaan unggahan bukti transfer.
- Multi-admin, role/permission matrix yang kompleks, dan delegasi akun KPU.
- Penerbitan rekomendasi PW/PD di dalam aplikasi atau direktori nasional pemberi rekomendasi.
- Validasi keabsahan berkas, uji kualifikasi, dan penetapan status hukum pencalonan oleh aplikasi.
- Penerbitan pengumuman resmi serta penayangan identitas, profil, status, atau berkas Bakal Calon kepada publik.
- Live streaming debat, mesin kampanye, forum diskusi, dan kanal pesan internal.
- Platform CMS jangka panjang di luar siklus penjaringan Muktamar XIV.
