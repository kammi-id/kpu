# Blueprint Pengalaman Tiga Peran

Type: prototype
Status: resolved
Blocked by: 02, 03

## Question

Blueprint end-to-end mana yang paling jelas dan paling kecil untuk Publik, Bakal Calon, dan Admin? Buat prototipe throwaway untuk memvalidasi sitemap, informasi publik tanpa data Bakal Calon, visualisasi aturan dan timeline resmi, pintu masuk akun, form data pribadi, sepuluh kelompok upload, status kelengkapan, Masa Perbaikan, dashboard Admin, unduhan formulir, serta profil dan kontak KPU. Jangan prototipekan validasi keabsahan, status hukum pencalonan, uji kualifikasi, pengumuman resmi, atau daftar Bakal Calon karena semuanya berada di luar aplikasi. Rekam verdict manusia terhadap prototipe dan turunkan menjadi batas implementasi serta acceptance checklist tanpa menambah fitur di luar destination.

## Comments

### Sesi prototipe — 15 September 2026

Tiga blueprint dibuat dan ditelusuri manusia lewat bilah mengambang (varian,
peran, tahap):

- **A · Situs dokumen** — navigasi halaman untuk Publik, sidebar akun dengan
  sub-halaman per kelompok berkas, tabel Admin menuju halaman detail.
- **B · Satu halaman berkas** — satu gulungan per peran, semuanya dibuka di
  tempat; jumlah rute paling sedikit.
- **C · Meja kerja** — rel konteks kiri selalu tampak, panel kerja kanan,
  matriks akun × sepuluh kelompok untuk Admin.

Temuan di luar prototipe: `@tailwindcss/vite` tidak pernah terdaftar di
`vite.config.ts`, sehingga tidak satu pun kelas utilitas Tailwind dihasilkan di
seluruh aplikasi. Diperbaiki terpisah pada commit `8db27f3`.

## Answer

**Verdict manusia: Varian A — Situs dokumen.** Blueprint berbasis halaman
dipilih sebagai dasar spesifikasi implementasi untuk ketiga peran.

Prototipe lengkap tersimpan pada branch `prototype/blueprint-tiga-peran`,
commit `d9ade510de18c9336d53b2380bdebd515d3bd888`. Ketiga varian dapat dibaca
tanpa checkout melalui:

`git show d9ade510de18c9336d53b2380bdebd515d3bd888 --stat`

Untuk menjalankannya kembali: `git checkout prototype/blueprint-tiga-peran`,
`npm run dev`, lalu buka `/?prototype=blueprint&variant=A`.

### Sitemap yang disetujui

**Publik — tanpa sesi**

| Rute | Isi |
| --- | --- |
| `/` | Spanduk tahap berjalan, tiga pintu menuju Peraturan/Jadwal/Unduhan, pernyataan bahwa situs tidak menayangkan data Bakal Calon Ketua Umum |
| `/peraturan` | Ringkasan PKPU per pasal, tanpa data Bakal Calon Ketua Umum |
| `/jadwal` | Sepuluh tahap resmi beserta tanggal, seluruhnya WIB |
| `/unduhan` | Formulir A.1 sampai A.6 |
| `/tentang` | Profil dan kontak KPU beserta penegasan tiadanya hubungan dengan penyelenggara pemilihan umum nasional |
| `/masuk`, `/daftar` | Satu halaman gerbang dengan dua tab |

**Bakal Calon Ketua Umum — sesi wajib**

| Rute | Isi |
| --- | --- |
| `/akun` | Ringkasan: Status Kelengkapan Berkas `x/10` dan hasil keseluruhan |
| `/akun/data` | Formulir data pribadi |
| `/akun/berkas` | Daftar sepuluh kelompok, masing-masing menampilkan penanda hadir atau belum |
| `/akun/berkas/:no` | Halaman satu kelompok: daftar berkas, unggah, hapus, ketentuan format |
| `/akun/pengaturan` | Email, WhatsApp, rekaman persetujuan, Permintaan Penutupan Akun dan Penarikan Persetujuan |

Sidebar tetap menampilkan `x/10` dan label `Lengkap` atau `Belum lengkap`.
Spanduk tahap berada di atas konten pada setiap rute akun.

**Admin — sesi dan pemeriksaan peran**

| Rute | Isi |
| --- | --- |
| `/admin` | Tabel Bakal Calon Ketua Umum: nama, WhatsApp, waktu terdaftar, `x/10`, `Lengkap` atau `Belum lengkap`, dengan pencarian nama |
| `/admin/:id` | Detail: data pribadi, sepuluh kelompok dengan tombol unduh per kelompok, unduh ZIP, reset kata sandi |
| `/admin/ekspor` | CSV keseluruhan dan ZIP per Bakal Calon Ketua Umum dengan manifest checksum |
| `/admin/audit` | Waktu, aktor, tindakan, sasaran, hasil |

