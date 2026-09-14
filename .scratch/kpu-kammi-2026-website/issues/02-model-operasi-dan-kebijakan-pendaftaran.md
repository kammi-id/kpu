# Model Operasi dan Kebijakan Pendaftaran

Type: grilling
Status: resolved
Blocked by: 01

## Question

Model operasi minimum apa yang harus diberlakukan website? Putuskan arti masa pakai dua hari terhadap jadwal September–Oktober; kalender resmi; apakah rekomendasi memakai jalur PW atau PD serta dokumen yang wajib; kapan Bakal Calon boleh membuat, mengubah, mengirim, dan memperbaiki pendaftaran; apa yang dicatat dari uji kualifikasi; kondisi gugur atau mengundurkan diri; alur penerbitan pengumuman resmi; dan data kandidat apa yang boleh tampil ke publik. Hasilnya harus berupa state machine domain yang ringkas dan aturan yang dapat diuji.

## Comments

## Answer

Website mulai digunakan pada pembukaan Masa Pendaftaran, 17 September 2026 pukul 00.00 WIB. Frasa “digunakan hanya dalam 2 hari” berarti pada saat keputusan dibuat tersisa dua hari menuju tanggal mulai tersebut; frasa itu bukan batas umur dua hari untuk website.

### Kalender resmi

Seluruh batas waktu memakai zona `Asia/Jakarta` (WIB). Hari terakhir suatu tahap berakhir pukul 23.59 WIB.

| Tahap | Waktu resmi |
| --- | --- |
| Pengumuman dan sosialisasi | 13–16 September 2026 |
| Pengambilan dan pengembalian berkas | 17 September–4 Oktober 2026 |
| Verifikasi administrasi dan uji kualifikasi | 5–7 Oktober 2026 |
| Perbaikan kelengkapan | 8–11 Oktober 2026 |
| Penetapan | 12 Oktober 2026 |
| Visi-misi dan kampanye | 13–18 Oktober 2026 |
| Debat I | 19 Oktober 2026 |
| Debat II | 23 Oktober 2026 |
| Masa tenang | 25–26 Oktober 2026 |
| Forum Muktamar | mulai 27 Oktober 2026 |

### State machine operasional aplikasi

1. **Belum dibuka** — sebelum 17 September pukul 00.00: akun baru dan perubahan data/berkas ditolak.
2. **Masa Pendaftaran** — 17 September pukul 00.00 sampai 4 Oktober pukul 23.59: akun baru boleh dibuat; pemilik akun boleh menambah, mengganti, atau menghapus seluruh data dan berkas.
3. **Pemeriksaan** — 5–7 Oktober: akun baru dan seluruh perubahan oleh Bakal Calon ditolak; data dan berkas bersifat hanya-baca.
4. **Masa Perbaikan** — 8 Oktober pukul 00.00 sampai 11 Oktober pukul 23.59: akun baru tetap ditolak; semua pemilik akun lama boleh kembali mengubah seluruh data dan berkas.
5. **Terkunci** — mulai 12 Oktober pukul 00.00: akun baru dan seluruh perubahan oleh Bakal Calon ditolak secara permanen untuk siklus ini.

Pembuatan akun langsung menjadikan pemiliknya **Bakal Calon Ketua Umum** dalam arti operasional aplikasi. Tidak ada tombol atau status “kirim pendaftaran”: setiap perubahan yang berhasil disimpan langsung menjadi keadaan terkini.

### Status Kelengkapan Berkas

Dashboard Admin menampilkan status hadir/belum hadir per kelompok, progres `x/10`, dan hasil keseluruhan `Lengkap` atau `Belum lengkap`. Sepuluh kelompok unggahan ialah:

1. Formulir A.1 yang telah ditandatangani.
2. KTA atau Sertifikat DM 3.
3. SK kepengurusan PD dan/atau PW.
4. Sertifikat atau SK Instruktur KAMMI.
5. Surat keterangan sehat jasmani dan rohani.
6. Karya tulis ilmiah asli.
7. Rekomendasi A.3 dan/atau A.4 dalam satu kelompok unggahan multifile.
8. Komitmen hafalan A.5.
9. Pernyataan tidak sedang dijatuhi sanksi A.6.
10. Bukti transfer biaya pendaftaran.

Kelompok rekomendasi dianggap hadir bila sistem menyimpan sedikitnya dua berkas A.3 dari PW atau sedikitnya tiga berkas A.4 dari PD. Antarmuka mengakomodasi keduanya dalam kelompok multifile yang sama. Sistem hanya menghitung keberadaan dan jumlah file; identitas penerbit, asal/struktur, tanda tangan, pengecualian dukungan ganda, dan keabsahan surat diperiksa KPU secara manual.

Untuk seluruh kelompok, `Lengkap` hanya berarti file yang disyaratkan telah berada di sistem. Istilah itu tidak berarti sah, terverifikasi, atau lulus administrasi.

### Batas tanggung jawab aplikasi

- Aplikasi tidak mencatat atau menetapkan status `Gugur`, `Lulus`, `Terverifikasi`, `Mengundurkan Diri`, maupun `Calon Ketua Umum`.
- Verifikasi keabsahan berkas, uji kualifikasi, keputusan gugur/pengunduran diri, penetapan Calon Ketua Umum, dan penerbitan pengumuman resmi dilakukan KPU di luar mekanisme aplikasi.
- Ketika tenggat tercapai, aplikasi hanya mengunci perubahan. Akun yang belum lengkap tetap ditampilkan sebagai `Belum lengkap`; sistem tidak otomatis menggugurkannya.
- Website publik tidak menampilkan identitas, profil, status, atau berkas Bakal Calon Ketua Umum.

### Amandemen — 15 September 2026

Sebagian keputusan tiket ini diamandemen oleh [Batas Operasional: Peluncuran, Serah-Terima, dan Penghentian](06-batas-operasional-peluncuran-dan-penghentian.md), bagian "Amandemen tiket sebelumnya". Bila bertentangan, tiket tersebut yang berlaku.
