# 09: Deploy awal produksi dan onboarding Admin

**What to build:** `https://kpu.kammi.id` sudah dilayani Worker jauh sebelum 17 September 00.00 WIB. Situs menampilkan spanduk tahap Belum dibuka, halaman publik statik, dan footer. Pemegang Admin sudah membuat akun Admin bersama di produksi. Dengan begitu risiko domain, akun Cloudflare, secret, dan paket ditemukan lebih awal, bukan pada malam peluncuran. Registrasi tetap tertutup karena tahap Belum dibuka ditolak server.

Langkah mengikuti checklist tiket 06 bagian C dan D15–D17. Tiket 19 melakukan deploy ulang dan sisa checklist setelah semua fitur selesai. Deploy antara sebelum tiket 19 boleh dilakukan kapan saja.

**Penting:** setelah migrasi diterapkan ke remote pada tiket ini, setiap perubahan skema berikutnya wajib berupa file migrasi baru, bukan edit migrasi awal.

Rujukan: [spec](../spec.md) bagian Konfigurasi Worker; tiket 06 checklist C dan D.

**Blocked by:** 08

**Status:** ready-for-human

- [ ] `npx wrangler whoami` menampilkan akun yang memegang zona `kammi.id`. Bila tidak, berhenti dan lapor ke pengguna.
- [ ] Status Workers Paid diperiksa. Bila belum aktif, lanjutkan di Free, tetapi bila onboarding gagal karena batas CPU (galat 1102), aktifkan Paid dulu. Bila Paid mustahil, berhenti dan lapor, karena keputusan 1 dan 12 tiket 06 terbuka kembali.
- [ ] D1 `kpu-kammi-2026` dan R2 `kpu-kammi-2026-berkas` dibuat. r2.dev dinyatakan nonaktif. Widget Turnstile `kpu-kammi-2026` untuk `kpu.kammi.id` dibuat.
- [ ] `wrangler.json` dilengkapi `database_id`, route Custom Domain, `workers_dev: false`, `preview_urls: false`, cron, vars, dan traces. `cf-typegen` dijalankan.
- [ ] Migrasi diterapkan ke remote.
- [ ] `npm run check` dan deploy lulus. Sebelum secret terpasang, onboarding dan autentikasi menolak dengan galat tertutup.
- [ ] Secret `BETTER_AUTH_SECRET`, `HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, dan `ONBOARD_TOKEN` dipasang interaktif, tidak pernah di argumen, repo, atau log.
- [ ] `curl -sI https://kpu.kammi.id` tidak memuat `x-middleware-rewrite`, dan situs menampilkan spanduk Belum dibuka.
- [ ] Token diserahkan langsung ke Pemegang Admin, Admin dibuat lewat `/onboard`, `ONBOARD_TOKEN` dihapus, dan `/onboard` menjawab 404.
- [ ] `workers.dev` dan Preview URL tidak aktif (acceptance 35, sebagian).
- [ ] Tidak ada akun uji Bakal Calon di produksi.
