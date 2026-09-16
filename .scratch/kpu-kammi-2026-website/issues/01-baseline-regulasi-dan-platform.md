# Baseline Regulasi dan Batas Platform

Type: research
Status: resolved
Assigned to: research/kpu-requirements-baseline
Blocked by: none

## Question

Fakta apa dari DOCX normatif, PPTX penjelas, konfigurasi repo, dan dokumentasi resmi Cloudflare terkini yang wajib membatasi spesifikasi minimum website? Hasil riset harus merangkum persyaratan data dan berkas Bakal Calon, tahapan/status yang tersirat, kalender beserta semua konflik sumber, batas Workers/D1/R2 yang relevan untuk upload dan privasi, serta daftar hal yang memang membutuhkan keputusan manusia KPU. Simpan temuan sebagai satu catatan Markdown dan tautkan dari jawaban tiket ini.

## Comments

## Answer

Baseline lengkap tersimpan pada branch `research/kpu-requirements-baseline`, commit `b73d2ea9cc1566f58f23988571f6cbf158e8b96b`, di `.scratch/kpu-kammi-2026-website/research/baseline-regulasi-dan-platform.md`. Konteks dapat dibaca tanpa checkout melalui:

`git show b73d2ea9cc1566f58f23988571f6cbf158e8b96b:.scratch/kpu-kammi-2026-website/research/baseline-regulasi-dan-platform.md`

Ringkasan resolusi:

- DOCX tetap menjadi sumber normatif. Kalender tahap 2–8 belum dapat dikunci karena PPTX berbeda dan DOCX sendiri memuat salah ketik serta salah rujuk tahap.
- Pasal 8 menawarkan jalur rekomendasi PW atau PD, tetapi Pasal 13 dan Formulir A.2 mencantumkan keduanya. Validasi menunggu keputusan KPU.
- D1 hanya menyimpan akun, data formulir, status, metadata, dan audit; berkas tetap di bucket R2 privat dengan akses terotorisasi.
- Upload melalui Worker adalah jalur minimum bila batas file ditetapkan di bawah batas request paket Cloudflare dan body dialirkan ke R2 tanpa buffering penuh.
- Kalender resmi, aturan kelengkapan, pembayaran/akun, perlindungan serta retensi data, dan konten publik adalah keputusan manusia yang dibawa ke tiket berikutnya.
