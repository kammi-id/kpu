# KPU Muktamar XIV KAMMI 2026

Website resmi Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026 di [kpu.kammi.id](https://kpu.kammi.id), untuk penjaringan Calon Ketua Umum PP KAMMI. Satu aplikasi melayani tiga pengguna:

- **Pengunjung publik**: tahap yang sedang berjalan, jadwal, ringkasan Peraturan, dan unduhan Berkas Publik (PKPU, Formulir A.1–A.6) tanpa akun.
- **Bakal Calon Ketua Umum**: mendaftar setelah Verifikasi NIA, mengisi data A.1, mengunggah sepuluh Kelompok Berkas, lalu melihat Status Kelengkapan Berkas serta mengunduh atau mempratinjau berkasnya sendiri.
- **Admin bersama**: memantau kelengkapan, mempratinjau dan mengunduh berkas, mereset kata sandi, memproses Permintaan Penutupan Akun, menghapus data akun Bakal Calon, mengelola Peraturan dan Berkas Publik, mengunduh Ekspor Harian dan Snapshot Pemeriksaan, serta membaca audit.

Aplikasi hanya mencatat **keberadaan** berkas. Keabsahan berkas, kelulusan, dan penetapan Calon Ketua Umum tetap keputusan KPU. Perilaku aplikasi dikendalikan jam WIB melalui enam tahap, dari Belum dibuka sampai Selesai. Seluruh data pribadi dihapus otomatis pada Penghapusan Akhir.

## Dokumen rujukan

| Dokumen | Isi |
|---------|-----|
| [CONTEXT.md](CONTEXT.md) | Glosarium domain dan jadwal resmi. Pakai istilahnya di kode, UI, dan PR. |
| [PRODUCT.md](PRODUCT.md) | Pengguna, tujuan, dan konteks operasi. |
| [DESIGN.md](DESIGN.md) | Sistem desain visual. |
| [docs/adr/](docs/adr/) | Keputusan arsitektur. |
| [AGENTS.md](AGENTS.md) | Aturan untuk agen AI, termasuk larangan membangun ulang tabel induk D1. |
| [.scratch/](.scratch/) | Spesifikasi dan tiket per fitur. |

## Teknologi

- **Frontend:** React 19, React Router, Tailwind CSS 4, dan komponen shadcn di atas Base UI (`src/react-app`, `src/components`).
- **Backend:** Hono di Cloudflare Workers (`src/worker`), dengan Better Auth untuk sesi.
- **Data:**
  - D1 (`DB`) untuk data;
  - R2 (`BERKAS`) untuk berkas Bakal Calon, Berkas Publik, dan paket ekspor;
  - Workers AI (`AI`) untuk mengisi otomatis Formulir A.1.
- **Cron** harian pukul 00.00 WIB (`0 17 * * *` UTC): membuat Ekspor Harian, lalu menjalankan Penghapusan Akhir setelah tahap Selesai.
- **Uji:** Vitest dengan `@cloudflare/vitest-plugin`, yang menjalankan uji di runtime Workers dengan D1 dan R2 lokal.

## Pengembangan lokal

Butuh Node.js 24.

```bash
npm install
cp .dev.vars.example .dev.vars   # isi rahasia; petunjuk ada di dalam berkas
npx wrangler d1 migrations apply DB --local
npm run dev                      # http://localhost:5173
```

Rahasia yang dibutuhkan:

| Rahasia | Kegunaan |
|---------|----------|
| `BETTER_AUTH_SECRET` | Rahasia sesi Better Auth |
| `HMAC_SECRET` | Kunci pembatasan percobaan masuk dan konfirmasi Admin |
| `TURNSTILE_SECRET_KEY` | Verifikasi Cloudflare Turnstile. Kunci uji "selalu lolos" cukup untuk lokal. |
| `ONBOARD_TOKEN` | Token halaman `/onboard`. Hapus di production setelah Admin dibuat. |
| `KAMMI_ID_TOKEN` | Akses API kammi.id untuk Verifikasi NIA dan data struktur PW/PD. |

Membuat akun Admin lokal: isi `ONBOARD_TOKEN` di `.dev.vars`, lalu buka `/onboard`. Halaman itu hanya terbuka selama belum ada akun Admin.

D1 dan R2 lokal disimpan di `.wrangler/state`. Gunakan data sintetis di sana. Jangan menyalin data Bakal Calon dari production atau preview.

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `npm run dev` | Server pengembangan Vite + Worker |
| `npm test` | Seluruh uji, termasuk pemeriksaan keamanan migrasi D1 |
| `npm run lint` | ESLint |
| `npm run build` | Membuat gambar responsif dan OG, lalu `tsc` dan build Vite |
| `npm run check` | Build dan `wrangler deploy --dry-run` |
| `npm run cf-typegen` | Membuat ulang tipe binding setelah mengubah `wrangler.json` |

## Migrasi D1

Migrasi ada di [migrations/](migrations/) dan dijalankan CI sebelum setiap deploy. Aplikasi sudah berjalan di production dengan data nyata, jadi:

- utamakan perubahan tanpa migrasi bila memungkinkan;
- jangan membangun ulang tabel induk dari foreign key `ON DELETE CASCADE` tanpa menyimpan baris anaknya lebih dulu. `DROP TABLE` di D1 akan mengosongkan tabel anak diam-diam. Baca [ADR 0002](docs/adr/0002-membangun-ulang-tabel-induk-di-d1.md);
- `npm test` menolak migrasi yang melanggar aturan itu.

## Deploy

Deploy berjalan lewat GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)). Jangan deploy manual.

| Pemicu | Tujuan | Data |
|--------|--------|------|
| Pull request ke `main` | Worker `kpu-preview` di [kpu-preview.ppkammi2045.workers.dev](https://kpu-preview.ppkammi2045.workers.dev) | D1 `kpu-kammi-2026-preview`, R2 `kpu-kammi-2026-berkas-preview` |
| Push ke `main` | Preview dan production [kpu.kammi.id](https://kpu.kammi.id) | D1 `kpu-kammi-2026`, R2 `kpu-kammi-2026-berkas` |

Deploy hanya berjalan setelah lint, build, dan uji lolos. Setiap deploy menjalankan migrasi D1 remote lebih dulu, lalu `wrangler deploy`. Rahasia Worker diatur dengan `npx wrangler secret put <NAMA> [--env preview]`. Log production bisa dipantau dengan `npx wrangler tail`.
