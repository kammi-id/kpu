---
name: KPU Muktamar XIV KAMMI 2026
description: Papan jadwal pelabuhan Ambon dalam tiga tinta kampanye Muktamar XIV.
colors:
  merah: "#dc0a0a"
  merah-tua: "#b00606"
  marun: "#8a0b10"
  hijau: "#056035"
  hijau-muda: "#e6f2eb"
  navy: "#06244c"
  putih: "#ffffff"
  muted: "#fbf3f2"
  muted-foreground: "#4a5872"
  accent: "#f8e7e6"
  border: "#eedada"
  input: "#e3c9c9"
typography:
  display:
    fontFamily: "Lilita One, Poppins, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.5rem, 8vw, 5.25rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Lilita One, Poppins, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "normal"
  title:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  ubin: "0.3rem"
  sm: "0.35rem"
  md: "0.6125rem"
  lg: "0.875rem"
  xl: "1rem"
  2xl: "1.225rem"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  panel-mobile: "20px"
  panel-desktop: "40px"
  measure: "76rem"
components:
  button-primary:
    backgroundColor: "{colors.merah}"
    textColor: "{colors.putih}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.merah-tua}"
  button-primary-lg:
    backgroundColor: "{colors.merah}"
    textColor: "{colors.putih}"
    rounded: "{rounded.xl}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
    rounded: "{rounded.xl}"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    height: "40px"
  button-ditutup-tahap:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.marun}"
    rounded: "{rounded.xl}"
    height: "48px"
  status-dibuka:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  status-ditutup:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.marun}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  ubin-flap:
    backgroundColor: "{colors.marun}"
    textColor: "{colors.putih}"
    typography: "{typography.display}"
    rounded: "{rounded.ubin}"
  panel-papan:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.navy}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  catatan-hijau:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
  header-publik:
    backgroundColor: "{colors.merah}"
    textColor: "{colors.putih}"
  footer-penegasan:
    backgroundColor: "{colors.marun}"
    textColor: "{colors.putih}"
    typography: "{typography.body}"
  input:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
    height: "44px"
---

# Design System: KPU Muktamar XIV KAMMI 2026

## Overview

