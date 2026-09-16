# 07: Fondasi, spanduk tahap, dan halaman publik statik

**What to build:** Jalur publik pertama yang utuh. Pengunjung membuka beranda dan melihat spanduk tahap penjaringan yang benar menurut waktu WIB server, tiga pintu menuju Peraturan, Jadwal, dan Unduhan, serta pernyataan bahwa situs tidak menayangkan data Bakal Calon Ketua Umum. Tombol `Daftar` nonaktif di luar Masa Pendaftaran beserta alasannya. `/jadwal` memuat sepuluh tahap resmi dan `/tentang` memuat profil serta kanal resmi KPU dari Markdown statik, atau "Menyusul" bila isinya belum ada. Footer penegasan tiadanya hubungan dengan penyelenggara pemilihan umum nasional tampil di setiap rute.

Tiket ini juga meletakkan fondasi yang dipakai semua tiket berikutnya ("make the change easy"):

- binding `DB`/`BERKAS`, vars, dan cron di `wrangler.json`, lalu `cf-typegen`;
- **satu** migrasi awal lengkap: DDL tiket 05 ditambah seluruh amandemen tiket 06, dengan kolom Better Auth versi yang dipin dibandingkan terhadap generator Better Auth;
- Worker dibangun lewat fungsi pembuat yang menerima `sekarang`;
- harness uji Workers dengan D1/R2 lokal dan migrasi diterapkan;
- modul `tahapPada` dengan enam tahap, predikat turunan, dan konstanta sepuluh tahap jadwal;
- API tahap;
- shell SPA dengan router;
- renderer Markdown aman (tanpa HTML mentah; tautan hanya `http(s)`, `mailto`, relatif) yang dipakai ulang tiket 10 dan 11.

Worker harus berjalan lebih dulu untuk `/api/*` dan `/onboard`. Periksa dokumentasi terkini sebelum mengonfigurasi static assets.

Rujukan: [spec](../spec.md) bagian Konfigurasi Worker, Modul jam dan tahap, Skema D1, Klien React, dan Testing Decisions (seam utama dan seam murni).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Uji murni `tahapPada` lulus pada instan tepat sebelum dan tepat pada setiap batas tahap: 16 Sep 2026 17.00Z, 4 Okt 17.00Z, 7 Okt 17.00Z, 11 Okt 17.00Z, dan 24 Jan 2027 17.00Z. Predikat registrasi, ubah, dan layanan aktif benar di keenam tahap. (`src/worker/lib/tahap.test.ts`, `npm test`)
- [x] Uji lewat seam Worker membuktikan bahwa API tahap mengembalikan tahap sesuai jam yang disuntikkan. Ekspor default memakai jam nyata. (`src/worker/index.test.ts`)
- [x] Migrasi terterapkan tanpa galat di D1 lokal dalam harness uji. Uji integritas dasar lulus: Bakal Calon tanpa WhatsApp ditolak, PNG di kelompok 6 ditolak, dan Admin kedua ditolak indeks unik. (`migrations/0001_init.sql`, `@cloudflare/vitest-plugin`)
- [x] Beranda menampilkan spanduk tahap yang benar untuk keenam tahap (acceptance 2, dibaca sebagai enam tahap). Server-driven lewat `/api/tahap`; butir UI ini diperiksa manual di peramban per Testing Decisions (klien React tidak diuji otomatis).
- [x] Tombol `Daftar` nonaktif di luar Masa Pendaftaran dan menjelaskan alasannya (acceptance 3). Sama, manual di peramban.
- [x] `/jadwal` memuat sepuluh tahap persis seperti tiket 02, seluruhnya WIB (acceptance 4).
- [x] `/tentang` merender Markdown statik atau "Menyusul" bila belum tersedia. `tentang.md` belum di-commit pemilik produk (lihat checklist B4 tiket 06) — halaman menampilkan "Menyusul" sampai `src/content/tentang.md` + `public/tentang/` ditambahkan; tidak ada perubahan kode lagi dibutuhkan begitu berkasnya ada.
- [x] Footer penegasan tampil di setiap rute yang ada (acceptance 34; rute akun dan Admin menyusul memakai layout yang sama).
- [x] Renderer Markdown tidak merender `<script>`, atribut `on*`, atau tautan `javascript:`. Otomatis diuji untuk sanitasi tautan (`SafeMarkdown.test.ts`); react-markdown tidak pernah memakai `dangerouslySetInnerHTML`.
- [x] Salinan Coming Soon dan judul dokumen diganti. UI memakai shadcn/Base UI dan kelas Tailwind tanpa CSS tulisan tangan.
- [x] `npm run check` lulus.

## Comments

- Diimplementasikan 2026-09-15. Skrip `npm test` (`vitest run`) ditambahkan karena belum ada; `npm run check` tetap `tsc && vite build && wrangler deploy --dry-run` sesuai spec dan tidak menjalankan uji.
- `wrangler.json`: `d1_databases[0].database_id` masih placeholder nol — diisi Operator lewat `wrangler d1 create` di checklist C7 tiket 06 (tiket 09).
- Ponytail-review dan code-review (Standards + Spec, dua subagent paralel) dijalankan pada diff; temuan yang valid sudah diperbaiki: kontras teks putih transparan di atas merah/marun (Header, Footer) diganti putih penuh; tombol Daftar nonaktif dipindah ke komponen `Button` Base UI asli dengan `focusableWhenDisabled` (bukan `<button>` tulisan tangan); ubin split-flap sekarang benar-benar berputar acak lalu mengunci kiri-ke-kanan (bukan hanya flip statis); `TombolDaftar.tsx` diinline ke `Beranda.tsx` (satu pemanggil); `style` inline diganti kelas Tailwind arbitrer. Satu temuan ditolak sebagai salah baca: `CONTEXT.md` melarang menyebut *tahap Selesai* sebagai "Terkunci"/"masa tenang", bukan melarang kedua istilah itu untuk tahap dan agenda resminya sendiri (keduanya memang nama tahap/agenda yang sah di tiket 02).
- Belum diminta ke pengguna secara eksplisit dalam sesi ini: isi `tentang.md`. Halaman sudah siap menampilkannya begitu berkas ditambahkan.
