# Spesifikasi: Website KPU KAMMI 2026

Status: ready-for-agent
Tenggat: seluruh fitur operasional pada 17 September 2026 pukul 00.00 WIB (16 September 2026 17.00 UTC)
Sumber keputusan: [peta](map.md), tiket [02](issues/02-model-operasi-dan-kebijakan-pendaftaran.md), [03](issues/03-identitas-keamanan-dan-siklus-data.md), [04](issues/04-blueprint-tiga-peran.md), [05](issues/05-skema-data-dan-kontrak-penyimpanan.md), [06](issues/06-batas-operasional-peluncuran-dan-penghentian.md). Bila tiket 02–05 bertentangan dengan tiket 06, **tiket 06 yang berlaku**. Istilah mengikuti `CONTEXT.md`.

> **Diubah 24 September 2026 ([ADR 0003](../../docs/adr/0003-menghapus-berkas-dan-status-instruktur.md)):** berkas dan status instruktur dihapus. Kelompok Berkas kini sembilan (`x/9`): kelompok 5 lama dan seterusnya turun satu nomor, sehingga karya tulis ilmiah (PDF saja) menjadi kelompok 5 dan rekomendasi A.3/A.4 menjadi kelompok 6. Penyebutan sepuluh kelompok, `x/10`, kelompok 6/7, dan status instruktur di bawah mengikuti keadaan sebelum perubahan ini.

Spesifikasi ini merangkum dan menyatukan keputusan yang sudah ada. Ia tidak membuka ulang ruang lingkup. DDL persis, checklist peluncuran, runbook, dan langkah penghentian tetap berada di tiket 05 dan 06; spesifikasi ini merujuknya.

## Problem Statement

Komisi Penjaringan Umum Muktamar (KPU) XIV KAMMI 2026 harus menerima pendaftaran Bakal Calon Ketua Umum PP KAMMI mulai 17 September 2026 pukul 00.00 WIB. Sampai saat ini tidak ada tempat resmi untuk hal-hal berikut:

- Publik tidak dapat membaca ringkasan PKPU, melihat jadwal resmi, atau mengunduh Formulir A.1–A.6.
- Anggota Biasa III tidak dapat membuat akun, mengisi data pribadi, dan mengunggah sepuluh kelompok berkas dalam batas Masa Pendaftaran dan Masa Perbaikan.
- KPU tidak dapat melihat Status Kelengkapan Berkas tiap Bakal Calon Ketua Umum. KPU juga tidak dapat mengunduh berkas secara aman, memulihkan akses Bakal Calon, atau memproses Permintaan Penutupan Akun dan Penarikan Persetujuan.
- KPU tidak memiliki bukti keadaan berkas pada awal verifikasi administrasi.
- Tidak ada mekanisme yang memastikan data pribadi dihapus tuntas setelah Masa Retensi.

Repo saat ini hanya berisi halaman "Coming Soon": Hono, React 19, Vite 7, dan shadcn/Base UI, tanpa binding D1/R2, tanpa Better Auth, dan tanpa infrastruktur uji.

## Solution

Satu Cloudflare Worker di `https://kpu.kammi.id` melayani SPA React dan API Hono. D1 menyimpan akun, data, metadata berkas, Peraturan, dan audit. Bucket R2 privat menyimpan berkas Bakal Calon, Berkas Publik, dan Ekspor Harian.

- **Publik** membaca beranda dengan spanduk tahap berjalan, Peraturan, jadwal, dan unduhan formulir, serta profil KPU dengan kanal resmi. Tidak satu pun data Bakal Calon Ketua Umum tampil. Setiap halaman memuat footer tetap berisi penegasan bahwa KPU tidak berhubungan dengan penyelenggara pemilihan umum nasional, kecuali gerbang `/masuk`, `/daftar`, dan `/onboard` (amandemen: footer disembunyikan khusus pada layar publik non-administratif tersebut).
- **Bakal Calon Ketua Umum** mendaftar dengan email, kata sandi, WhatsApp, centang persetujuan, dan Turnstile. Ia lalu mengisi data pribadi dan mengelola sepuluh kelompok berkas. Status `x/10` beserta label `Lengkap` atau `Belum lengkap` dihitung otomatis. Perubahan hanya diterima server pada Masa Pendaftaran dan Masa Perbaikan. Bakal Calon dapat mengajukan Permintaan Penutupan Akun dan Penarikan Persetujuan.
- **Admin bersama** dibuat sekali lewat Onboarding Admin bertoken. Admin melihat tabel dan detail seluruh Bakal Calon Ketua Umum, mengunduh berkas, mereset kata sandi, dan menghapus data akun yang meminta ditutup. Admin juga mengelola Peraturan dan Berkas Publik, mengunduh Ekspor Harian dan Snapshot Pemeriksaan, serta membaca audit.
- **Sistem** menjalankan cron harian pukul 00.00 WIB. Cron membuat Ekspor Harian, menyalin Snapshot Pemeriksaan satu kali pada 5 Oktober 2026, dan mulai 25 Januari 2027 menjalankan Penghapusan Akhir, lalu seluruh situs memasuki Tahap Selesai.

## User Stories

### Pengunjung publik

1. Sebagai pengunjung publik, saya ingin beranda menampilkan tahap penjaringan yang sedang berjalan menurut waktu WIB, agar saya tahu apakah pendaftaran sedang dibuka.
2. Sebagai pengunjung publik, saya ingin beranda memberi tiga pintu menuju Peraturan, Jadwal, dan Unduhan, agar saya cepat menemukan informasi resmi.
3. Sebagai pengunjung publik, saya ingin beranda menyatakan bahwa situs tidak menayangkan data Bakal Calon Ketua Umum, agar saya tidak mencari daftar pendaftar di sini.
4. Sebagai pengunjung publik, saya ingin membaca ringkasan PKPU di `/peraturan`, agar saya memahami syarat pencalonan tanpa membuka dokumen penuh.
5. Sebagai pengunjung publik, saya ingin `/peraturan` menampilkan "Menyusul" bila Admin belum mengisinya, agar saya tahu isinya belum tersedia, bukan rusak.
6. Sebagai pengunjung publik, saya ingin mengunduh Berkas Publik kategori peraturan dari `/peraturan` tanpa akun, agar saya memegang dokumen PKPU lengkap.
7. Sebagai pengunjung publik, saya ingin `/jadwal` memuat sepuluh tahap resmi dengan tanggal WIB, agar saya dapat merencanakan pendaftaran.
8. Sebagai pengunjung publik, saya ingin mengunduh Formulir A.1–A.6 dari `/unduhan` tanpa akun, agar saya dapat menyiapkan berkas.
9. Sebagai pengunjung publik, saya ingin berkas yang saya unduh selalu tersimpan sebagai attachment, agar peramban tidak mengeksekusi atau menampilkan isinya secara inline.
10. Sebagai pengunjung publik, saya ingin `/tentang` memuat profil KPU dan kanal resmi berupa satu WhatsApp dan satu email, agar saya tahu ke mana harus bertanya.
11. Sebagai pengunjung publik, saya ingin setiap halaman memuat penegasan bahwa KPU tidak berhubungan dengan penyelenggara pemilihan umum nasional, agar saya tidak keliru mengira situs ini milik KPU RI.
12. Sebagai pengunjung publik, saya ingin tombol `Daftar` nonaktif di luar Masa Pendaftaran beserta alasannya, agar saya tidak mengisi formulir yang pasti ditolak.
13. Sebagai pengunjung publik, saya ingin seluruh situs hanya menyatakan bahwa proses telah selesai dan data telah dihapus setelah Penghapusan Akhir, agar saya tidak mengira layanan masih berjalan.