**Papan Keberangkatan Pelabuhan Ambon.** Penjaringan dibaca seperti papan jadwal kapal di pelabuhan Ambon: sepuluh jadwal WIB, satu baris sedang berjalan, sisanya jelas terjadwal atau ditutup. Materialnya diambil dari identitas kampanye Muktamar XIV (#AleRasaBetaRasa): bidang merah bermotif, hijau KAMMI, putih enamel, huruf display tebal bertepi 3D, dan pita footer marun. Bentuk papan adalah struktur, bukan kostum. Kosakata pelabuhan (berangkat, dermaga, tiket) tidak pernah masuk ke salinan; salinan selalu memakai istilah [CONTEXT.md](CONTEXT.md).

Situs ini alat administrasi resmi, bukan poster. Energi kampanye hidup di **bingkai**: header merah, panel tahap, judul display, dan footer. **Area kerja** (formulir data A.1, daftar sepuluh kelompok berkas, tabel dan audit Admin) tenang di atas putih, memakai tangga tipe, tanda status, dan tombol yang sama tanpa bidang merah besar. Kaidahnya: semakin lama pengguna bekerja di satu layar, semakin sedikit merah di layar itu.

Mode per permukaan: rute publik adalah Read, rute akun dan Admin adalah Operate. Ponsel adalah alur utama. Setiap komposisi dirancang di lebar 390px lebih dulu.

Aset merek (sumber asli di `public/`, turunan web di `src/react-app/assets/brand/`):

| Aset | Berkas web | Pakai untuk |
| --- | --- | --- |
| Logo PP KAMMI | `kammi.webp` | Header, berpasangan dengan teks "Pengurus Pusat / Kesatuan Aksi Mahasiswa Muslim Indonesia" |
| Lockup Muktamar XIV (tanda + "Muktamar KAMMI XIV") putih / warna | `muktamar-xiv-lockup-putih.webp`, `muktamar-xiv-lockup-warna.webp` | Header dan footer; putih di atas merah atau marun, warna di atas putih |
| Ornamen tonal | `ornamen.svg` | Mask tonal di atas bidang merah atau marun. Ini tile geometris sementara; ganti dengan berkas pola asli kampanye bila sudah tersedia |

Foto per anggota (Tentang.tsx) dan ilustrasi hero dipakai lewat `ResponsiveImage` — varian avif/webp/png digenerate saat build dari `src/react-app/assets/illustrations/` dan `members/` (lihat `scripts/buatGambarResponsif.mjs`), bukan diimpor langsung.

## Colors

Tiga tinta, dengan nilai merah, hijau, dan navy diambil dari logo Muktamar XIV.

- **Merah Muktamar `#dc0a0a`**: bidang header dan hero publik, tombol utama, baris "Berjalan" di papan jadwal. Pada rute publik, merah menguasai sedikitnya sepertiga layar sebagai bidang, bukan aksen yang ditabur. Pada area kerja, merah hanya tombol utama dan tanda galat.
- **Merah tua `#b00606`**: hover tombol utama dan teks galat.
- **Marun `#8a0b10`**: footer penegasan, ubin split-flap, tepi 3D judul display, dan teks status ditutup.
- **Hijau KAMMI `#056035`**: status terbuka ("Pendaftaran dibuka", "Hadir", "Lengkap"), kotak catatan, tombol sekunder, dan warna seleksi teks. Hijau tidak pernah menyatakan keabsahan.
- **Hijau muda `#e6f2eb`**: latar baris berkas yang hadir di area kerja.
- **Navy `#06244c`**: seluruh teks di atas putih dan ring fokus. Navy tidak pernah menjadi bidang.
- **Putih `#ffffff`**: dasar halaman dan panel enamel. Netral lain diwarnai dari merah (`muted #fbf3f2`, `accent #f8e7e6`, `border #eedada`, `input #e3c9c9`) dan tidak pernah abu-abu dingin.

Teks kecil di atas merah, hijau, dan marun selalu putih penuh; putih transparan di atas merah gagal kontras. Tidak ada gradien, dan tidak ada warna keempat (biru laut logo tidak dipakai di antarmuka). Tidak ada tema gelap: situs dipakai di ponsel pada siang hari dan di laptop sekretariat.

## Typography

- **Display: Lilita One** (`font-display`), dari keluarga huruf poster kampanye. Dipakai untuk judul halaman publik, ubin split-flap, dan judul besar layar status. Judul poster ditulis kapital dengan tepi 3D marun (`text-shadow` bertingkat 0.02–0.08em ke bawah). Judul area kerja memakai Lilita tanpa tepi 3D dan tanpa kapital. Jangan pakai Lilita di bawah 1.5rem atau untuk paragraf.
- **Isi: Poppins** 400/500/600/700 (`font-sans`), sans geometris dari salinan unggahan kampanye. Isi 15–16px, tinggi baris 1.6, lebar baris maksimal 56–70ch.
- **Label: Poppins 700 kapital, tracking 0.08em.** Hanya sebagai kepala kolom papan atau tabel (misalnya "Tahap berjalan", "Jadwal resmi") yang duduk di atas garis navy 2px. Jangan dipakai sebagai eyebrow di atas judul.
- **Angka:** tanggal, jam, ukuran berkas, dan `x/10` selalu `tabular-nums`.
- Tangga peringkat: satu langkah ukuran per tingkat. Baris atau berkas yang sedang berjalan paling besar, yang lain turun satu anak tangga. Jangan membedakan peringkat dengan dekorasi.

## Layout

- Lebar isi maksimal `76rem`, gutter samping 16px di ponsel dan 32px di desktop.
- **Beranda publik:** hero merah (logo, judul display, fakta Muktamar), lalu panel papan putih yang menumpang batas merah-putih. Kiri berisi tahap berjalan, kanan jadwal resmi, dan keduanya bertumpuk di ponsel. Di bawahnya tiga pintu Peraturan, Jadwal, dan Unduhan sebagai baris besar, catatan hijau privasi, dan footer marun.
- **Rute akun Bakal Calon:** spanduk tahap (versi ringkas panel papan) di atas setiap halaman. Di desktop, sidebar kiri memuat `x/10` dan label kelengkapan; di ponsel sidebar menjadi strip ringkas di bawah spanduk. Area formulir dan berkas berada di atas putih.
- **Rute Admin:** header putih bergaris merah tipis, tabel padat penuh lebar, dan detail satu kolom. Tanpa hero merah.
- Spasi berirama 4px (skala Tailwind). Ruang di atas judul lebih besar daripada di bawahnya.
- Breakpoint mengikuti Tailwind (`sm` 640px, `lg` 1024px). Komposisi dua kolom panel papan mulai di `lg`.

## Elevation & Depth

Kedalaman hanya satu: **panel enamel** yang terangkat dari bidang merah, dengan bayangan hangat dan lembut `0 28px 60px -28px rgb(70 0 8 / 0.55), 0 2px 8px rgb(70 0 8 / 0.14)`. Tombol utama membawa bibir marun `0 2px 0` agar terasa seperti pelat yang bisa ditekan. Ubin split-flap membawa bayangan dalam `inset 0 -0.2em 0 rgb(0 0 0 / 0.18)` dan garis belah horizontal 1px di tengah. Satu elemen memakai garis tepi atau bayangan, tidak keduanya. Tidak ada kaca atau blur.

## Shapes

- Panel papan dan kotak catatan: sudut 16–20px (`rounded-2xl`). Tombol: `rounded-xl`. Input: `rounded-lg`. Pil status: `rounded-lg`.
- Ubin split-flap: 0.3rem, rasio 5:7, dengan garis belah horizontal di tengah.
- Garis kepala kolom: navy 2px. Pemisah baris: `border` 1px merah pucat.
- Foto potongan (cutout) boleh memakai garis luar putih seperti stiker di unggahan kampanye, hanya di rute publik.
- Ornamen tonal hanya muncul di bidang merah atau marun sebagai mask berwarna gelap tipis, tidak pernah di atas putih atau di belakang teks isi.

## Components

- **Tombol** (`src/components/ui/button.tsx`): default tinggi 40px, `lg` 48px untuk tindakan utama di ponsel. Varian `default` merah dengan bibir marun, `secondary` hijau, `outline` putih bertepi, `ghost` untuk tindakan tersier. Ikon Lucide 16px (20px pada `lg`).
- **Tombol ditutup tahap:** tindakan yang ditolak tahap tetap tampil, tidak disembunyikan dan tidak sekadar dipudarkan. Latarnya arsiran diagonal `repeating-linear-gradient(135deg, muted 0 7px, accent 7px 14px)`, teks marun 70%, ikon gembok, `focusableWhenDisabled`, dan `aria-describedby` ke kalimat alasan tertulis di bawahnya.
- **Ubin split-flap:** nama tahap berjalan dalam huruf kapital, satu ubin per huruf, ukuran fluid dari lebar kontainer (`@container`, kata terpanjang mengisi lebar). Saat dimuat, huruf berputar acak lalu mengunci dari kiri ke kanan sekali (±42ms per tik). Dengan `prefers-reduced-motion`, ubin langsung statis. Ubin `aria-hidden`; nama tahap juga ditulis sebagai teks untuk pembaca layar. Hanya satu papan flap per layar.
- **Status bernama:** status selalu berupa ikon dan teks, tidak pernah warna saja. `Pendaftaran dibuka` / `Hadir` / `Lengkap` memakai pil hijau dengan ikon centang. `Pendaftaran ditutup` / `Belum ada` / `Belum lengkap` memakai pil accent dengan teks marun dan ikon gembok atau jam. Label `Lengkap` selalu disertai penjelasan "berkas yang disyaratkan telah berada di sistem".
- **Baris jadwal:** ikon status (centang untuk selesai, titik penuh untuk berjalan, cincin untuk terjadwal), nama tahap, rentang WIB tabular, dan label status. Baris berjalan memakai bidang merah dengan teks putih dan `aria-current="step"`.
- **Kotak catatan hijau:** pernyataan penting yang bukan galat, misalnya "Situs ini tidak menayangkan data Bakal Calon Ketua Umum". Teks putih di atas hijau.
- **Footer penegasan:** pita marun di setiap rute. Isinya lockup Muktamar putih, kalimat bahwa KPU adalah badan internal Muktamar KAMMI yang tidak berhubungan dengan penyelenggara pemilihan umum nasional, dan tautan `kammi.id`.
- **Input dan formulir:** tinggi 44px, label terlihat di atas field, caret merah, ring fokus navy. Galat ditulis sebagai kalimat merah tua yang menyebut masalah dan cara memperbaikinya.
- **Permukaan peramban:** seleksi teks hijau dengan teks putih, caret merah, scrollbar merah di atas muted, `underline-offset` 0.2em.

## Do's and Don'ts

**Do**

- Pakai logo asli dari `src/react-app/assets/brand/`, tanpa diwarnai ulang, diputar, atau diberi efek.
- Tunjukkan tahap berjalan dan alasan setiap tindakan yang tertutup sebelum pengguna mencoba.
- Biarkan merah menguasai bingkai publik, dan biarkan area kerja tenang di atas putih.
- Tulis status sebagai tanda ditambah teks, dan semua waktu dalam WIB dengan angka tabular.
- Uji setiap layar di lebar 390px dengan salinan asli sebelum desktop.

**Don't**

- Jangan menulis label `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`, `Calon Ketua Umum` sebagai status, `kirim pendaftaran`, `kandidat`, atau `KPU RI`.
- Jangan membawa kosakata pelabuhan ke salinan, dan jangan membuat logo tiruan atau ilustrasi pengganti.
- Jangan menaruh eyebrow atau kicker di atas judul, kartu ikon seukuran sebagai struktur halaman, gradien, kaca, atau bayangan blok tanpa blur.
- Jangan memakai Lilita One untuk paragraf atau teks di bawah 1.5rem, dan jangan memakai putih transparan untuk teks di atas merah.
- Jangan menampilkan foto per anggota dengan nama atau jabatan karangan.
- Jangan membuat tema gelap atau warna keempat.
