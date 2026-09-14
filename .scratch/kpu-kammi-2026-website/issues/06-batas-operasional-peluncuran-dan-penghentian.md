# Batas Operasional: Peluncuran, Serah-Terima, dan Penghentian

Type: grilling
Status: resolved
Blocked by: 05

## Question

Batas operasional apa yang harus disepakati agar spesifikasi dapat langsung
dibangun dan dihentikan dengan tertib? Putuskan prasyarat peluncuran: siapa
yang menyediakan isi halaman publik dan dalam format apa, yakni teks pasal
`/peraturan`, profil dan kontak `/tentang`, serta berkas formulir A.1 sampai
A.6 di `/unduhan`; nama binding D1 dan R2 beserta cara penyediaannya; domain,
secret, dan kunci Turnstile; siapa yang memegang kredensial Admin bersama dan
bagaimana diserahkan. Putuskan pula kanal resmi untuk permintaan subjek data,
prosedur reset kata sandi oleh Admin dari sisi manusia, jadwal dan pemicu
ekspor serah-terima, tanggal penutupan resmi yang menjadi awal Masa Retensi,
serta langkah penghentian layanan dan penghapusan data beserta bukti yang
disimpan. Hasilnya harus berupa checklist yang dapat dijalankan orang lain
tanpa menafsirkan ulang keputusan tiket sebelumnya.

## Comments

### Putaran keputusan 1 — 15 September 2026

- Fakta: Workers Free dibatasi 10 ms CPU per request, tidak cukup untuk hashing kata sandi, SHA-256 berkas 20 MiB, dan ZIP; Workers Paid memberi 5 menit CPU dan Time Travel D1 30 hari. Custom Domain menuntut zona aktif di akun yang sama. `kammi.id` memakai nameserver Cloudflare dengan DNS wildcard; `kpu.kammi.id` saat ini dilayani situs Next.js utama (rewrite ke `/kpu`). DOCX Lampiran II memuat Formulir A.1–A.6 tetapi tidak memuat kontak atau profil KPU.
- Q1: akun Cloudflare milik KPU/PP KAMMI dengan email organisasi, developer sebagai anggota; Workers Paid.
- Q2: domain `kpu.kammi.id`.
- Q3 + Q4: Admin mengelola isi `/peraturan` (Markdown di D1) dan mengunggah berkas peraturan. `/tentang` statik dari Markdown di repo dengan aset yang disediakan pemilik produk, termasuk kanal resmi.
- Q5: onboarding Admin saat aplikasi pertama kali dijalankan, termasuk pembuatan kata sandi. Tidak ada rotasi kata sandi.
- Q6: tanpa mekanisme khusus. Tombol "Reset Password" dengan konfirmasi; Admin wajib memasukkan kata sandi Admin; kata sandi baru ditampilkan dan langsung dapat dipakai login.
- Q7: penutupan resmi 27 Oktober 2026 (penghapusan 25 Januari 2027).
- Q8: tanpa enkripsi dan kata sandi arsip; ZIP di-(re)generate setiap hari pukul 00.00.
- Q9: seluruh data dihapus pada 25 Januari 2027 tanpa konfirmasi apa pun.
- Q10: binding `DB`/`BERKAS`, secrets, penyediaan eksplisit, tanpa staging — disetujui.

### Putaran keputusan 2 — 15 September 2026

- Q1: seluruh resource berada di akun Cloudflare yang memegang zona `kammi.id`; `kpu.kammi.id` menjadi Custom Domain Worker dan menimpa wildcard situs utama.
- Q2–Q9 disetujui sesuai rekomendasi: satu dokumen Markdown Peraturan; Berkas Publik PDF/DOCX untuk `/peraturan` dan `/unduhan`; `/tentang` dan pemberitahuan persetujuan dari Markdown di repo dengan penegasan tetap di footer; onboarding bertoken `ONBOARD_TOKEN`; Reset Password 16 karakter dengan konfirmasi kata sandi Admin; penanda "Minta ditutup" dan tombol "Hapus data akun"; ekspor harian 00.00 WIB dengan Snapshot Pemeriksaan; penghapusan otomatis 25 Januari 2027 dengan tahap Selesai.
- Q10: seluruh fitur wajib operasional pada 17 September 2026 pukul 00.00 WIB; tidak ada fitur yang menyusul.

