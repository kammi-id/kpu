# KPU Muktamar XIV KAMMI 2026

Website resmi Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026 di [kpu.kammi.id](https://kpu.kammi.id), untuk penjaringan Calon Ketua Umum PP KAMMI. Dibangun dengan React, Hono, dan Cloudflare Workers (D1, R2).

Istilah domain dan jadwal ada di [CONTEXT.md](CONTEXT.md), konteks produk di [PRODUCT.md](PRODUCT.md), dan keputusan arsitektur di [docs/adr/](docs/adr/).

## Pengembangan

```bash
npm install
cp .dev.vars.example .dev.vars   # isi rahasia sesuai petunjuk di dalamnya
npx wrangler d1 migrations apply DB --local
npm run dev                      # http://localhost:5173
```

Sebelum membuka PR, jalankan `npm run lint`, `npm test`, dan `npm run build`.

## Deploy

GitHub Actions men-deploy setiap PR ke Worker preview dan setiap push ke `main` ke production. Aplikasi sudah berisi data nyata, jadi baca [ADR 0002](docs/adr/0002-membangun-ulang-tabel-induk-di-d1.md) sebelum menulis migrasi D1.
