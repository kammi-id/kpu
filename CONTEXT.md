# Penjaringan Calon Ketua Umum PP KAMMI

Konteks ini menjelaskan bahasa resmi proses penjaringan Calon Ketua Umum PP KAMMI pada Muktamar XIV KAMMI 2026.

## Language

**Komisi Penjaringan Umum Muktamar (KPU)**:
Badan internal Muktamar KAMMI yang mengelola tahapan penjaringan, verifikasi, dan penetapan Calon Ketua Umum PP KAMMI. Tidak memiliki hubungan atau afiliasi dengan KPU RI dan tidak menyelenggarakan pemilihan umum nasional.
_Avoid_: panitia pemilu, KPU RI, KPU nasional, pemilihan umum nasional

**Bakal Calon Ketua Umum (Bacalon)**:
Anggota Biasa III KAMMI yang telah membuat akun aplikasi KPU tetapi belum dinyatakan memenuhi seluruh persyaratan administrasi dan kualifikasi. Status operasional ini tidak berarti identitas, keanggotaan, atau berkasnya telah dinyatakan sah oleh KPU.
_Avoid_: kandidat, calon tetap

**Status Kelengkapan Berkas**:
Penanda otomatis berupa status tiap kelompok, jumlah kelompok terpenuhi, dan hasil keseluruhan bahwa sembilan kelompok berkas yang diwajibkan telah berada di sistem. Formulir A.3 dan A.4 berada dalam satu kelompok rekomendasi yang terpenuhi melalui salah satu Jalur Rekomendasi; status ini tidak menyatakan keabsahan isi atau kelulusan verifikasi KPU.
_Avoid_: status verifikasi, berkas sah, lulus administrasi

**Kelompok Berkas**:
Salah satu dari sembilan kategori berkas wajib yang diunggah Bakal Calon Ketua Umum agar Status Kelengkapan Berkas menyatakan lengkap. Kelompok 1 adalah Formulir A.1 Bacalon.
_Avoid_: jenis berkas, kategori unggahan

**Masa Pendaftaran**:
Periode 17 September 2026 pukul 00.00 WIB sampai 30 September 2026 pukul 23.59 WIB ketika akun baru dapat dibuat dan Bakal Calon Ketua Umum dapat mengelola data serta berkasnya, sesuai pengumuman perpanjangan pendaftaran September 2026.
_Avoid_: masa verifikasi, masa perbaikan

**Masa Perbaikan**:
Periode 3 Oktober 2026 pukul 00.00 WIB sampai 5 Oktober 2026 pukul 23.59 WIB ketika akun baru tidak dapat dibuat, tetapi semua Bakal Calon Ketua Umum yang sudah memiliki akun dapat memperbaiki data dan berkas.
_Avoid_: perpanjangan pendaftaran, pendaftaran ulang

**Calon Ketua Umum**:
Bakal Calon Ketua Umum yang telah lulus verifikasi administrasi dan uji kualifikasi serta ditetapkan resmi oleh KPU untuk mengikuti forum Muktamar.
_Avoid_: bacalon, pendaftar

**Rekomendasi**:
Surat dukungan tertulis dari Pengurus Wilayah dan atau Pengurus Daerah kepada seorang Bakal Calon Ketua Umum sesuai ketentuan PKPU.
_Avoid_: suara, endorsement informal

**Jalur Rekomendasi**:
Pilihan pemenuhan rekomendasi melalui sedikitnya dua berkas PW atau sedikitnya tiga berkas PD. Aplikasi menghitung keberadaan berkas A.3 dan A.4 dalam satu kelompok unggahan multifile, sedangkan KPU memeriksa asal dan keabsahan surat secara manual.
_Avoid_: rekomendasi terverifikasi, dukungan sah

**Pengurus Wilayah (PW)**:
Instansi kepemimpinan KAMMI di tingkat provinsi.
_Avoid_: wilayah, provinsi

**Pengurus Daerah (PD)**:
Instansi kepemimpinan KAMMI di tingkat kabupaten atau kota.
_Avoid_: daerah, cabang