### Calon pendaftar dan gerbang akun

14. Sebagai Anggota Biasa III, saya ingin mendaftar sendiri tanpa kode aktivasi selama Masa Pendaftaran, agar saya dapat langsung menjadi Bakal Calon Ketua Umum dalam arti operasional.
15. Sebagai Anggota Biasa III, saya ingin registrasi meminta nama lengkap, email, WhatsApp, dan kata sandi minimal delapan karakter, agar akun saya dapat dikenali dan dipulihkan KPU.
16. Sebagai Anggota Biasa III, saya ingin diberi tahu bila email atau WhatsApp saya sudah terdaftar, agar saya tidak membuat akun ganda.
17. Sebagai Anggota Biasa III, saya ingin menulis WhatsApp dengan `08…`, `+62…`, atau `62…` dan tetap diterima, agar saya tidak gagal karena format.
18. Sebagai Anggota Biasa III, saya ingin membaca pemberitahuan pemrosesan data (tujuan, jenis data, pihak yang mengakses, penghapusan 25 Januari 2027, hak subjek data, tautan kanal resmi) sebelum mencentang persetujuan yang tidak tercentang otomatis, agar persetujuan saya sadar dan eksplisit.
19. Sebagai Anggota Biasa III, saya ingin registrasi tanpa centang persetujuan ditolak server, agar tidak ada akun tanpa Persetujuan Pemrosesan Data.
20. Sebagai Anggota Biasa III, saya ingin menyelesaikan Turnstile saat registrasi, agar pendaftaran terlindung dari bot.
21. Sebagai Anggota Biasa III, saya ingin registrasi di luar Masa Pendaftaran ditolak server dengan pesan tahap, agar aturan jadwal berlaku walau antarmuka dilewati.
22. Sebagai Bakal Calon Ketua Umum, saya ingin masuk dengan email dan kata sandi pada halaman gerbang yang sama dengan pendaftaran, agar alurnya sederhana.
23. Sebagai Bakal Calon Ketua Umum, saya ingin email saya diterima walau ada spasi atau huruf besar, agar saya tidak gagal masuk karena salah ketik kecil.
24. Sebagai Bakal Calon Ketua Umum, saya ingin Turnstile muncul setelah tiga kegagalan masuk berturut-turut, agar akun saya terlindung dari tebakan kata sandi tanpa menyulitkan login normal.
25. Sebagai Bakal Calon Ketua Umum yang lupa kata sandi, saya ingin halaman masuk mengarahkan saya ke kanal resmi KPU, bukan tautan reset mandiri, agar saya tahu jalur pemulihan yang sah.
26. Sebagai Bakal Calon Ketua Umum yang sudah punya akun, saya ingin tetap bisa masuk pada tahap Pemeriksaan dan Terkunci, agar saya dapat melihat data dan berkas saya walau tidak dapat mengubahnya.

### Bakal Calon Ketua Umum — akun, data, dan berkas

27. Sebagai Bakal Calon Ketua Umum, saya ingin `/akun` menampilkan Status Kelengkapan Berkas `x/10` dan hasil keseluruhan, agar saya tahu apa yang masih kurang.
28. Sebagai Bakal Calon Ketua Umum, saya ingin sidebar akun selalu menampilkan `x/10` dan label yang sama dengan ringkasan dan daftar berkas, agar tidak ada angka yang bertentangan.
29. Sebagai Bakal Calon Ketua Umum, saya ingin spanduk tahap tampil di atas setiap halaman akun, agar saya tahu apakah perubahan sedang diizinkan.
30. Sebagai Bakal Calon Ketua Umum, saya ingin label `Lengkap` dijelaskan sebagai "berkas yang disyaratkan telah berada di sistem", bukan sah atau lulus, agar saya tidak salah paham tentang status pencalonan.
31. Sebagai Bakal Calon Ketua Umum, saya ingin mengisi dan menyimpan data pribadi A.1 di `/akun/data`, agar KPU memiliki data saya.
32. Sebagai Bakal Calon Ketua Umum, saya ingin setiap simpan yang berhasil langsung menjadi keadaan terkini tanpa tombol "kirim pendaftaran", agar saya tidak lupa mengirim.
33. Sebagai Bakal Calon Ketua Umum, saya ingin data pribadi yang belum lengkap tidak memengaruhi Status Kelengkapan Berkas, agar status hanya mencerminkan sepuluh kelompok berkas.
34. Sebagai Bakal Calon Ketua Umum, saya ingin `/akun/berkas` menampilkan sepuluh kelompok dengan penanda hadir atau belum, agar saya dapat memeriksa kelengkapan sekilas.
35. Sebagai Bakal Calon Ketua Umum, saya ingin halaman tiap kelompok (`/akun/berkas/:no`) menampilkan ketentuan format, daftar berkas, tombol unggah, dan tombol hapus, agar saya mengelola satu kelompok dalam satu tempat.
36. Sebagai Bakal Calon Ketua Umum, saya ingin kelompok 6 (karya tulis ilmiah) hanya menerima PDF, agar saya tidak mengunggah format yang pasti ditolak.
37. Sebagai Bakal Calon Ketua Umum, saya ingin sembilan kelompok lain menerima PDF, JPEG, atau PNG, agar saya dapat mengunggah hasil pindai atau foto.
38. Sebagai Bakal Calon Ketua Umum, saya ingin berkas lebih dari 20 MiB atau berkas keenam dalam satu kelompok ditolak dengan alasan jelas, agar saya tahu cara memperbaikinya.
39. Sebagai Bakal Calon Ketua Umum, saya ingin berkas yang ekstensi, MIME, atau signature-nya tidak cocok ditolak, agar berkas yang disamarkan tidak masuk ke sistem.
40. Sebagai Bakal Calon Ketua Umum, saya ingin memilih jenis A.3 dari PW atau A.4 dari PD setiap kali mengunggah ke kelompok 7, agar sistem dapat menghitung Jalur Rekomendasi.
41. Sebagai Bakal Calon Ketua Umum, saya ingin kelompok 7 dihitung hadir bila ada sedikitnya dua berkas A.3 atau sedikitnya tiga berkas A.4, agar saya tahu kapan salah satu Jalur Rekomendasi terpenuhi.
42. Sebagai Bakal Calon Ketua Umum, saya ingin kelompok 7 yang berisi campuran (misalnya 1 A.3 + 2 A.4) tetap dinyatakan belum hadir, agar saya tidak mengira campuran jalur cukup.
43. Sebagai Bakal Calon Ketua Umum, saya ingin menghapus berkas lalu mengunggah penggantinya, agar saya dapat memperbaiki berkas yang salah.
44. Sebagai Bakal Calon Ketua Umum, saya ingin mengunduh kembali berkas saya sendiri sebagai attachment, agar saya dapat memastikan berkas yang tersimpan benar.
45. Sebagai Bakal Calon Ketua Umum, saya ingin tidak dapat mengakses berkas milik akun lain walau menebak alamatnya, agar data saya pun terlindung dengan cara yang sama.
46. Sebagai Bakal Calon Ketua Umum, saya ingin tahap Pemeriksaan (5–7 Oktober) dan Terkunci (mulai 12 Oktober) menjadikan data dan berkas saya hanya-baca, dengan tombol nonaktif beserta alasannya, agar saya paham mengapa perubahan ditolak.
47. Sebagai Bakal Calon Ketua Umum, saya ingin Masa Perbaikan (8–11 Oktober) membuka kembali seluruh perubahan data dan berkas, agar saya dapat melengkapi kekurangan.
48. Sebagai Bakal Calon Ketua Umum, saya ingin akun yang belum lengkap saat tenggat hanya dikunci dan tetap berlabel `Belum lengkap`, tanpa status gugur otomatis, agar keputusan pencalonan tetap di tangan KPU.
49. Sebagai Bakal Calon Ketua Umum, saya ingin `/akun/pengaturan` menampilkan email, WhatsApp, versi, dan waktu Persetujuan Pemrosesan Data yang terekam, agar saya dapat memeriksa rekaman persetujuan saya.
50. Sebagai Bakal Calon Ketua Umum, saya ingin mengajukan Permintaan Penutupan Akun dan Penarikan Persetujuan dengan konfirmasi kata sandi, agar pemrosesan data saya dihentikan.
51. Sebagai Bakal Calon Ketua Umum yang mengajukan penutupan, saya ingin akun saya langsung terkunci dan semua sesi dicabut, agar tidak ada lagi akses ke data saya.
52. Sebagai Bakal Calon Ketua Umum yang mengajukan penutupan, saya ingin diberi tahu bahwa permintaan ini tidak menetapkan status Mengundurkan Diri dan diproses KPU paling lambat 3×24 jam, agar saya paham akibatnya.
53. Sebagai Bakal Calon Ketua Umum, saya ingin sesi saya berakhir setelah dua jam tidak aktif atau 24 jam sejak masuk, agar akun saya aman di perangkat bersama.
54. Sebagai Bakal Calon Ketua Umum, saya ingin login keenam mencabut sesi tertua saya, agar jumlah sesi aktif tidak pernah lebih dari lima.
55. Sebagai Bakal Calon Ketua Umum, saya ingin keluar dari akun kapan pun, agar sesi di perangkat saya berakhir.

