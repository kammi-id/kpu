# Beranda hasil verifikasi berkas

Status: disetujui pengguna pada 2 Oktober 2026; diimplementasikan dan diverifikasi lokal; belum di-deploy

## Permintaan yang sudah ditetapkan

- Beranda beralih dari ajakan pendaftaran ke unduhan surat pengumuman terlampir.
- Action button header menjadi link login.
- Judul `<title>` tetap: Penjaringan Calon Ketua Umum PP KAMMI — KPU Muktamar XIV.
- Judul halaman dan tulisan judul pada gambar OG: Hasil Verifikasi Berkas Bakal Calon Ketua Umum PP KAMMI.
- Penyempurnaan pengguna: judul dibagi menjadi dua blok, “Hasil Verifikasi Berkas” dan “Bakal Calon Ketua Umum PP KAMMI”; blok kedua lebih kecil. Diterapkan pada judul beranda dan gambar OG.
- Beranda memuat petunjuk langkah selanjutnya berdasarkan timeline.
- Halaman lain tetap sebagaimana adanya, kecuali tombol Masuk pada header publik bersama.

## Sumber yang diperiksa

- Surat: `/Users/radenpioneer/Downloads/Pengumuman Hasil Verifikasi KPU Muktamar KAMMI.pdf`, dua halaman, ditetapkan 2 Oktober 2026, nomor 03/KPU-MUKTAMAR-XIV/KAMMI/IX/2026.
- `CONTEXT.md`, ADR 0004, beranda, Header, metadata halaman, dan generator gambar OG.
- Surat memuat hasil resmi untuk 2 bacalon terverifikasi lengkap dan 12 bacalon perlu perbaikan. Ini berbeda dari Status Kelengkapan Berkas otomatis aplikasi dan belum merupakan penetapan final Calon Ketua Umum.
- PKPU 02: `/Users/radenpioneer/Downloads/PKPU 02 Muktamar KAMMI 2026.pdf`, tiga halaman, ditetapkan 26 September 2026. Pasal I angka 2 mengganti Lampiran I dan menetapkan Masa Perbaikan pada 3–5 Oktober 2026.
- Gambar jadwal `/Users/radenpioneer/Downloads/2.jpg` juga menetapkan Masa Perbaikan pada 3–5 Oktober 2026 dan penetapan final pada 6 Oktober 2026.

## Keputusan putaran 1

1. Q1: pengguna mengarahkan ke PKPU 02 dan gambar jadwal. Petunjuk beranda mengikuti 3–5 Oktober 2026. Batas harian 5 Oktober pukul 23.59 WIB berasal dari konvensi aplikasi yang sudah ada; PKPU 02 dan gambar hanya menetapkan tanggal. Surat pengumuman tetap utuh; konflik tanggal pada III.2 dicatat, bukan dibetulkan pada PDF.
2. Q2: disetujui. Tombol Masuk menuju `/masuk` berlaku pada seluruh header publik bersama, tidak bergantung pada status pendaftaran.
3. Q3: disetujui. Ilustrasi dan kartu Peraturan/Jadwal/Unduhan dipertahankan. Area pendaftaran diganti unduhan surat dan petunjuk dinamis. Surat tetap dapat diunduh setelah Masa Perbaikan berakhir, mengikuti batas tahap selesai aplikasi yang sudah ada.
4. Q4: disetujui. Judul OG/Twitter serta deskripsi beranda mengikuti tema hasil verifikasi; `<title>` dan metadata halaman lain tetap.

## Rancangan petunjuk untuk konfirmasi

- Pada 2 Oktober: “Unduh surat hasil verifikasi dan periksa status berkas Anda. Bagi bakal calon yang perlu perbaikan, siapkan dokumen untuk diunggah melalui akun pada 3–5 Oktober 2026.”
- Pada 3–5 Oktober: “Bagi bakal calon yang perlu perbaikan, masuk ke akun dan lengkapi berkas paling lambat 5 Oktober 2026 pukul 23.59 WIB. Penetapan dan pengumuman Calon Ketua Umum Tetap dijadwalkan pada 6 Oktober 2026.”
- Mulai 6 Oktober: “Masa perbaikan telah berakhir. Penetapan dan pengumuman Calon Ketua Umum Tetap dijadwalkan pada 6 Oktober 2026. Ikuti pengumuman resmi KPU untuk tahapan selanjutnya.” Tidak menyatakan penetapan telah terbit tanpa sumber baru.
- Tombol utama: “Unduh Surat Hasil Verifikasi”, unduhan publik PDF asli tanpa login. Login tersedia melalui header.
- PKPU 02 dan gambar berfungsi sebagai rujukan spesifikasi ini; pembaruan halaman Peraturan/Unduhan tidak termasuk ruang lingkup.
- Tidak menampilkan daftar nama/status individu di beranda dan tidak menambahkan pemetaan hasil surat ke akun.
- Hak edit seluruh akun bacalon pada Masa Perbaikan tetap mengikuti perilaku aplikasi saat ini; petunjuk ditujukan kepada bacalon yang perlu perbaikan menurut surat.

## Batas kerja