## Answer

Checklist ini melengkapi tiket 02–05 dan mengamandemen bagian yang disebut di bawah. Pelaksana tidak perlu menafsirkan ulang keputusan sebelumnya; bila ada pertentangan, tiket ini yang berlaku.

### Peran pelaksana

| Peran | Siapa |
| --- | --- |
| **Pemilik zona** | Pemegang akun Cloudflare PP KAMMI yang memuat zona `kammi.id` |
| **Operator infrastruktur** | Developer yang diundang ke akun tersebut; memegang Wrangler, secrets, dan pemulihan Admin |
| **Pemegang Admin** | Anggota KPU yang memegang kredensial Admin bersama |
| **Pemilik produk** | Penyedia `tentang.md` dan asetnya; juga pengelola situs utama `kammi.id` |

### Keputusan

1. **Akun dan paket.** Worker, D1, R2, dan widget Turnstile dibuat di akun yang memegang zona `kammi.id`, dengan paket **Workers Paid** sejak peluncuran sampai pembongkaran. Paket Free ditolak karena batas CPU 10 ms per request.
2. **Domain.** `https://kpu.kammi.id` sebagai Custom Domain Worker. `workers_dev: false` dan `preview_urls: false`. Halaman `/kpu` situs utama tidak lagi terjangkau lewat subdomain ini.
3. **Semua fitur hidup pada 17 September 2026 pukul 00.00 WIB**, termasuk editor Peraturan, Berkas Publik, onboarding, ekspor harian, tombol hapus data akun, dan penghapusan otomatis beserta tahap Selesai.
4. **Peraturan.** Satu dokumen Markdown di D1, diedit Admin di `/admin/peraturan` (textarea dan pratinjau), simpan menimpa tanpa riwayat, dapat diedit di semua tahap. Render tanpa HTML mentah; tautan hanya `http(s)`, `mailto`, atau relatif. Sebelum disimpan pertama kali, `/peraturan` menampilkan "Menyusul". `/jadwal` tetap konstanta kode. Tidak ada bagian berita atau pengumuman.
5. **Berkas Publik.** Dikelola di `/admin/peraturan`. Setiap berkas punya judul, kategori `peraturan` atau `formulir`, dan urutan. PDF atau DOCX, maksimal 20 MiB, divalidasi ekstensi + MIME + signature (`%PDF-` atau `PK\x03\x04`). Kunci R2 `publik/<UUIDv4>`. Unduh lewat Worker **tanpa sesi** dengan `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`. `/peraturan` menampilkan kategori `peraturan`; `/unduhan` menampilkan kategori `formulir`. Hapus keras.
6. **`/tentang`.** Statik dari `src/content/tentang.md` dengan aset di `public/tentang/`. Markdown ini memuat profil KPU dan **kanal resmi**: satu nomor WhatsApp dan satu email. Penegasan tiadanya hubungan dengan penyelenggara pemilihan umum nasional adalah komponen tetap di footer seluruh rute, bukan bagian Markdown.
7. **Pemberitahuan persetujuan.** `src/content/persetujuan-v1.md`, dirancang developer dari unsur tiket 03, menautkan `/tentang` untuk kanal resmi, dan mencantumkan tanggal penghapusan 25 Januari 2027. Nilai `persetujuanVersi` = `persetujuan-v1`.
8. **Onboarding Admin.** `/onboard` aktif hanya bila tidak ada baris `role = 'admin'` **dan** secret `ONBOARD_TOKEN` terpasang. Token dibandingkan dengan pola aman terhadap timing (hash SHA-256 lalu `crypto.subtle.timingSafeEqual`). Isian: nama tampilan, email, kata sandi minimal 12 karakter. Setelah berhasil, rute mengembalikan 404 permanen. Tidak ada rotasi kata sandi Admin.
9. **Pemulihan Admin.** Operator menghapus baris Admin, memasang `ONBOARD_TOKEN` baru, lalu Pemegang Admin menjalankan onboarding ulang (lihat runbook).
10. **Reset Password.** Tombol di `/admin/:id` membuka dialog konfirmasi yang meminta kata sandi Admin dan diverifikasi server. Kata sandi baru 16 karakter dari `crypto.getRandomValues` dengan alfabet tanpa karakter ambigu (tanpa `0 O o 1 l I`), ditampilkan sekali dengan tombol salin dan langsung dapat dipakai login. Seluruh sesi akun sasaran dicabut. Lima kegagalan konfirmasi berturut-turut mencabut sesi Admin tersebut (penghitung di `percobaanLogin` dengan kunci `konfirmasi:<HMAC sesiId>`). Tersedia di semua tahap. Pencocokan identitas peminta dilakukan Admin secara manual di luar aplikasi.
11. **Penutupan akun.** Tabel `/admin` menampilkan penanda **Minta ditutup** untuk `banned = 1 AND banReason = 'penutupan_akun'`. Hanya untuk akun itu, `/admin/:id` menampilkan tombol **Hapus data akun** dengan konfirmasi kata sandi Admin yang sama. Tombol menjalankan prosedur penghapusan data akun tiket 05, menghapus `ekspor/terkini/<userId>.zip` dan `ekspor/pemeriksaan/<userId>.zip`, dan menulis ulang kedua CSV tanpa baris akun itu.
12. **Ekspor harian.** Cron Trigger `0 17 * * *` (00.00 WIB). Setiap run menulis `ekspor/terkini/bacalon.csv` dan `ekspor/terkini/<userId>.zip` per Bakal Calon Ketua Umum (data, berkas, manifest SHA-256; ZIP metode *store* tanpa kompresi), dialirkan ke R2 dengan multipart dan menimpa versi sebelumnya, lalu mencatat audit `ekspor_harian`. `/admin/ekspor` dan `/admin/:id` hanya mengunduh hasil terakhir; tidak ada generate saat diminta. Unduhan dicatat `ekspor`. Tanpa enkripsi.
13. **Snapshot Pemeriksaan.** Run pada 5 Oktober 2026 pukul 00.00 WIB (4 Oktober 17.00 UTC) juga menyalin hasilnya ke `ekspor/pemeriksaan/` satu kali; objek ini tidak pernah ditimpa. `/admin/ekspor` menyediakan unduhan "Terkini" dan "Pemeriksaan".
14. **Penghapusan Akhir.** Setiap run pada atau setelah 25 Januari 2027 pukul 00.00 WIB menghapus seluruh objek R2 (`berkas/`, `ekspor/`, `publik/`) dan seluruh baris semua tabel, termasuk Peraturan dan audit, tanpa konfirmasi dan tanpa pemberitahuan individual. Run yang sama menyisipkan **satu** audit `hapus_data` beraktor `Sistem` dengan `keterangan` berisi jumlah baris per tabel dan jumlah objek R2 yang dihapus. Run berikutnya mengulang penghapusan bila masih ada sisa, tetapi tidak menyisipkan audit kedua.
15. **Tahap Selesai.** State machine tiket 02 mendapat tahap keenam: **Selesai**, mulai 25 Januari 2027 pukul 00.00 WIB, diturunkan dari jam seperti tahap lain. Semua rute menampilkan "Proses penjaringan telah selesai dan data telah dihapus"; registrasi, login, dan seluruh API ditolak.
16. **Binding, secret, dan lingkungan.** Hanya produksi dan lokal, tanpa staging. Resource dibuat eksplisit, bukan provisioning otomatis.