### Batas implementasi

- Tidak ada daftar, profil, status, atau berkas Bakal Calon Ketua Umum di rute
  publik mana pun.
- Tidak ada status `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`, atau
  `Calon Ketua Umum` di antarmuka mana pun.
- Tidak ada tombol atau status `kirim pendaftaran`. Setiap simpan yang berhasil
  langsung menjadi keadaan terkini.
- Tidak ada layar uji kualifikasi, penetapan, atau penerbitan pengumuman resmi.
- Tidak ada verifikasi pembayaran; kelompok sepuluh hanya mencatat keberadaan
  bukti transfer.
- Tidak ada pratinjau berkas inline; unduhan selalu sebagai attachment.
- Tidak ada rute multi-admin, matriks peran, atau delegasi akun.

### Acceptance checklist

Publik

1. Setiap rute publik dapat dimuat tanpa sesi dan tidak memuat satu pun nama,
   kontak, atau berkas Bakal Calon Ketua Umum.
2. Spanduk beranda menampilkan tahap yang benar untuk waktu WIB saat itu pada
   kelima tahap.
3. Tombol `Daftar` nonaktif di luar Masa Pendaftaran dan menjelaskan alasannya.
4. `/jadwal` memuat sepuluh tahap dengan tanggal persis seperti tiket 02.
5. `/unduhan` menyediakan berkas A.1 sampai A.6.
6. `/tentang` memuat penegasan tiadanya hubungan dengan penyelenggara
   pemilihan umum nasional.

Gerbang akun

7. Registrasi menuntut nama, email unik, WhatsApp unik, kata sandi minimal
   delapan karakter, centang persetujuan yang tidak tercentang otomatis, dan
   Turnstile yang divalidasi di server.
8. Registrasi di luar Masa Pendaftaran ditolak oleh server, bukan hanya oleh
   antarmuka.
9. Halaman masuk menampilkan Turnstile setelah tiga kegagalan berturut-turut.
10. Tidak ada tautan reset kata sandi mandiri; halaman mengarahkan ke kanal
    resmi KPU.

Bakal Calon Ketua Umum

11. Seluruh rute `/akun` menolak permintaan tanpa sesi.
12. `x/10` dan label keseluruhan sama di sidebar, ringkasan, dan daftar berkas.
13. Kelompok tujuh dihitung hadir hanya bila ada minimal dua berkas A.3 atau
    minimal tiga berkas A.4.
14. Kelompok enam menolak berkas selain PDF; sembilan kelompok lain menerima
    PDF, JPEG, dan PNG.
15. Berkas lebih dari 20 MiB atau berkas keenam dalam satu kelompok ditolak.
16. Pada tahap Pemeriksaan dan Terkunci, seluruh simpan, unggah, dan hapus
    ditolak server dan antarmuka menampilkan alasannya.
17. Pada Masa Perbaikan, pemilik akun lama dapat mengubah kembali seluruh data
    dan berkas, sedangkan registrasi tetap ditolak.
18. Halaman pengaturan menampilkan versi dan waktu persetujuan yang terekam.
19. Permintaan Penutupan Akun dan Penarikan Persetujuan menuntut kata sandi,
    langsung mengunci akun, dan mencabut seluruh sesinya.

Admin

20. Seluruh rute `/admin` menolak sesi Bakal Calon Ketua Umum.
21. Tabel menampilkan `x/10` yang sama dengan yang dilihat pemilik akun.
22. Unduhan berkas melewati Worker dengan `Content-Disposition: attachment` dan
    `X-Content-Type-Options: nosniff`, dan tidak pernah tampil inline.
23. Reset kata sandi mencabut seluruh sesi akun sasaran.
24. Ekspor CSV dan ZIP tidak memuat hash kata sandi, token sesi, atau data
    mitigasi penyalahgunaan.
25. Audit mencatat aktor `Admin bersama` beserta sesi dan waktu untuk setiap
    tindakan Admin, dan tidak mengklaim atribusi individu.

### Amandemen — 15 September 2026

Sebagian keputusan tiket ini diamandemen oleh [Batas Operasional: Peluncuran, Serah-Terima, dan Penghentian](06-batas-operasional-peluncuran-dan-penghentian.md), bagian "Amandemen tiket sebelumnya". Bila bertentangan, tiket tersebut yang berlaku.