**Anggota Biasa III (AB 3)**:
Jenjang keanggotaan tertinggi dalam struktur kaderisasi KAMMI, dan menjadi syarat status keanggotaan Bakal Calon Ketua Umum.
_Avoid_: DM 3, anggota senior

**Sistem Keanggotaan KAMMI (kammi.id)**:
Sistem milik PP KAMMI yang menjadi satu-satunya sumber kebenaran untuk data keanggotaan seorang kader, termasuk NIA, jenjang kaderisasi, dan keadaan kader. Aplikasi KPU bukan pengelola data keanggotaan; ia hanya membaca data ini lewat Verifikasi NIA.
_Avoid_: basis data anggota, sumber data eksternal

**NIA (Nomor Induk Anggota)**:
Identitas 11 digit seorang kader di Sistem Keanggotaan KAMMI, dipakai untuk memverifikasi status keanggotaannya sebelum akun Bakal Calon dibuat.
_Avoid_: NIK, NIM, nomor anggota, ID pengguna

**Verifikasi NIA**:
Proses mencocokkan sebuah NIA ke Sistem Keanggotaan KAMMI untuk memastikan nama, jenjang kaderisasi Anggota Biasa III, dan Keadaan Kader aktif terpenuhi, sebagai syarat pembuatan akun Bakal Calon. Berbeda dari uji kualifikasi Calon Ketua Umum yang dilakukan KPU kemudian.
_Avoid_: Cek NIA (label tombol UI, bukan istilah domain), validasi NIA

**Keadaan Kader**:
Status keaktifan seorang kader di Sistem Keanggotaan KAMMI. Hanya keadaan "aktif" yang meloloskan Verifikasi NIA; keadaan lain apa pun dianggap tidak memenuhi syarat.
_Avoid_: status anggota, status akun

**Muktamar**:
Permusyawaratan tertinggi KAMMI yang antara lain berwenang memilih dan menetapkan Ketua Umum PP KAMMI.
_Avoid_: pemilu daring, rapat KPU

**Admin bersama**:
Satu akun Admin tunggal yang kredensialnya dipakai bersama oleh beberapa anggota KPU. Audit mencatat aktor sebagai `Admin bersama` beserta sesi dan waktu, dan tidak pernah mengklaim atribusi kepada individu tertentu.
_Avoid_: akun operator, multi-admin, role matrix

**Pengendali Data Pribadi**:
PP KAMMI melalui Komisi Penjaringan Umum Muktamar XIV KAMMI 2026, sebagai pihak yang menentukan tujuan dan mengendalikan pemrosesan data Bakal Calon Ketua Umum. Cloudflare hanya penyedia infrastruktur dan bukan pengendali.
_Avoid_: admin sistem, Cloudflare, penyelenggara negara

**Persetujuan Pemrosesan Data**:
Persetujuan eksplisit yang diberikan saat registrasi melalui checkbox yang tidak tercentang otomatis. Sistem merekam versi pemberitahuan, waktu, dan akun pemberi persetujuan.
_Avoid_: syarat dan ketentuan, persetujuan implisit

**Permintaan Penutupan Akun dan Penarikan Persetujuan**:
Permintaan Bakal Calon Ketua Umum untuk menghentikan pemrosesan datanya. Akun langsung dikunci dan Admin memproses penghentian atau penghapusan paling lambat 3×24 jam. Permintaan ini tidak menetapkan status hukum pencalonan apa pun.
_Avoid_: mengundurkan diri, gugur, hapus akun instan

**Penghapusan Data Akun**:
Tindakan Admin yang menghapus permanen akun seorang Bakal Calon Ketua Umum beserta seluruh data dan berkasnya, termasuk dari Ekspor Harian dan Snapshot Pemeriksaan, setelah Admin mengonfirmasi kata sandinya. Tindakan ini dapat dilakukan kapan saja sebelum Penghapusan Akhir, baik untuk memproses Permintaan Penutupan Akun dan Penarikan Persetujuan maupun untuk akun ganda, akun uji, atau permintaan penutupan yang disampaikan di luar aplikasi. Penghapusan ini bukan keputusan atas status pencalonan. Satu-satunya jejak yang tersisa adalah catatan audit bahwa penghapusan terjadi.
_Avoid_: menggugurkan bacalon, diskualifikasi, hapus bacalon