### Admin bersama

56. Sebagai Pemegang Admin, saya ingin membuat satu-satunya akun Admin bersama di `/onboard` dengan `ONBOARD_TOKEN` dari Operator, agar KPU memiliki akses Admin sebelum peluncuran.
57. Sebagai Pemegang Admin, saya ingin onboarding meminta nama tampilan, email, dan kata sandi minimal 12 karakter, agar kredensial bersama cukup kuat.
58. Sebagai Pemegang Admin, saya ingin `/onboard` menolak token yang salah dan menolak saat token tidak terpasang, agar orang lain tidak dapat merebut akun Admin.
59. Sebagai Pemegang Admin, saya ingin `/onboard` mengembalikan 404 setelah Admin ada, dan dua onboarding bersamaan hanya menghasilkan satu Admin, agar tidak pernah ada Admin kedua.
60. Sebagai Admin bersama, saya ingin sesi Admin berakhir setelah 30 menit tidak aktif atau delapan jam sejak masuk, agar kredensial bersama tidak tertinggal terbuka.
61. Sebagai Admin bersama, saya ingin `/admin` menampilkan tabel Bakal Calon Ketua Umum (nama, WhatsApp, waktu terdaftar, `x/10`, `Lengkap` atau `Belum lengkap`) dengan pencarian nama, agar saya dapat memantau pendaftaran.
62. Sebagai Admin bersama, saya ingin angka `x/10` di tabel sama persis dengan yang dilihat pemilik akun, agar tidak ada sengketa soal status kelengkapan.
63. Sebagai Admin bersama, saya ingin tabel menampilkan penanda **Minta ditutup** untuk akun yang mengajukan penutupan, agar saya dapat memprosesnya dalam 3×24 jam.
64. Sebagai Admin bersama, saya ingin `/admin/:id` menampilkan data pribadi dan sepuluh kelompok berkas dengan tombol unduh per berkas, agar saya dapat memeriksa berkas secara manual.
65. Sebagai Admin bersama, saya ingin mengunduh ZIP Ekspor Harian terakhir untuk satu Bakal Calon Ketua Umum dari `/admin/:id`, agar saya mendapat seluruh berkasnya sekaligus.
66. Sebagai Admin bersama, saya ingin setiap unduhan berkas melewati Worker sebagai attachment dengan `nosniff`, agar berkas tidak pernah tampil inline di peramban Admin.
67. Sebagai Admin bersama, saya ingin tombol Reset Password yang meminta konfirmasi kata sandi Admin, agar reset tidak terjadi karena salah klik atau sesi yang ditinggal.
68. Sebagai Admin bersama, saya ingin kata sandi baru 16 karakter tanpa karakter ambigu ditampilkan sekali dengan tombol salin, agar saya dapat menyampaikannya lewat kanal resmi tanpa salah baca.
69. Sebagai Admin bersama, saya ingin reset kata sandi mencabut seluruh sesi akun sasaran, agar pihak yang mungkin menguasai akun itu tersingkir.
70. Sebagai Admin bersama, saya ingin sesi Admin saya dicabut setelah lima kegagalan konfirmasi kata sandi berturut-turut, agar sesi Admin yang dicuri tidak dapat dipakai menebak kata sandi.
71. Sebagai Admin bersama, saya ingin tombol **Hapus data akun** hanya muncul untuk akun berpenanda Minta ditutup dan menuntut kata sandi Admin, agar penghapusan tidak terjadi pada akun yang tidak memintanya.
72. Sebagai Admin bersama, saya ingin Hapus data akun menghapus baris D1, berkas R2, kedua ZIP ekspor akun itu, dan barisnya di kedua CSV, agar penarikan persetujuan tuntas.
73. Sebagai Admin bersama, saya ingin mengedit Peraturan sebagai Markdown di `/admin/peraturan` dengan pratinjau, agar ringkasan PKPU publik dapat diperbarui pada tahap mana pun.
74. Sebagai Admin bersama, saya ingin mengunggah Berkas Publik PDF atau DOCX ≤ 20 MiB dengan judul, kategori `peraturan` atau `formulir`, dan urutan, agar dokumen PKPU dan formulir tersedia bagi publik.
75. Sebagai Admin bersama, saya ingin menghapus Berkas Publik, agar dokumen yang salah dapat diganti.
76. Sebagai Admin bersama, saya ingin `/admin/ekspor` menyediakan unduhan CSV dan ZIP "Terkini" serta "Pemeriksaan", agar saya dapat mengambil paket terakhir dan bukti keadaan awal verifikasi kapan pun.
77. Sebagai Admin bersama, saya ingin ekspor tidak memuat hash kata sandi, token sesi, atau data mitigasi penyalahgunaan, agar paket ekspor tidak membocorkan rahasia autentikasi.
78. Sebagai Admin bersama, saya ingin ZIP ekspor memuat manifest SHA-256 tiap berkas, agar KPU dapat membuktikan berkas tidak berubah.
79. Sebagai Admin bersama, saya ingin `/admin/audit` menampilkan waktu, aktor, tindakan, sasaran, dan hasil, agar KPU memiliki jejak tindakan.
80. Sebagai Admin bersama, saya ingin audit mencatat aktor sebagai `Admin bersama` beserta sesi dan waktu, agar audit jujur tentang kredensial bersama dan tidak mengklaim atribusi individu.
81. Sebagai Admin bersama, saya ingin memeriksa bahwa audit `ekspor_harian` hari ini ada dan berhasil, agar saya dapat melapor ke Operator bila ekspor gagal.
82. Sebagai Admin bersama, saya ingin sesi Bakal Calon Ketua Umum ditolak di seluruh API Admin, agar tidak ada peningkatan hak akses.
83. Sebagai Admin bersama, saya ingin tetap dapat masuk dan bekerja pada tahap Belum dibuka sampai Terkunci, agar onboarding, pengisian Peraturan, dan pemeriksaan berkas tidak terhalang jadwal Bakal Calon.