| Jenis | Nama | Nilai / sumber |
| --- | --- | --- |
| D1 | binding `DB` | database `kpu-kammi-2026` |
| R2 | binding `BERKAS` | bucket `kpu-kammi-2026-berkas`, r2.dev nonaktif, tanpa domain publik |
| Var | `BETTER_AUTH_URL` | `https://kpu.kammi.id` |
| Var | `TURNSTILE_SITE_KEY` | widget Turnstile |
| Secret | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| Secret | `HMAC_SECRET` | `openssl rand -base64 32` |
| Secret | `TURNSTILE_SECRET_KEY` | widget Turnstile |
| Secret sementara | `ONBOARD_TOKEN` | `openssl rand -base64 24`; dihapus setelah onboarding |
| Cron | `triggers.crons` | `["0 17 * * *"]` |
| Observability | `observability.traces.enabled` | `true`; log tanpa body formulir, nama berkas, atau token |

Lokal memakai `.dev.vars` (sudah di-`.gitignore`) dengan kunci uji Turnstile, dan `wrangler dev --test-scheduled` untuk menguji cron.

### Amandemen tiket sebelumnya

- **Model Operasi dan Kebijakan Pendaftaran:** tambah tahap keenam Selesai (keputusan 15).
- **Identitas Keamanan dan Siklus Data:**
  - pemulihan Admin lewat onboarding ulang (keputusan 9);
  - reset kata sandi menampilkan kata sandi baru kepada Admin, bukan dikirim lewat kanal resmi oleh sistem (keputusan 10);
  - ekspor disimpan di R2 dan dibuat harian tanpa enkripsi, menggantikan "dibuat sesuai permintaan, tidak disimpan permanen, media terenkripsi" (keputusan 12–13);
  - penghapusan pada 25 Januari 2027 berjalan otomatis tanpa menunggu konfirmasi serah-terima, penyelesaian sengketa, atau pemberitahuan subjek data (keputusan 14);
  - kanal resmi = WhatsApp dan email di `/tentang` (keputusan 6).
