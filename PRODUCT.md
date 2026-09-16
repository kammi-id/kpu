# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Istilah mengikuti [CONTEXT.md](CONTEXT.md).

- **Anggota Biasa III (AB 3) KAMMI yang mendaftar sebagai Bakal Calon Ketua Umum.**
  Mereka membuat akun, mengisi data pribadi A.1, dan mengunggah sepuluh
  kelompok berkas dalam Masa Pendaftaran (17 Sep–4 Okt 2026) dan Masa
  Perbaikan (8–11 Okt 2026). Perangkatnya campuran, dengan ponsel sebagai
  perangkat utama: banyak berkas difoto atau dipindai lalu diunggah dari
  galeri, sedangkan sebagian pendaftar memakai laptop. Seluruh alur akun dan
  unggah harus lengkap dan nyaman di layar kecil.
- **Admin bersama.** Satu akun Admin dipakai bersama oleh beberapa anggota KPU
  untuk memantau Status Kelengkapan Berkas, mengunduh berkas untuk pemeriksaan
  manual, mereset kata sandi, memproses Permintaan Penutupan Akun, mengelola
  Peraturan dan Berkas Publik, serta mengunduh Ekspor Harian.
- **Pengunjung publik.** Kader KAMMI dan pihak yang ingin tahu. Mereka membaca
  tahap yang sedang berjalan, ringkasan PKPU, dan jadwal resmi, lalu mengunduh
  Formulir A.1–A.6 tanpa akun.

## Product Purpose

Website resmi Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026 di
`https://kpu.kammi.id` untuk penjaringan Calon Ketua Umum PP KAMMI. Situs ini
menjadi satu tempat untuk informasi publik penjaringan, pendaftaran mandiri
Bakal Calon Ketua Umum, dan kerja administrasi KPU atas data serta berkasnya.

Keberhasilan berarti:

- pendaftaran dibuka tepat 17 September 2026 pukul 00.00 WIB;
- setiap Bakal Calon dapat mengetahui sendiri berkas mana yang belum ada di
  sistem;
- KPU memiliki berkas dan Snapshot Pemeriksaan untuk verifikasi manual;
- seluruh data pribadi terhapus tuntas pada Penghapusan Akhir, 25 Januari
  2027.

Spesifikasi lengkap ada di
[.scratch/kpu-kammi-2026-website/spec.md](.scratch/kpu-kammi-2026-website/spec.md).

## Positioning

Ini alat administrasi berumur pendek, bukan portal kampanye atau kanal
pengumuman. Aplikasi hanya mencatat **keberadaan** berkas (`x/10`, `Lengkap` /
`Belum lengkap`). Keabsahan berkas, kelulusan, dan penetapan Calon Ketua Umum
tetap menjadi keputusan manusia di KPU. Situs tidak pernah menayangkan data
Bakal Calon kepada publik, dan seluruh perilakunya dikendalikan jam WIB
melalui enam tahap.

## Operating Context

- Enam tahap berbasis waktu WIB menentukan apa yang boleh dilakukan: Belum
  dibuka, Masa Pendaftaran, Pemeriksaan (5–7 Okt), Masa Perbaikan, Terkunci
  (mulai 12 Okt), dan Selesai (mulai 25 Jan 2027). Spanduk tahap tampil di
  beranda dan di setiap halaman akun. Tombol yang tertutup tahap tetap
  terlihat, dalam keadaan nonaktif, beserta alasannya.
- Berkas yang dikelola: Formulir A.1–A.6, karya tulis ilmiah (PDF saja),
  rekomendasi A.3 dari PW atau A.4 dari PD, dan bukti transfer. Setiap kelompok
  berisi paling banyak 5 berkas, masing-masing ≤ 20 MiB.
- Tidak ada email, notifikasi, maupun reset kata sandi mandiri. Pemulihan akses
  berlangsung lewat kanal resmi KPU (satu WhatsApp dan satu email), yang
  ditangani Admin.
- Setiap simpan yang berhasil langsung menjadi keadaan terkini. Tidak ada
  langkah "kirim pendaftaran".

## Capabilities and Constraints