### Operator infrastruktur

84. Sebagai Operator, saya ingin Worker menolak onboarding dan autentikasi secara tertutup bila secret belum terpasang, agar deploy sebelum pemasangan secret tidak membuka celah.
85. Sebagai Operator, saya ingin `workers.dev`, Preview URL, dan r2.dev nonaktif, agar satu-satunya pintu masuk adalah `kpu.kammi.id`.
86. Sebagai Operator, saya ingin menguji perilaku yang bergantung waktu secara lokal dengan jam yang disuntikkan, agar keenam tahap dapat diverifikasi sebelum tanggalnya tiba.
87. Sebagai Operator, saya ingin menguji handler terjadwal secara lokal, agar Ekspor Harian, Snapshot Pemeriksaan, dan Penghapusan Akhir terbukti sebelum produksi.
88. Sebagai Operator, saya ingin log observability tidak memuat body formulir, nama berkas, atau token, agar log tidak menjadi kebocoran data pribadi.
89. Sebagai Operator, saya ingin memulihkan akses Admin dengan menghapus baris Admin dan memasang `ONBOARD_TOKEN` baru, agar onboarding ulang menjadi satu-satunya jalur pemulihan.
90. Sebagai Operator, saya ingin seluruh skema berada dalam satu migrasi yang diterapkan dengan `wrangler d1 migrations apply`, agar penyediaan database dapat diulang tanpa endpoint migrasi.

### Sistem (cron)

91. Sebagai Sistem, saya ingin setiap pukul 00.00 WIB menulis ulang CSV seluruh Bakal Calon Ketua Umum dan ZIP per akun ke `ekspor/terkini/`, lalu mencatat audit `ekspor_harian`, agar Admin selalu punya paket terbaru.
92. Sebagai Sistem, saya ingin run 5 Oktober 2026 pukul 00.00 WIB menyalin hasilnya ke `ekspor/pemeriksaan/` tepat satu kali dan tidak pernah menimpanya, agar Snapshot Pemeriksaan menjadi bukti keadaan awal verifikasi.
93. Sebagai Sistem, saya ingin mencatat audit `ekspor_harian` dengan hasil `gagal` bila run gagal, agar kegagalan terlihat Admin.
94. Sebagai Sistem, saya ingin run pertama pada atau setelah 25 Januari 2027 pukul 00.00 WIB menghapus seluruh objek R2 dan seluruh baris semua tabel, lalu menyisipkan tepat satu audit `hapus_data` beraktor `Sistem` berisi jumlah yang dihapus, agar Penghapusan Akhir tuntas dan terbukti tanpa data pribadi.
95. Sebagai Sistem, saya ingin run berikutnya mengulang penghapusan sisa tanpa menambah audit kedua, agar penghapusan yang terputus tetap selesai.
96. Sebagai Sistem, saya ingin baris `percobaanLogin` yang kedaluwarsa dibersihkan saat percobaan berikutnya, agar hash IP tidak tersimpan lebih dari 24 jam tanpa cron tambahan.

## Implementation Decisions

### Konfigurasi Worker

- Config tetap memakai `wrangler.json` yang ada, bukan `.jsonc`. Isinya: binding D1 `DB` (database `kpu-kammi-2026`), binding R2 `BERKAS` (bucket `kpu-kammi-2026-berkas`), vars `BETTER_AUTH_URL` dan `TURNSTILE_SITE_KEY`, secrets `BETTER_AUTH_SECRET`, `HMAC_SECRET`, `TURNSTILE_SECRET_KEY`, dan `ONBOARD_TOKEN` (sementara), cron `0 17 * * *`, route Custom Domain `kpu.kammi.id`, `workers_dev: false`, `preview_urls: false`, dan `observability.traces.enabled: true`. Jalankan `cf-typegen` setelah binding berubah.
- Hanya ada lingkungan produksi dan lokal. Lokal memakai `.dev.vars` dengan kunci uji Turnstile.
- Static assets tetap memakai SPA fallback. Worker wajib berjalan lebih dulu untuk `/api/*` dan `/onboard`: `/onboard` harus bisa mengembalikan 404 sungguhan setelah Admin ada, bukan `index.html`. Periksa dokumentasi terkini opsi `run_worker_first` sebelum mengonfigurasi.
- **Prasyarat di luar kode:** Workers Paid wajib aktif sebelum peluncuran, karena batas CPU 10 ms paket Free mematahkan hashing kata sandi, SHA-256 unggahan, dan ZIP harian. Bila Paid tidak mungkin, berhenti dan laporkan ke pengguna, karena keputusan 1 dan 12 tiket 06 terbuka kembali. Kepemilikan zona `kammi.id` oleh akun Wrangler yang login belum diverifikasi.

### Modul jam dan tahap (`tahapPada`)

- Modul murni dan dalam: `tahapPada(instant) → Tahap`, dengan enam nilai `BelumDibuka`, `MasaPendaftaran`, `Pemeriksaan`, `MasaPerbaikan`, `Terkunci`, dan `Selesai`. Batas tahap adalah konstanta instan UTC (WIB = UTC+7, tanpa DST):

  | Tahap | Mulai (WIB) | Mulai (UTC) |
  | --- | --- | --- |
  | Belum dibuka | — | — |
  | Masa Pendaftaran | 17 Sep 2026 00.00 | 16 Sep 2026 17.00 |
  | Pemeriksaan | 5 Okt 2026 00.00 | 4 Okt 2026 17.00 |
  | Masa Perbaikan | 8 Okt 2026 00.00 | 7 Okt 2026 17.00 |
  | Terkunci | 12 Okt 2026 00.00 | 11 Okt 2026 17.00 |
  | Selesai | 25 Jan 2027 00.00 | 24 Jan 2027 17.00 |

  "Berakhir pukul 23.59" berarti tahap berikutnya mulai tepat pukul 00.00. Setiap batas bersifat inklusif di awal dan eksklusif di akhir.
- Modul yang sama mengekspor predikat turunan agar aturan tidak tersebar:
  - `bolehRegistrasi`: hanya Masa Pendaftaran.
  - `bolehUbahBacalon`: Masa Pendaftaran dan Masa Perbaikan.
  - `layananAktif`: semua tahap selain Selesai.
- Sepuluh tahap resmi untuk `/jadwal` adalah konstanta kode di modul yang sama, persis seperti tabel tiket 02. D1 tidak menyimpan tahap. Perubahan jadwal berarti deploy ulang.
- Jam masuk sebagai dependensi. Worker dibangun lewat satu fungsi pembuat yang menerima `sekarang: () => Date`. Ekspor default memakai jam nyata, dan uji memakai jam tetap. Seluruh penolakan server, spanduk, dan status tombol `Daftar` bersumber dari fungsi ini. Klien memperoleh tahap dari API agar tidak bergantung pada jam perangkat.

### Tahap × kemampuan (penggabungan tiket 02, 03, 06)