- **Blueprint Pengalaman Tiga Peran:**
  - rute baru `/onboard` dan `/admin/peraturan`;
  - penanda Minta ditutup dan tombol Hapus data akun;
  - `/admin/ekspor` mengunduh hasil harian;
  - footer tetap;
  - tahap Selesai;
  - acceptance butir 26–35 di bawah.
- **Skema Data dan Kontrak Penyimpanan:** perubahan DDL berikut dimasukkan ke `migrations/0001_init.sql` yang sama, karena migrasi belum pernah diterapkan.

```sql
-- Tambahkan setelah CREATE TABLE "user": paling banyak satu Admin, juga saat onboarding bersamaan
CREATE UNIQUE INDEX "user_satuAdmin_idx" ON "user" ("role") WHERE "role" = 'admin';

-- Ganti definisi "audit" dari tiket 05
CREATE TABLE "audit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "waktu" DATE NOT NULL,
  "sesiId" TEXT,
  "aktor" TEXT NOT NULL CHECK ("aktor" IN ('Admin bersama', 'Bakal Calon Ketua Umum', 'Anonim', 'Sistem')),
  "aktorUserId" TEXT,
  "tindakan" TEXT NOT NULL CHECK ("tindakan" IN ('login', 'registrasi', 'reset_kata_sandi', 'unggah_berkas', 'hapus_berkas', 'ubah_data', 'ekspor', 'penutupan_akun', 'hapus_data', 'onboarding_admin', 'ubah_peraturan', 'unggah_berkas_publik', 'hapus_berkas_publik', 'ekspor_harian')),
  "sasaranUserId" TEXT,
  "sasaranBerkasId" TEXT,
  "hasil" TEXT NOT NULL CHECK ("hasil" IN ('berhasil', 'gagal', 'ditolak')),
  "keterangan" TEXT CHECK ("keterangan" IS NULL OR "aktor" = 'Sistem')
);
CREATE INDEX "audit_waktu_idx" ON "audit" ("waktu");

-- Tabel baru
CREATE TABLE "peraturan" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "isiMarkdown" TEXT NOT NULL CHECK (length("isiMarkdown") <= 400000),
  "diubahPada" DATE NOT NULL
);

CREATE TABLE "berkasPublik" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kategori" TEXT NOT NULL CHECK ("kategori" IN ('peraturan', 'formulir')),
  "judul" TEXT NOT NULL,
  "urutan" INTEGER NOT NULL,
  "r2Key" TEXT NOT NULL UNIQUE CHECK ("r2Key" GLOB 'publik/????????-????-4???-????-????????????'),
  "namaAsli" TEXT NOT NULL,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  "ukuranByte" INTEGER NOT NULL CHECK ("ukuranByte" BETWEEN 1 AND 20971520),
  "diunggahPada" DATE NOT NULL
);
CREATE INDEX "berkasPublik_kategori_urutan_idx" ON "berkasPublik" ("kategori", "urutan");
```

Kunci R2 `ekspor/terkini/…` dan `ekspor/pemeriksaan/…` tidak dipetakan di D1; namanya tetap dan diturunkan dari `userId`.

### Checklist peluncuran — selesai sebelum 17 September 2026 pukul 00.00 WIB

**A. Akses — Pemilik zona**

