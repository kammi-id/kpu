# Peta Spesifikasi Minimum Website KPU KAMMI 2026

Label: wayfinder:map

## Destination

Spesifikasi implementasi minimum yang telah disetujui untuk website KPU KAMMI 2026, mencakup alur Publik, Admin, dan Bakal Calon; aturan pendaftaran; keamanan data dan berkas; serta batas operasional. Spesifikasi harus cukup tegas untuk langsung dibangun di repo ini tanpa keputusan produk yang masih terbuka.

## Notes

- Ini peta perencanaan. Jangan menulis fitur produksi sampai seluruh tiket keputusan selesai.
- Peraturan dalam `PKPU Muktamar KAMMI 2026.docx` adalah sumber normatif utama. `PKPU Muktamar KAMMI 2026.pptx` hanya sumber penjelas. Setiap perbedaan wajib dicatat dan diputuskan KPU, bukan diselesaikan dengan asumsi teknis.
- Preferensi tetap: jumlah tiket minimum, solusi paling sederhana yang aman untuk masa operasi singkat, satu akun Admin, registrasi Bakal Calon, Cloudflare Workers dengan D1 dan R2.
- Repo saat ini memakai React 19, Vite 7, Hono, Workers Static Assets, dan Wrangler 4. Bindings D1 dan R2 belum dikonfigurasi.
- Setiap sesi keputusan memakai `grilling` dan `domain-modeling`. Sesi Cloudflare juga memakai `cloudflare`, `workers-best-practices`, dan `wrangler` serta dokumentasi resmi terkini. Sesi prototipe memakai `prototype`, `impeccable`, dan `shadcn`.
- Frasa “aplikasi digunakan hanya dalam 2 hari” belum boleh ditafsirkan sebelum diputuskan dalam tiket yang relevan.

## Decisions so far

- [Baseline Regulasi dan Batas Platform](issues/01-baseline-regulasi-dan-platform.md): DOCX normatif, konflik kalender dan jalur rekomendasi wajib diputuskan KPU; D1 untuk data/metadata dan R2 privat untuk berkas adalah baseline teknis.

## Not yet specified

- Struktur konten publik, urutan layar, dan penekanan visual setelah baseline regulasi serta kalender resmi dikunci.
- Skema field D1, metadata objek R2, dan transisi status rinci setelah kebijakan operasional serta perlindungan data diputuskan.
- Checklist serah-terima, deployment, ekspor, dan penghentian layanan setelah blueprint tiga peran tervalidasi.

## Out of scope

- Pemungutan, penghitungan, atau penetapan suara dalam forum Muktamar.
- Payment gateway atau rekonsiliasi pembayaran otomatis; ruang lingkup saat ini hanya mencatat dan memverifikasi bukti transfer.
- Multi-admin, role/permission matrix yang kompleks, dan delegasi akun KPU.
- Penerbitan rekomendasi PW/PD di dalam aplikasi atau direktori nasional pemberi rekomendasi.
- Live streaming debat, mesin kampanye, forum diskusi, dan kanal pesan internal.
- Platform CMS jangka panjang di luar siklus penjaringan Muktamar XIV.