- Sitemap tetap mengikuti Varian A (situs dokumen):
  - **Publik:** `/`, `/peraturan`, `/jadwal`, `/unduhan`, `/tentang`, serta
    `/masuk` dan `/daftar` sebagai satu gerbang dengan dua tab.
  - **Bakal Calon:** `/akun`, `/akun/data`, `/akun/berkas`, `/akun/berkas/:no`,
    `/akun/pengaturan`.
  - **Admin:** `/admin`, `/admin/:id`, `/admin/ekspor`, `/admin/audit`,
    `/admin/peraturan`, dan `/onboard`.
- Stack: satu Cloudflare Worker (Hono dan SPA React 19 + Vite) dengan D1, R2
  privat, Better Auth, dan Turnstile. UI dibangun dari komponen shadcn (Base
  UI) dan kelas Tailwind, termasuk nilai arbitrer, tanpa CSS tulisan tangan.
- Seluruh salinan berbahasa Indonesia dan memakai istilah CONTEXT.md. Label
  berikut dilarang: `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`,
  `Calon Ketua Umum` sebagai status, `kirim pendaftaran`, `kandidat`, dan
  `KPU RI`.
- Setiap halaman memuat footer yang menegaskan bahwa KPU tidak berhubungan
  dengan penyelenggara pemilihan umum nasional.
- Pada tahap Selesai, seluruh situs digantikan satu layar yang menyatakan bahwa
  proses telah selesai dan datanya telah dihapus.
- Di luar lingkup: pemungutan suara, validasi keabsahan, pengumuman atau
  berita, pratinjau berkas inline, dan penayangan data Bakal Calon ke publik.

## Brand Commitments

- Situs wajib memakai logo resmi KAMMI/Muktamar. Asetnya **menyusul** dari
  pemilik produk. Sampai logo tersedia, jangan membuat logo tiruan atau
  pengganti bergambar; pakai nama lembaga sebagai teks.
- Nama lembaga ditulis Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026,
  dan tidak pernah dikaitkan dengan KPU RI.
- Nada: formal tetapi hangat. Pakai bahasa Indonesia baku yang menyapa dan
  memandu langkah demi langkah. Hindari gaya kampanye maupun sapaan terlalu
  akrab.

## Evidence on Hand

- [CONTEXT.md](CONTEXT.md): glosarium resmi dan tanggal tahap.
- [.scratch/kpu-kammi-2026-website/spec.md](.scratch/kpu-kammi-2026-website/spec.md)
  beserta tiket 01–19: keputusan produk, keamanan, data, dan peluncuran.
- Prototipe tata letak Varian A di branch `prototype/blueprint-tiga-peran`
  (commit `d9ade51`). Prototipe ini hanya acuan, bukan kode untuk disalin.
- **Belum ada:** logo KAMMI, isi `tentang.md` beserta asetnya, teks Peraturan,
  PDF PKPU, dan Formulir A.1–A.6. Semua disediakan pemilik produk atau Admin.
  Tampilkan "Menyusul" bila belum tersedia, dan jangan mengarang isinya.

## Product Principles

- **Jujur tentang status.** Label dan salinan tidak boleh menyiratkan
  keabsahan, kelulusan, atau keputusan yang bukan wewenang aplikasi.
- **Tahap selalu terbaca.** Pengguna selalu tahu tahap yang sedang berjalan
  dan mengapa suatu tindakan tertutup, tanpa mencoba lebih dulu.
- **Ponsel sebagai alur utama.** Mengisi data dan mengunggah berkas harus
  tuntas dari ponsel.
- **Satu sumber angka.** `x/10` yang dilihat Bakal Calon, Admin, dan ekspor
  selalu sama.
- **Data pribadi seminimal dan sesingkat mungkin.** Tidak ada data Bakal Calon
  di ruang publik, dan semuanya hilang setelah Masa Retensi.

## Accessibility & Inclusion

Tidak ada standar formal yang ditetapkan. Kebutuhan yang sudah diketahui:
koneksi dan layar ponsel yang beragam, unggahan dari galeri ponsel, dan alasan
penolakan atau status nonaktif yang tertulis sebagai teks, tidak hanya lewat
warna.