1. Undang Operator ke akun Cloudflare yang memuat zona `kammi.id` sebagai Administrator.
2. Aktifkan Workers Paid di akun itu.
3. Pemilik produk, sebagai pengelola situs utama, menerima bahwa `kpu.kammi.id` akan dilayani Worker terpisah dan tidak lagi mengikuti wildcard.

**B. Konten — Pemilik produk dan developer**

4. Pemilik produk meng-commit `src/content/tentang.md` beserta aset `public/tentang/` paling lambat 16 September pukul 18.00 WIB. Jika belum ada, halaman menampilkan "Menyusul"; footer tetap tampil.
5. Developer meng-commit `src/content/persetujuan-v1.md`.

**C. Resource — Operator**

6. `npx wrangler login`, lalu `npx wrangler whoami` menampilkan akun pemilik zona `kammi.id`.
7. `npx wrangler d1 create kpu-kammi-2026`; tulis `database_id` ke binding `DB` di `wrangler.json`.
8. `npx wrangler r2 bucket create kpu-kammi-2026-berkas`; tulis ke binding `BERKAS`. `npx wrangler r2 bucket dev-url get kpu-kammi-2026-berkas` harus menyatakan nonaktif.
9. Dashboard → Turnstile → Add widget: nama `kpu-kammi-2026`, hostname `kpu.kammi.id`, mode Managed. Site key → var `TURNSTILE_SITE_KEY`.
10. Lengkapi `wrangler.json`: `routes: [{ "pattern": "kpu.kammi.id", "custom_domain": true }]`, `workers_dev: false`, `preview_urls: false`, `triggers.crons`, `vars`, `observability.traces.enabled: true`. Jalankan `npm run cf-typegen`.
11. `npx wrangler d1 migrations apply kpu-kammi-2026 --remote`.
12. `npm run check`, lalu `npm run deploy`. Worker dengan secret yang belum terpasang wajib menolak onboarding dan autentikasi, bukan crash terbuka.
13. `npx wrangler secret put` secara interaktif untuk `BETTER_AUTH_SECRET`, `HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, `ONBOARD_TOKEN`. Nilai tidak pernah ditulis di argumen, repo, atau log.
14. `curl -sI https://kpu.kammi.id` tidak lagi memuat `x-middleware-rewrite`, dan situs menampilkan spanduk tahap Belum dibuka.

**D. Admin — Operator dan Pemegang Admin**

15. Operator menyerahkan `ONBOARD_TOKEN` kepada Pemegang Admin secara langsung.
16. Pemegang Admin membuka `https://kpu.kammi.id/onboard` dan membuat akun Admin.
17. Operator menjalankan `npx wrangler secret delete ONBOARD_TOKEN`; `/onboard` mengembalikan 404.
18. Admin mengisi Peraturan dan mengunggah PDF PKPU (kategori `peraturan`) serta Formulir A.1 sampai A.6 dalam PDF/DOCX (kategori `formulir`). Sebelum terisi, halaman menampilkan "Menyusul".

**E. Verifikasi**

19. Acceptance butir 1–25 tiket 04 dan butir 26–35 di bawah lulus. Perilaku yang bergantung waktu diuji lokal dengan jam yang disuntikkan.
20. Tidak membuat akun uji di produksi. Pada 17 September pukul 00.00–00.15 WIB, Operator memastikan spanduk berganti ke Masa Pendaftaran dan tombol `Daftar` aktif.

### Acceptance tambahan