| Kemampuan | Belum dibuka | Pendaftaran | Pemeriksaan | Perbaikan | Terkunci | Selesai |
| --- | --- | --- | --- | --- | --- | --- |
| Rute publik, unduh Berkas Publik | ya | ya | ya | ya | ya | pesan selesai saja |
| Registrasi Bakal Calon | tolak | ya | tolak | tolak | tolak | tolak |
| Login Bakal Calon, baca data sendiri | ya | ya | ya | ya | ya | tolak |
| Ubah data, unggah, hapus berkas Bakal Calon | tolak | ya | tolak | ya | tolak | tolak |
| Permintaan Penutupan Akun | ya | ya | ya | ya | ya | tolak |
| Onboarding Admin (bila syarat terpenuhi) | ya | ya | ya | ya | ya | tolak |
| Seluruh fungsi Admin | ya | ya | ya | ya | ya | tolak |
| Cron Ekspor Harian | ya | ya | ya | ya | ya | diganti Penghapusan Akhir |

Asumsi tercatat: Permintaan Penutupan Akun tetap tersedia di luar jendela ubah. Permintaan ini adalah hak subjek data, bukan perubahan data pencalonan, dan tiket 03 tidak membatasinya dengan jadwal.

### Autentikasi dan sesi (Better Auth)

- Better Auth dipin **exact** (tiket 05 memakai 1.7.4) dengan binding D1 native tanpa ORM, dipasang di bawah Hono. Pluginnya: Admin (`defaultRole: 'bacalon'`) dan Captcha (Turnstile) khusus `/sign-up/email`. Verifikasi email dan reset kata sandi mandiri dinonaktifkan. Kata sandi Bakal Calon minimal 8 karakter.
- Pembatas bawaan Better Auth dimatikan, dan `advanced.ipAddress.disableIpTracking: true`.
- **Permukaan HTTP Better Auth diperkecil.** Hanya endpoint yang dipakai klien yang terjangkau: registrasi email, login email, keluar, dan ambil sesi. Endpoint HTTP lain, termasuk seluruh endpoint plugin Admin, `update-user`, `change-email`, dan `change-password`, diblokir. Pemblokiran lewat opsi penonaktifan jalur Better Auth atau middleware sebelum handler. Tindakan Admin memanggil API server Better Auth dari rute aplikasi yang sudah memeriksa sesi, peran, tahap, dan audit. Alasannya: endpoint bawaan melewati state machine waktu dan audit, misalnya pembuatan user oleh Admin atau impersonasi.
- Hook sebelum registrasi melakukan hal berikut:
  - memangkas email;
  - menormalkan WhatsApp ke digit berawalan `62` (`08…` → `628…`, `+62…` → `62…`);
  - menolak bila `bolehRegistrasi` salah;
  - menolak tanpa centang persetujuan;
  - mengisi `persetujuanVersi = 'persetujuan-v1'` dan `persetujuanPada` di server (`input: false`).
  - Registrasi dengan peran selain `bacalon` mustahil lewat HTTP.
- Login: hook sebelum login menolak pada tahap Selesai, lalu memeriksa `percobaanLogin`. Bila kunci `email:<HMAC>` atau `ip:<HMAC>` (IP dari `cf-connecting-ip`) sudah gagal ≥3 kali, token Turnstile diverifikasi server-side. Hook sesudah login menambah atau mereset penghitung dan menghapus baris kedaluwarsa. Respons gagal memberi penanda bahwa Turnstile kini diperlukan, supaya klien menampilkannya. Akun ber-`banned` ditolak Better Auth. Setiap login berhasil maupun gagal dicatat di audit.
- Kebijakan sesi per peran diterapkan middleware tipis setelah pengambilan sesi:

  | Peran | Tidak aktif | Absolut |
  | --- | --- | --- |
  | Bakal Calon Ketua Umum | 2 jam | 24 jam |
  | Admin | 30 menit | 8 jam |

  Sesi yang melampaui batas dihapus dan diperlakukan sebagai tanpa sesi. Setelah login, sesi di atas lima per akun dicabut dari yang tertua.
- Cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Proteksi CSRF dan origin bawaan aktif.
- Secret yang hilang (`BETTER_AUTH_SECRET`, `HMAC_SECRET`, `TURNSTILE_SECRET_KEY`) membuat seluruh endpoint autentikasi dan onboarding menjawab galat tertutup, bukan crash atau bypass.
- Setiap rute API selain registrasi, login, unduh Berkas Publik, tahap, dan konten publik menjalankan urutan tetap: **sesi → peran → kepemilikan → tahap**.

### Onboarding Admin

- `/onboard` hanya aktif bila tidak ada `user.role = 'admin'` **dan** `ONBOARD_TOKEN` terpasang. Token dibandingkan dengan hash SHA-256 kedua sisi lalu `crypto.subtle.timingSafeEqual`.
- Isian: nama tampilan, email, dan kata sandi minimal 12 karakter. Akun dibuat lewat API server dengan peran `admin`, tanpa WhatsApp dan tanpa persetujuan.
- Indeks unik parsial `user_satuAdmin_idx` menjamin satu Admin walau ada permintaan bersamaan. Pelanggaran indeks dijawab sebagai 404 atau konflik, bukan 500.
- Keberhasilan dicatat di audit `onboarding_admin`. Setelah itu halaman dan API onboarding menjawab 404.

### Skema D1

- Satu migrasi awal berisi DDL tiket 05 **ditambah amandemen tiket 06**:
  - `user_satuAdmin_idx`;
  - definisi `audit` versi tiket 06 dengan aktor `Sistem`, tindakan baru, dan kolom `keterangan`;
  - tabel `peraturan` (satu baris `id = 1`, ≤ 400.000 karakter);
  - tabel `berkasPublik` beserta indeksnya.
  - Definisi `audit` tiket 05 **tidak** dipakai.
- Tabel `rateLimit` bawaan tidak dibuat. Seluruh tanggal disimpan sebagai teks ISO-8601 UTC.
- Kolom dari skema bawaan Better Auth versi yang dipin dibandingkan ulang dengan generator Better Auth sebelum migrasi dibekukan. Selisih kolom disesuaikan tanpa mengubah kolom milik aplikasi.
- Kepemilikan kolom:
  - **Better Auth:** `user`, `session`, `account`, dan `verification`, termasuk kolom plugin Admin serta additional fields `whatsapp`, `persetujuanVersi`, dan `persetujuanPada`.
  - **Aplikasi:** `profil`, `berkas`, `audit`, `percobaanLogin`, `peraturan`, `berkasPublik`, dan view `vKelengkapan`.
- `vKelengkapan` adalah **satu-satunya** sumber Status Kelengkapan Berkas untuk sidebar, `/akun`, `/akun/berkas`, tabel Admin, dan CSV. Tidak ada perhitungan kelengkapan kedua di TypeScript.
- Kunci `percobaanLogin`: `email:<HMAC>`, `ip:<HMAC>`, dan `konfirmasi:<HMAC sesiId>`, masing-masing berumur paling lama 24 jam.

### Data pribadi

- `profil` (1:1, semua kolom nullable) dibuat saat simpan pertama. Kolomnya: nama panggilan, tempat dan tanggal lahir, asal PW, asal PD, tahun dan tempat lulus DM 3, status instruktur, capaian hafalan, dan bahasa asing. Simpan memakai upsert dan tercatat `ubah_data`.
- Nama lengkap dan WhatsApp tinggal di `user`. Asumsi tercatat: keduanya dapat diubah dari `/akun/data` lewat rute aplikasi yang dijaga tahap, keunikan, dan normalisasi. Email hanya ditampilkan dan tidak dapat diubah, karena perubahan identitas login tidak ada di sitemap.

### Kelompok berkas dan unggahan