- Implementasi disetujui melalui jawaban “Disepakati”. PDF asli, jadwal, dan aturan akses akun dipertahankan.
- Perubahan lokal yang sudah ada pada Masuk.tsx dan AdminLayout.tsx tidak termasuk pekerjaan ini.
- Tidak membuat ADR baru untuk perubahan presentasi yang mudah dibalik; glossary diperbarui bila istilah baru telah disepakati.
- Skill grilling meminta konfirmasi kesepahaman sebelum implementasi.

## Implementasi dan verifikasi

- Beranda dan gambar OG memakai judul dua blok; blok kedua lebih kecil. PDF disalin ke `public/pengumuman/hasil-verifikasi-berkas-2026.pdf` dan tidak diubah.
- Metadata hasil verifikasi hanya ditulis ulang untuk `/`, dengan gambar OG tersendiri; gambar default dan metadata halaman lain tetap. Routing Workers dan pengecualian fallback service worker diselaraskan untuk beranda.
- Petunjuk menggunakan tahap dari `/api/tahap`, mengikuti jam server, tanpa perubahan gerbang akun. Loading/galat tahap tidak menutup akses unduhan.
- Build lengkap serta build aplikasi setelah penyempurnaan judul berhasil. Lint seluruh repo: 0 galat, 7 peringatan di berkas yang tidak diubah untuk fitur ini.
- `npm test`: 22 berkas dan 256 tes lulus, exit 0. Runtime menampilkan 37 unhandled rejection Better Auth yang sudah ditoleransi konfigurasi tes proyek; bukan kegagalan assertion.
- Tes metadata mencakup judul browser tetap, OG/Twitter beranda baru, metadata default rute lain tetap, revalidasi HTML, serta MIME dan SHA-256 unduhan PDF asli.
- Pemeriksaan visual dilakukan di browser bawaan VS Code pada desktop dan viewport 390px; gambar OG 1200×630 juga diperiksa. Pengujian perangkat seluler fisik dan produksi belum dilakukan.
- Pemeriksaan mekanis Impeccable untuk Beranda/Header tidak menghasilkan temuan. `git diff --check` bersih.

## Penyempurnaan yang disetujui

- Keputusan pengguna, 2 Oktober 2026: hasil verifikasi sudah diumumkan karena proses verifikasi berlangsung lebih cepat dari jadwal. Alasan ini hanya dicatat sebagai keputusan internal dan tidak ditampilkan di UI; jadwal tahapan yang disepakati tetap menjadi rujukan petunjuk.
- Pengumuman dan petunjuk tahap disatukan; SplitFlap berjudul “Hasil Verifikasi” dipertahankan di dalam blok gabungan. Judul pengumuman dan paragraf “Baca surat…” dihapus.
- Admin > Unggah Berkas menyediakan slot Hasil Verifikasi, PDF saja, batas 20 MiB dengan pemeriksaan MIME, ekstensi, dan signature.
- Beranda mengunduh unggahan hasil verifikasi terbaru. Jika dihapus, unggahan sebelumnya aktif; bila tidak ada, surat awal terlampir digunakan.
- Kategori baru terpisah dari peraturan/formulir; alur autentikasi admin, audit, unduhan publik, dan penghapusan akhir tetap digunakan.
- Migrasi 0007 menyalin seluruh berkas publik lama. Tabel ini tidak menjadi induk foreign key.
- Perbaikan overflow hero beranda: ilustrasi diperkecil dan dibatasi lebar kolom, margin bawah negatif dihapus, serta hero memakai overflow clip agar tidak menjadi area scroll tersendiri.

## Tindak lanjut critique/audit yang disetujui

- Jawaban “Yes” diterapkan sebagai persetujuan seluruh temuan, dengan identitas/ilustrasi dan animasi tetap.
- Penghapusan melalui dialog konfirmasi yang menyebut nama file dan dampak pada surat aktif.
- Daftar hasil verifikasi, dokumen, dan formulir dimuat secara independen, dengan retry serta keadaan belum diketahui yang berbeda dari kosong.
- Progres/keberhasilan unggahan dan penghapusan memakai status live; galat refresh setelah mutasi dibedakan dari mutasi gagal.
- Hero beranda lebih pendek; judul flip beranda mempunyai ukuran minimum lebih kecil agar muat pada 320px. Default flip halaman lain dipertahankan.
- Masuk dan kontrol slot publik minimal 44px; heading subsection admin memakai Poppins semibold. Label jadwal mencakup tahapan saat ini.

### Verifikasi tindak lanjut

- Build aplikasi dan lint terarah berhasil; detector Impeccable menghasilkan `[]`; `git diff --check` bersih.
- Pemeriksaan render awal melalui React server rendering lulus: tiga daftar memiliki loading independen, tanpa “Belum ada” atau input unggahan sebelum status daftar diketahui. Harness sementara dihapus setelah pemeriksaan.
- Verifikasi visual/klik pada browser VS Code belum selesai: kontrol native timeout dua kali, termasuk setelah reset dan koneksi ulang. Tidak mengklaim pengujian dialog, error/retry, unggahan, atau layout mobile melalui browser.
- Snapshot critique tetap terbuka sampai konfirmasi visual/interaksi tersebut selesai; tidak menaikkan skor audit tanpa penilaian ulang.