26. `/onboard` menolak token salah, menolak bila `ONBOARD_TOKEN` tidak terpasang, dan 404 bila Admin sudah ada. Dua onboarding bersamaan hanya menghasilkan satu Admin.
27. Reset Password menolak kata sandi Admin yang salah; kegagalan kelima berturut-turut mencabut sesi Admin. Kata sandi baru 16 karakter tampil sekali dan langsung dapat dipakai login.
28. Markdown Peraturan yang memuat `<script>`, atribut `on*`, atau tautan `javascript:` tidak dieksekusi dan tidak dirender sebagai HTML.
29. Berkas Publik hanya menerima PDF/DOCX ≤ 20 MiB, dapat diunduh tanpa sesi sebagai attachment; `/unduhan` hanya menampilkan kategori `formulir`.
30. Tombol Hapus data akun hanya muncul untuk akun berpenanda Minta ditutup, menuntut kata sandi Admin, dan menghapus baris D1, objek `berkas/`, kedua ZIP ekspor akun itu, serta barisnya di kedua CSV.
31. Handler terjadwal menulis `ekspor/terkini/` dan audit `ekspor_harian`. Run 5 Oktober 00.00 WIB menyalin ke `ekspor/pemeriksaan/` satu kali; run berikutnya tidak menimpanya.
32. Run pertama pada atau setelah 25 Januari 2027 00.00 WIB mengosongkan R2 dan seluruh tabel serta menyisakan tepat satu audit `hapus_data` beraktor `Sistem`; run berikutnya tidak menambah audit.
33. Pada tahap Selesai seluruh rute menampilkan pesan selesai; registrasi, login, dan API ditolak.
34. Footer penegasan tampil di setiap rute publik, akun, dan Admin.
35. `kpu.kammi.id` dilayani Worker; `workers.dev`, Preview URL, dan r2.dev tidak aktif.

### Runbook operasi

- **Reset kata sandi Bakal Calon Ketua Umum:** Admin mencocokkan identitas peminta secara manual lewat kanal resmi, lalu memakai tombol Reset Password dan menyampaikan kata sandi yang tampil.
- **Penutupan akun:** Admin memeriksa penanda Minta ditutup di `/admin` minimal sekali sehari dan menekan Hapus data akun paling lambat 3×24 jam sejak permintaan.
- **Ekspor:** Admin mengunduh "Terkini" atau "Pemeriksaan" dari `/admin/ekspor` kapan pun diperlukan. Bila audit `ekspor_harian` hari itu tidak ada atau `gagal`, Admin melapor ke Operator, yang memeriksa Workers Logs.
- **Pemulihan Admin** (atas permintaan tertulis Ketua KPU):
  1. `npx wrangler d1 execute kpu-kammi-2026 --remote --command "DELETE FROM \"user\" WHERE \"role\" = 'admin'"` (sesi dan akun ikut terhapus; audit tetap).
  2. `npx wrangler secret put ONBOARD_TOKEN`.
  3. Langkah D15–D17.

### Penghentian

1. **25 Januari 2027, 00.00 WIB — otomatis.** Penghapusan Akhir dan tahap Selesai (keputusan 14–15). Tidak ada tindakan manusia.
2. **Setelah 24 Februari 2027 — Operator, tanpa menunggu konfirmasi:**
   1. Simpan keluaran `npx wrangler d1 execute kpu-kammi-2026 --remote --command "SELECT * FROM audit"` (satu baris non-pribadi) dan serahkan kepada KPU.
   2. `npx wrangler delete kpu` (ikut melepas Custom Domain).
   3. `npx wrangler d1 delete kpu-kammi-2026`.
   4. `npx wrangler r2 bucket delete kpu-kammi-2026-berkas`.
   5. Hapus widget Turnstile `kpu-kammi-2026` di dashboard.
   6. Pemilik produk, sebagai pengelola situs utama, memastikan `kpu.kammi.id` kembali dilayani wildcard sesuai kebutuhan situs utama.
3. Penghapusan dinyatakan tuntas pada 24 Februari 2027, saat jendela Time Travel D1 30 hari berakhir.

### Keterbatasan yang diterima secara sadar

- Paket ekspor berisi data pribadi tersimpan tanpa enkripsi di R2 sampai 25 Januari 2027 dan di perangkat setiap pengunduh, di luar kendali aplikasi.
- Penghapusan Akhir tidak memeriksa sengketa atau serah-terima; data tidak tersedia untuk sengketa setelah tanggal itu. Subjek data tidak diberi pemberitahuan individual; tanggalnya hanya tercantum di pemberitahuan persetujuan dan spanduk akun.
- Kredensial Admin bersama tidak pernah dirotasi; pemegang yang keluar tetap mengetahuinya.
- Admin melihat kata sandi baru Bakal Calon Ketua Umum hasil reset.
- ZIP harian berjalan dalam satu invocation cron dengan batas CPU 15 menit; jika jumlah berkas membuatnya gagal, kegagalan terlihat dari audit `ekspor_harian`.
- Seluruh fitur, termasuk yang baru ditambahkan tiket ini, harus dibangun dan diverifikasi dalam waktu kurang dari sehari sebelum peluncuran.