**Masa Retensi**:
Jangka 90 hari sejak penutupan resmi proses penjaringan pada 30 Oktober 2026, ketika data masih disimpan dan dapat diekspor. Masa ini berakhir dengan Penghapusan Akhir pada 28 Januari 2027.
_Avoid_: arsip permanen, backup jangka panjang

**Penghapusan Akhir**:
Penghapusan otomatis seluruh data dan berkas aplikasi pada 28 Januari 2027 pukul 00.00 WIB, tanpa konfirmasi serah-terima atau sengketa. Satu-satunya yang tersisa adalah catatan non-pribadi berisi jumlah yang dihapus; penghapusan dinyatakan tuntas setelah jendela pemulihan otomatis platform berakhir pada 27 Februari 2027.
_Avoid_: arsip, penghapusan manual, penutupan akun

**Tahap Selesai**:
Keadaan aplikasi sejak Penghapusan Akhir, ketika situs hanya menyatakan bahwa proses penjaringan telah selesai dan datanya telah dihapus.
_Avoid_: Terkunci, masa tenang

**Ekspor Harian**:
Paket data dan berkas seluruh Bakal Calon Ketua Umum yang dibuat ulang setiap pukul 00.00 WIB dan menggantikan paket hari sebelumnya. Admin mengunduh paket terakhir; tidak ada pembuatan paket sesuai permintaan.
_Avoid_: backup, arsip serah-terima terenkripsi

**Snapshot Pemeriksaan**:
Salinan Ekspor Harian 1 Oktober 2026 pukul 00.00 WIB yang tidak pernah ditimpa, sebagai bukti keadaan berkas pada awal verifikasi administrasi menurut jadwal terbaru. Jika salinan 27 September sempat dibuat, salinan itu tetap tersimpan sebagai riwayat; Penghapusan Data Akun tetap mengurangi keduanya.
_Avoid_: hasil verifikasi, berkas sah

**Peraturan**:
Satu dokumen ringkasan PKPU yang ditulis dan diperbarui Admin untuk halaman publik, beserta Berkas Publik kategori peraturan. Dokumen ini bukan kanal pengumuman resmi dan tidak mengubah jadwal resmi.
_Avoid_: pengumuman, berita, jadwal

**Berkas Publik**:
Berkas yang diunggah Admin untuk diunduh siapa pun tanpa akun, yaitu dokumen PKPU dan Formulir A.1 sampai A.6. Berkas ini tidak pernah memuat data Bakal Calon Ketua Umum.
_Avoid_: berkas Bakal Calon, lampiran pendaftaran

**Formulir A.1 Bacalon**:
Salinan Formulir A.1 yang telah diisi dan ditandatangani oleh seorang Bakal Calon Ketua Umum, diunggah sebagai Kelompok Berkas pertama dari sembilan yang diwajibkan. Berbeda dari Formulir A.1 kosong di bawah Berkas Publik, yang menjadi templat unduhan dan tidak pernah memuat data Bakal Calon.
_Avoid_: Formulir A.1 (tanpa konteks), berkas A.1

**Onboarding Admin**:
Pembuatan satu-satunya akun Admin bersama melalui halaman bertoken rahasia yang hanya terbuka selama akun Admin belum ada. Onboarding ulang adalah satu-satunya jalan pemulihan akses Admin.
_Avoid_: registrasi Admin, reset kata sandi Admin

**Penutupan Pendaftaran Manual**:
Sakelar yang Admin aktifkan dari halaman Pengaturan untuk menutup pendaftaran akun baru kapan pun selama Masa Pendaftaran berlangsung, terlepas dari jadwalnya. Sakelar ini hanya dapat menutup; ia tidak pernah membuka pendaftaran di luar Masa Pendaftaran yang terjadwal.
_Avoid_: penundaan pendaftaran, perpanjangan pendaftaran, penutupan otomatis
