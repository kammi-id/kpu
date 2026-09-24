# KPU Muktamar XIV KAMMI 2026

Website resmi Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026 di [kpu.kammi.id](https://kpu.kammi.id), untuk penjaringan Calon Ketua Umum PP KAMMI.

## Stack

- **Frontend:** React 19, React Router, Tailwind CSS 4, dan shadcn (Base UI)
- **Backend:** Hono di Cloudflare Workers, dengan Better Auth untuk autentikasi
- **Data:** Cloudflare D1 untuk basis data, R2 untuk berkas, dan Workers AI
- **Build dan uji:** Vite, TypeScript, Vitest, ESLint

## Menjalankan secara lokal

Butuh Node.js 24.

```bash
npm install
cp .dev.vars.example .dev.vars   # isi rahasia sesuai petunjuk di dalamnya
npx wrangler d1 migrations apply DB --local
npm run dev
```

Aplikasi berjalan di [http://localhost:5173](http://localhost:5173). Akun Admin lokal dibuat lewat halaman `/onboard` memakai `ONBOARD_TOKEN` dari `.dev.vars`.

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `npm run dev` | Menjalankan server pengembangan |
| `npm test` | Menjalankan seluruh uji |
| `npm run lint` | Memeriksa kode dengan ESLint |
| `npm run build` | Membuat aset gambar lalu build aplikasi |
| `npm run preview` | Build lalu menjalankan hasilnya secara lokal |
| `npm run check` | Build dan uji coba deploy tanpa mengunggah |
| `npm run cf-typegen` | Membuat ulang tipe binding setelah mengubah `wrangler.json` |

Deploy berjalan otomatis lewat GitHub Actions.

## Dokumen lain

| Dokumen | Isi |
|---------|-----|
| [CONTEXT.md](CONTEXT.md) | Glosarium istilah domain dan jadwal |
| [PRODUCT.md](PRODUCT.md) | Pengguna, tujuan, dan konteks produk |
| [DESIGN.md](DESIGN.md) | Sistem desain visual |
| [AGENTS.md](AGENTS.md) | Panduan untuk agen AI dan aturan migrasi D1 |