- Sepuluh kelompok adalah konstanta kode: nomor, label (tiket 02), format yang diterima (kelompok 6 PDF saja, lainnya PDF/JPEG/PNG), dan aturan hadir.
- **Kontrak unggah:** body permintaan adalah byte berkas mentah, bukan `multipart/form-data`, dengan `Content-Length` wajib sama dengan ukuran berkas. Nama asli, kelompok, dan untuk kelompok 7 `jenisRekomendasi` (`A3_PW` atau `A4_PD`) dikirim di luar body. Kontrak ini memungkinkan streaming ke R2 sambil menghitung SHA-256 tanpa buffer penuh.
- **Urutan unggah** (tiket 05):
  1. tolak bila `bolehUbahBacalon` salah atau `Content-Length` tidak ada, 0, atau > 20 MiB;
  2. validasi ekstensi, MIME, dan signature byte awal (`%PDF-`, JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`) terhadap kelompok;
  3. `R2.put` ke `berkas/<UUIDv4>` dengan `contentType` tervalidasi sambil menghitung SHA-256 lewat digest stream;
  4. `INSERT` bersyarat atomik "jumlah berkas kelompok < 5";
  5. bila nol baris tersisip atau INSERT gagal, hapus objek R2 dan tolak.

  Setiap percobaan dicatat `unggah_berkas`.
- **Hapus berkas:** hapus baris D1, lalu hapus objek R2. Objek yatim karena R2 gagal diterima. Dicatat `hapus_berkas`. Ganti berkas = hapus lalu unggah.
- **Unduh berkas** (pemilik atau Admin): Worker memeriksa sesi, peran, dan kepemilikan, lalu mengalirkan objek dengan `Content-Disposition: attachment` (nama asli dikodekan aman), `Content-Type` dari D1, dan `X-Content-Type-Options: nosniff`. Tidak ada presigned URL, domain publik, atau pratinjau inline.

### Penutupan akun dan Hapus data akun

- **Permintaan Penutupan Akun:** kata sandi diverifikasi server, lalu satu `DB.batch` menjalankan `banned = 1`, `banReason = 'penutupan_akun'`, penghapusan seluruh sesi, dan audit `penutupan_akun`.
- **Hapus data akun** (Admin, hanya untuk akun berpenanda Minta ditutup, dengan konfirmasi kata sandi Admin):
  1. kumpulkan `r2Key`;
  2. satu `DB.batch` menghapus `user` (berantai), menghapus audit yang menyebut akun itu kecuali `hapus_data`, dan menyisipkan audit `hapus_data`;
  3. hapus objek `berkas/` akun itu, `ekspor/terkini/<userId>.zip`, dan `ekspor/pemeriksaan/<userId>.zip`;
  4. tulis ulang `ekspor/terkini/bacalon.csv` dan `ekspor/pemeriksaan/bacalon.csv` tanpa baris akun itu.

### Konfirmasi kata sandi Admin (bersama untuk Reset Password dan Hapus data akun)

- Verifikasi kata sandi Admin di server. Kegagalan menambah `konfirmasi:<HMAC sesiId>`. Kegagalan kelima berturut-turut mencabut sesi Admin itu. Keberhasilan mereset penghitung.
- **Reset Password:** kata sandi 16 karakter dari `crypto.getRandomValues` dengan alfabet tanpa `0 O o 1 l I` dan tanpa bias modulo. Password hash akun sasaran diganti lewat API server Better Auth, seluruh sesi akun sasaran dicabut, kata sandi dikembalikan sekali dalam respons, dan dicatat `reset_kata_sandi`. Kata sandi tidak pernah disimpan atau di-log. Tersedia di tahap mana pun selain Selesai.

### Peraturan dan Berkas Publik

- Peraturan disimpan sebagai Markdown mentah di D1. Simpan menimpa tanpa riwayat dan dicatat `ubah_peraturan`. Rendering di klien memakai renderer Markdown yang **tidak** merender HTML mentah dan hanya mengizinkan tautan `http(s)`, `mailto`, atau relatif. `/tentang` dan pemberitahuan persetujuan memakai renderer yang sama.
- Berkas Publik: PDF atau DOCX ≤ 20 MiB, divalidasi ekstensi + MIME + signature (`%PDF-` atau `PK\x03\x04`), disimpan di `publik/<UUIDv4>` dengan judul, kategori, dan urutan. Unggahan memakai kontrak body mentah yang sama. Unduhan tanpa sesi sebagai attachment + `nosniff`. Hapus bersifat keras. Dicatat `unggah_berkas_publik` dan `hapus_berkas_publik`.
- `/peraturan` = Markdown + Berkas Publik kategori `peraturan`. `/unduhan` = kategori `formulir`, diurutkan menurut `urutan`. Keduanya menampilkan "Menyusul" bila kosong.
- `/tentang` dan pemberitahuan `persetujuan-v1` adalah Markdown statik di repo yang dibundel saat build. Aset `/tentang` berupa berkas statik. Bila `tentang.md` belum tersedia, halaman menampilkan "Menyusul". Pemilik produk menyediakan `tentang.md` dan asetnya; **minta ke pengguna saat langkah ini dikerjakan**.

### Ekspor Harian, Snapshot Pemeriksaan, Penghapusan Akhir (handler `scheduled`)

- Handler terjadwal memakai `scheduledTime` controller sebagai "sekarang", bukan jam dinding, supaya dapat diuji dan deterministik.
- **Bila `tahapPada(scheduledTime)` bukan Selesai: Ekspor Harian.**
  - CSV seluruh Bakal Calon Ketua Umum ditulis ke `ekspor/terkini/bacalon.csv`. Kolomnya berasal dari `user` (tanpa kolom rahasia), `profil`, dan `vKelengkapan`, termasuk penanda Minta ditutup.
  - Per akun, ZIP ditulis ke `ekspor/terkini/<userId>.zip` dengan metode *store* tanpa kompresi. Isinya: data akun, seluruh berkas, dan manifest SHA-256 dari `berkas.sha256`.
  - ZIP dialirkan ke R2 dengan multipart upload dan menimpa versi sebelumnya. Bagian multipart R2 minimal 5 MiB kecuali bagian terakhir. Ukuran per akun < 4 GiB, jadi ZIP64 tidak diperlukan.
  - Hash kata sandi, token sesi, `account`, `session`, `verification`, dan `percobaanLogin` tidak pernah ikut.
  - Pustaka ZIP streaming kecil atau penulis ZIP *store* sendiri boleh dipakai; pilih yang paling sederhana.
  - Akhiri dengan audit `ekspor_harian` berhasil. Pengecualian yang tertangkap menghasilkan audit `ekspor_harian` gagal.
- **Snapshot Pemeriksaan.** Bila tanggal WIB `scheduledTime` = 5 Oktober 2026 dan `ekspor/pemeriksaan/bacalon.csv` belum ada, hasil run disalin ke `ekspor/pemeriksaan/` setelah ekspor selesai. Salinan tidak pernah ditimpa run lain.
- **Bila tahap Selesai: Penghapusan Akhir.**
  - Daftar dan hapus seluruh objek `berkas/`, `ekspor/`, dan `publik/`.
  - Hapus seluruh baris semua tabel, termasuk `peraturan` dan `audit`.
  - Bila belum ada audit `hapus_data` beraktor `Sistem`, sisipkan tepat satu. `keterangan`-nya berisi jumlah baris per tabel dan jumlah objek R2 yang dihapus. Run berikutnya mengulang penghapusan sisa tanpa menyisipkan audit kedua.
  - Tidak ada konfirmasi dan tidak ada pemberitahuan.
- Satu invocation cron memikul seluruh pekerjaan. Kegagalan karena batas CPU terlihat dari tiadanya audit `ekspor_harian` hari itu.
- `/admin/ekspor` dan `/admin/:id` hanya **mengunduh** objek terakhir, dengan varian "Terkini" dan "Pemeriksaan". Setiap unduhan dicatat `ekspor`. Tidak ada pembuatan paket sesuai permintaan.

### Audit

- Tindakan yang dicatat: login, registrasi, reset kata sandi, unggah dan hapus berkas, ubah data, ekspor, penutupan akun, hapus data, onboarding Admin, ubah Peraturan, unggah dan hapus Berkas Publik, serta ekspor harian.
- Setiap baris berisi waktu, `sesiId`, aktor, `aktorUserId`, sasaran, dan hasil. `keterangan` hanya untuk aktor `Sistem`.
- Aktor bernilai `Admin bersama`, `Bakal Calon Ketua Umum`, `Anonim` (login gagal, registrasi ditolak), atau `Sistem`.
- Audit tidak memuat data pribadi (email, nama, WhatsApp, nama berkas) dan tidak memiliki foreign key.
- `/admin/audit` membaca terbaru lebih dulu dengan pembatasan halaman sederhana.

### Klien React (Varian A — Situs dokumen)

- Sitemap persis tiket 04 ditambah `/onboard` dan `/admin/peraturan`:
  - **Publik:** `/`, `/peraturan`, `/jadwal`, `/unduhan`, `/tentang`, `/masuk` dan `/daftar` (satu gerbang dua tab).
  - **Bakal Calon:** `/bacalon`, `/bacalon/data`, `/bacalon/berkas`, `/bacalon/berkas/:no`, `/bacalon/pengaturan` (amandemen: dipindah dari `/akun`, layout dasbor disamakan dengan Admin).
  - **Admin:** `/admin`, `/admin/:id`, `/admin/ekspor`, `/admin/audit`, `/admin/peraturan`.
- Shell SPA boleh termuat tanpa sesi. **Otorisasi selalu di API**: rute klien `/bacalon` dan `/admin` mengarahkan ke `/masuk` atau menampilkan penolakan berdasarkan jawaban API, dan tidak ada data yang tertanam di bundel.
- Komponen tetap:
  - spanduk tahap di beranda dan di atas seluruh rute akun;
  - sidebar akun dengan `x/10` + label;
  - footer penegasan di **setiap** rute, kecuali gerbang `/masuk`, `/daftar`, `/onboard` (amandemen);
  - layar Selesai yang menggantikan semua rute pada tahap Selesai.
- UI memakai komponen shadcn (Base UI) dan kelas Tailwind, termasuk nilai arbitrer, tanpa CSS tulisan tangan. Tata letak mengacu ke prototipe Varian A pada branch `prototype/blueprint-tiga-peran` (commit `d9ade51`). Prototipe itu kode buang, bukan untuk disalin mentah. Judul dokumen dan salinan Coming Soon diganti.
- Seluruh salinan UI berbahasa Indonesia dan memakai istilah `CONTEXT.md`. Label berikut dilarang di antarmuka mana pun: `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`, `Calon Ketua Umum` (sebagai status), `kirim pendaftaran`, `kandidat`, `KPU RI`.

### Kontrak API (bentuk, bukan jalur final)

- Publik: tahap berjalan beserta jadwal, Peraturan, daftar Berkas Publik per kategori, dan unduh Berkas Publik.
- Auth: registrasi, login, keluar, dan sesi (Better Auth, diperkecil).
- Bakal Calon: ringkasan akun berisi profil dan baris `vKelengkapan`; simpan data; daftar berkas per kelompok; unggah; hapus; unduh; rekaman persetujuan; Permintaan Penutupan Akun.
- Admin: tabel dengan pencarian nama; detail; unduh berkas; unduh ZIP akun; Reset Password; Hapus data akun; simpan Peraturan; unggah dan hapus Berkas Publik; unduh ekspor terkini dan pemeriksaan; audit.
- Onboarding: status ketersediaan dan buat Admin.
- Penolakan tahap memakai status dan kode galat yang konsisten (misalnya `403` dengan kode `tahap_tertutup` beserta nama tahap) agar antarmuka dapat menampilkan alasan.

## Testing Decisions

### Apa itu uji yang baik di sini

- Uji hanya perilaku yang teramati dari luar: status HTTP, body JSON, header unduhan, baris D1 dan objek R2 yang dihasilkan, serta audit yang tertulis. Uji tidak menyentuh fungsi internal, hook Better Auth, atau bentuk query.
- Setiap butir acceptance 1–35 (tiket 04 dan 06) yang dapat diotomatiskan dipetakan ke satu atau lebih uji dengan nomor butir di namanya. Butir yang hanya dapat diperiksa di produksi (35, dan pemeriksaan `curl` checklist C14) diverifikasi manual sesuai checklist tiket 06 bagian E.
- Perilaku yang bergantung waktu **selalu** diuji dengan jam yang disuntikkan pada instan batas: tepat sebelum dan tepat pada setiap pergantian tahap.
- Pakai skill `tdd` untuk modul tahap, aturan unggah, kelengkapan, dan cron.

### Seam yang diusulkan

Belum ada infrastruktur uji maupun prior art di repo. Seam dijaga sesedikit mungkin:

1. **Seam utama — entry Worker yang dibangun dengan jam tersuntik.** Fungsi pembuat Worker menerima `sekarang` dan mengembalikan objek `{ fetch, scheduled }` yang sama dengan ekspor default. Uji berjalan di runtime Workers (Vitest + `@cloudflare/vitest-pool-workers`) dengan D1 dan R2 lokal, dan migrasi diterapkan sebelum uji. Uji mengirim `Request` sungguhan dan memanggil `scheduled` dengan `scheduledTime` pilihan. Seam ini mencakup auth, onboarding, unggah, kelengkapan, tahap × kemampuan, Reset Password, penutupan, Hapus data akun, Peraturan, Berkas Publik, ekspor, Snapshot, Penghapusan Akhir, dan audit. Periksa dokumentasi terkini paket pool-workers, pemasangan migrasi D1 dalam uji, dan cara menguji handler terjadwal sebelum menyiapkan.
2. **Seam kedua (murni) — `tahapPada` dan predikat turunannya.** Uji tabel batas instan untuk keenam tahap dan sepuluh tanggal jadwal. Seam ini tetap terpisah karena murah, mengunci kalender, dan menjadi dasar semua uji lain. Uji ini tidak memerlukan runtime Workers.

Verifikasi Turnstile dalam uji memakai kunci uji Cloudflare (selalu lolos / selalu gagal) dengan permintaan keluar ke siteverify di-stub pada tingkat jaringan. Seam ketiga tidak ditambahkan untuk Turnstile.

Klien React tidak diuji otomatis. Butir UI (spanduk, tombol nonaktif beserta alasannya, footer, Turnstile tampil setelah tiga kegagalan, konsistensi `x/10`) diperiksa lewat `wrangler dev`/`vite` di peramban dengan jam lokal yang disuntikkan. Butir yang ditegakkan server tetap diuji di seam utama.

### Modul dan skenario wajib diuji

- **Tahap:** batas 16 Sep 2026 16.59.59Z / 17.00.00Z, dan batas setara untuk 4 Okt, 7 Okt, 11 Okt 2026 serta 24 Jan 2027. Predikat registrasi, ubah, dan layanan aktif pada tiap tahap.
- **Registrasi dan login:**
  - tolak di luar Masa Pendaftaran (butir 8, 17);
  - tolak tanpa persetujuan;
  - email dan WhatsApp unik serta ternormalisasi (butir 7);
  - Turnstile wajib setelah tiga kegagalan (butir 9);
  - peran selalu `bacalon`;
  - endpoint Better Auth yang diblokir menjawab 404;
  - akun ber-ban tidak dapat login.
- **Sesi:** batas tidak aktif dan absolut per peran; login keenam mencabut yang tertua; sesi Bakal Calon ditolak di API Admin (butir 20); tanpa sesi ditolak di API akun (butir 11).
- **Unggah:**
  - kelompok 6 PDF saja (butir 14);
  - > 20 MiB dan berkas keenam ditolak (butir 15);
  - signature palsu ditolak;
  - SHA-256 tersimpan cocok;
  - kegagalan INSERT tidak meninggalkan objek R2;
  - tahap Pemeriksaan dan Terkunci menolak simpan, unggah, dan hapus (butir 16);
  - Masa Perbaikan mengizinkan (butir 17).
- **Kelengkapan:** 2 A.3 hadir, 3 A.4 hadir, 1 A.3 + 2 A.4 belum hadir (butir 13); nilai sama di API akun dan tabel Admin (butir 12, 21).
- **Unduhan:** header attachment dan `nosniff`; akun lain tidak dapat mengunduh (butir 22).
- **Onboarding:** token salah, token tidak terpasang, 404 setelah Admin ada, dan dua permintaan bersamaan menghasilkan satu Admin (butir 26).
- **Reset Password:**
  - konfirmasi salah ditolak;
  - kegagalan kelima mencabut sesi Admin;
  - kata sandi 16 karakter tanpa karakter ambigu dapat dipakai login;
  - sesi sasaran dicabut (butir 23, 27).
- **Penutupan dan hapus data:**
  - penutupan menuntut kata sandi, mengunci akun, dan mencabut sesi (butir 19);
  - Hapus data akun hanya untuk Minta ditutup dan menghapus D1, objek `berkas/`, kedua ZIP, serta baris di kedua CSV (butir 30).
- **Peraturan:** Markdown berisi `<script>`, atribut `on*`, dan `javascript:` tersimpan apa adanya dan tidak pernah dijawab sebagai HTML. Rendering aman diperiksa di peramban (butir 28).
- **Berkas Publik:** PDF/DOCX ≤ 20 MiB saja, unduh tanpa sesi sebagai attachment, pemisahan kategori (butir 29).
- **Ekspor:** CSV dan ZIP tidak memuat kolom rahasia (butir 24); manifest cocok dengan SHA-256; audit `ekspor_harian`; run 5 Okt membuat Snapshot sekali dan run 6 Okt tidak menimpanya (butir 31).
- **Penghapusan Akhir:** run pertama mengosongkan R2 dan semua tabel serta menyisakan satu audit `Sistem`; run kedua tidak menambah audit (butir 32); tahap Selesai menolak login, registrasi, dan API (butir 33).
- **Audit:** tindakan Admin tercatat dengan aktor `Admin bersama` dan `sesiId` (butir 25); audit tidak memuat email, nama, atau nama berkas.
- **Rute publik:** tidak ada data Bakal Calon di respons API publik (butir 1).

## Out of Scope

- Pemungutan, penghitungan, atau penetapan suara di forum Muktamar.
- Validasi keabsahan berkas, uji kualifikasi, penetapan Calon Ketua Umum, dan status `Gugur`, `Lulus`, `Terverifikasi`, atau `Mengundurkan Diri`.
- Penerbitan pengumuman resmi, berita, atau riwayat versi Peraturan.
- Penayangan identitas, profil, status, atau berkas Bakal Calon Ketua Umum kepada publik.
- Payment gateway atau verifikasi pembayaran; kelompok 10 hanya mencatat keberadaan bukti transfer.
- Multi-admin, matriks peran, delegasi, dan rotasi kata sandi Admin.
- Penerbitan rekomendasi PW/PD di aplikasi atau direktori pemberi rekomendasi.
- Verifikasi email, reset kata sandi mandiri, OTP, layanan email, dan notifikasi apa pun.
- Perubahan email atau kata sandi oleh Bakal Calon sendiri.
- Pemindaian antivirus, pratinjau berkas inline, presigned URL, dan domain publik R2.
- Ekspor sesuai permintaan, enkripsi paket ekspor, dan konfirmasi serah-terima.
- Lingkungan staging, endpoint migrasi, dan provisioning resource otomatis.
- Pengujian otomatis komponen React.
- Live streaming debat, kampanye, forum, dan pesan internal.
- Langkah checklist peluncuran bagian A–E, runbook, dan penghentian manual setelah 24 Februari 2027. Semuanya tugas manusia di tiket 06, bukan kode.

## Further Notes

- **Tenggat keras:** 16 September 2026 17.00 UTC. Jangan membuka ulang ruang lingkup. Urutan kerja yang disarankan (bukan keputusan):
  1. config dan binding;
  2. migrasi;
  3. modul tahap;
  4. Better Auth dan onboarding;
  5. rute Bakal Calon dan unggahan;
  6. rute Admin;
  7. handler terjadwal;
  8. halaman publik dan footer;
  9. checklist tiket 06 C–E di produksi.
- **Skill wajib saat implementasi:**
  - `ponytail` sebelum menulis kode;
  - `ponytail-review` dan `code-review` pada setiap diff;
  - `security-review` sebelum deploy produksi;
  - `workers-best-practices`, `wrangler`, dan `cloudflare`, dengan dokumentasi terkini lewat MCP dokumentasi Cloudflare, untuk setiap pekerjaan Workers, D1, R2, cron, atau Turnstile;
  - skill Better Auth untuk autentikasi;
  - `turnstile-spin` untuk Turnstile;
  - `shadcn` untuk UI.
- **Asumsi yang dibuat spesifikasi ini** (koreksi bila keliru):
  - Permintaan Penutupan Akun tersedia di semua tahap selain Selesai.
  - Nama dan WhatsApp dapat diubah Bakal Calon dalam jendela ubah; email tidak.
  - Endpoint HTTP Better Auth di luar registrasi, login, keluar, dan sesi diblokir.
  - Unggahan memakai body mentah.
  - Snapshot hanya dibuat oleh run bertanggal WIB 5 Oktober 2026; bila run itu gagal, tidak ada Snapshot pengganti otomatis.
- **Rekonsiliasi antartiket:**
  - Acceptance butir 2 tiket 04 ("kelima tahap") dibaca sebagai keenam tahap.
  - `/admin/ekspor` tiket 04 dibaca sebagai unduhan hasil harian.
  - Pemulihan Admin tiket 03 dibaca sebagai onboarding ulang.
  - Definisi `audit` tiket 05 diganti versi tiket 06.
- `PRODUCT.md` dan `DESIGN.md` masih menggambarkan halaman Coming Soon. Keduanya usang terhadap spesifikasi ini. Token warna dan font yang ada boleh dipertahankan, tetapi klaim "tanpa produk" tidak lagi berlaku.
- `package.json` masih bernama template. Hal ini tidak berbahaya dan tidak perlu diubah.
- Isi `tentang.md` beserta aset, teks Peraturan, PDF PKPU, dan Formulir A.1–A.6 disediakan pemilik produk dan Admin, bukan developer. Hanya `persetujuan-v1.md` yang ditulis developer, dari unsur tiket 03 dan tanggal penghapusan 25 Januari 2027.
