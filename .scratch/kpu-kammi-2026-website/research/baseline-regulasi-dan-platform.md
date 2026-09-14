# Baseline Regulasi dan Batas Platform

## Kesimpulan

Spesifikasi minimum harus memperlakukan DOCX sebagai sumber normatif dan PPTX hanya sebagai penjelas. Kalender PPTX bertentangan dengan Lampiran I DOCX pada tahap 2 sampai 8, sementara DOCX sendiri memuat salah ketik dan rujukan huruf tahap yang tidak konsisten. Karena itu, sistem belum boleh mengunci tanggal pendaftaran, verifikasi, perbaikan, penetapan, kampanye, atau debat sampai KPU menerbitkan satu kalender koreksi.

Arsitektur yang sudah dipilih cocok untuk batas minimum: Workers melayani SPA dan API, D1 menyimpan akun/status/metadata, dan R2 menyimpan berkas. Namun repo sekarang baru berupa scaffold tanpa binding D1/R2 dan tanpa autentikasi. Berkas pendaftaran mengandung data pribadi, kesehatan, agama, riwayat organisasi, dan pembayaran sehingga bucket R2 harus tetap privat dan akses baca/tulis wajib melewati otorisasi aplikasi.

## Sumber dan metode

- Normatif: `PKPU Muktamar KAMMI 2026.docx`, SHA-256 `6d8b38739b4c4c42d3c5a2c3e0a33e4c98eeb184a201089b7a63db48cbda6cc8`.
- Penjelas: `PKPU Muktamar KAMMI 2026.pptx`, SHA-256 `0b414d5224e555116663b9d7128e9892aebb157b65a174a126bf32f293991700`.
- Lokal: [`wrangler.json`](../../../wrangler.json), [`package.json`](../../../package.json), [`src/worker/index.ts`](../../../src/worker/index.ts), dan `worker-configuration.d.ts` pada commit dasar `888a969`.
- Platform: dokumentasi resmi Cloudflare yang ditautkan per klaim, diperiksa 15 September 2026.

LibreOffice dan Pandoc tidak tersedia. Teks kedua lampiran dibaca lewat ekstraksi OOXML read-only; inspeksi visual native Word/PowerPoint dilakukan oleh agen induk. Catatan ini tidak menilai tata letak, gambar, atau teks yang mungkin hanya hadir sebagai raster.

## Baseline normatif untuk produk

### Data yang harus dapat dikumpulkan

Formulir A.1 menetapkan bidang berikut:

- identitas: nama lengkap, nama panggilan, tempat dan tanggal lahir;
- afiliasi: asal PW dan asal PD;
- kontak: nomor kontak/WhatsApp dan email;
- kaderisasi: tahun serta tempat kelulusan DM 3, status Instruktur KAMMI;
- kualifikasi: capaian hafalan Al-Qur'an saat ini dan kemampuan bahasa asing;
- pernyataan kesiapan mengikuti seluruh tahapan, tempat/tanggal pernyataan, nama terang, dan tanda tangan.

Pasal 5 sampai Pasal 8 juga menetapkan fakta yang harus dapat diverifikasi: hafalan minimal 2 juz dan komitmen menambah minimal 3 juz jika terpilih; AB 3; pernah menjadi pengurus PD dan/atau PW; telah menjadi instruktur; tidak sedang mendapat sanksi; tidak sedang diperpanjang masa keanggotaannya karena menjabat; sehat jasmani dan rohani; bahasa asing minimal pasif; karya ilmiah; serta dukungan organisasi.

### Berkas yang harus dapat disimpan dan diperiksa

Pasal 13 dan Formulir A.2 mencantumkan 11 kelompok berkas:

1. Formulir A.1.
2. Salinan KTA atau Sertifikat DM 3 sebagai bukti AB 3.
3. SK kepengurusan sebagai bukti pernah menjadi pengurus PD dan/atau PW.
4. Sertifikat atau SK Instruktur KAMMI.
5. Surat keterangan sehat jasmani dan rohani dari rumah sakit/puskesmas.
6. Naskah karya tulis ilmiah asli.
7. Rekomendasi PW, Formulir A.3.
8. Rekomendasi PD, Formulir A.4.
9. Komitmen hafalan, Formulir A.5, dengan meterai Rp10.000 menurut checklist.
10. Pernyataan tidak sedang dijatuhi sanksi, Formulir A.6, dengan meterai Rp10.000 menurut checklist.
11. Bukti transfer biaya pendaftaran Rp3.000.000 yang sah.

Formulir rekomendasi memerlukan kop surat, nomor surat, identitas pihak yang didukung, tempat/tanggal penetapan, serta nama/tanda tangan Ketua Umum dan Sekretaris Umum PW/PD. Biaya bersifat tidak dapat dikembalikan dan harus ditransfer ke rekening resmi KPU atau rekening yang ditunjuk resmi, tetapi dokumen tidak memberikan nomor rekening.

### Aturan dukungan

Pasal 8 menyediakan dua jalur alternatif:

- PW asal ditambah minimal satu PW lain; atau
- PD asal ditambah minimal dua PD lain.

Setiap PW/PD pada umumnya hanya boleh mendukung satu Bakal Calon. Pengecualian berlaku jika lebih dari satu Bakal Calon berasal dari PW/PD yang sama, terbatas pada pemberian rekomendasi kepada Bakal Calon yang berasal dari struktur tersebut. Sistem perlu menyimpan struktur penerbit setiap surat agar Admin dapat mendeteksi dukungan ganda; aturan pengecualian tetap membutuhkan keputusan Admin.

### Tahap dan status minimum

Urutan normatif Pasal 9 adalah pengumuman/sosialisasi, pengambilan dan pengembalian berkas, verifikasi administrasi serta uji kualifikasi, perbaikan kelengkapan, penetapan/pengumuman Calon Tetap, visi-misi dan kampanye, debat I, debat II, masa tenang, lalu forum Muktamar.

Status domain yang langsung tersirat ialah:

- `Bakal Calon`: sudah mendaftar, belum dinyatakan memenuhi seluruh syarat;
- `dalam verifikasi`: berkas diserahkan dan KPU memeriksa administrasi serta uji kualifikasi;
- `perlu perbaikan`: KPU menemukan kekurangan/ketidaksesuaian dan memberi kesempatan perbaikan;
- `gugur`: kelengkapan tidak dipenuhi sampai batas perbaikan;
- `Calon Ketua Umum Tetap`: lulus verifikasi administrasi dan uji kualifikasi serta ditetapkan KPU; penetapan final dan mengikat;
- `gugur setelah penetapan`: dokumen/keterangan terbukti tidak benar, melanggar masa tenang, atau mengundurkan diri tertulis; KPU harus menerbitkan keputusan tertulis.

`draft`, verifikasi email, pengiriman ulang, dan status teknis upload diperlukan oleh aplikasi tetapi tidak ditetapkan PKPU. Spesifikasi harus memberi label sebagai mekanisme produk, bukan status hukum pencalonan. Kriteria dan keluaran `uji kualifikasi` juga tidak dijelaskan dalam lampiran.

## Kalender dan konflik sumber

| Tahap | DOCX normatif | PPTX penjelas | Temuan |
| --- | --- | --- | --- |
| Pengumuman/sosialisasi | 13–16 Sep 2026 | 13–16 Sep 2026 | Sama |
| Pengambilan/pengembalian | `17 – 04 Oktober 2026` | 17–24 Sep 2026 | Bertentangan; bulan tanggal 17 hilang di DOCX |
| Verifikasi/uji kualifikasi | 5–7 Okt | 25–27 Sep | Bertentangan |
| Perbaikan | 8–11 Okt | 28–30 Sep | Bertentangan |
| Penetapan | 12 Okt | 1 Okt | Bertentangan |
| Visi-misi/kampanye | `13b–18 Oktober 2026` | 2–24 Okt | Bertentangan; ada karakter `b` pada DOCX |
| Debat I | 19 Okt | 10 Okt | Bertentangan |
| Debat II | 23 Okt | 18 Okt | Bertentangan |
| Masa tenang | 25–26 Okt | 25–26 Okt | Sama |
| Forum Muktamar | 27 Okt–selesai | 27 Okt–selesai | Sama |

Pasal 10 memberi KPU kewenangan mengubah jadwal karena keadaan mendesak atau force majeure dengan pengumuman resmi kepada PW, PD, dan Bakal Calon/Calon. Itu tidak dengan sendirinya menjadikan kalender PPTX sebagai perubahan resmi.

Konflik/ketidakjelasan lain yang memengaruhi implementasi:

- Pasal 8 menawarkan jalur PW **atau** PD, tetapi Pasal 13 dan checklist mencantumkan dokumen PW dan PD sebagai dua item tanpa kondisi. KPU harus menetapkan apakah sistem mewajibkan satu jalur atau kedua jenis surat.
- Pasal 11 merujuk debat pada huruf `g dan i` serta masa tenang pada huruf `j`; urutan Pasal 9 menempatkan debat pada `g dan h`, masa tenang pada `i`, dan forum pada `j`. Gunakan nama tahap, bukan huruf, sampai ada koreksi.
- DOCX memakai istilah `Calon Ketua Umum`, `Calon Ketua Umum Tetap`, dan definisi yang tidak sepenuhnya seragam. Nama status publik perlu disahkan KPU.
- PPTX menambahkan penjelasan seperti bacaan Al-Qur'an “sesuai kaidah tajwid”, pengunduran diri “sebelum atau selama proses”, dan klaim PKPU sebagai “acuan tunggal”. Jangan jadikan tambahan ini aturan validasi tanpa keputusan KPU.

## Batas Cloudflare yang harus masuk spesifikasi

### Pembagian penyimpanan

- D1 tidak boleh menyimpan isi file. Batas maksimum string, BLOB, atau satu row adalah 2 MB; ukuran database maksimum 500 MB pada Free dan 10 GB pada Paid. D1 tepat untuk akun, data formulir, status, metadata objek, catatan pemeriksaan, dan audit. Sumber: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
- R2 tepat untuk upload. Satu objek dapat berukuran sampai 5 TiB; upload satu bagian sampai 5 GiB, tetapi request yang melewati Worker tetap tunduk pada batas inbound Worker. Sumber: [R2 limits](https://developers.cloudflare.com/r2/platform/limits/).
- Worker memiliki memori 128 MB per isolate. Batas body request tergantung paket zona: 100 MB untuk Free/Pro, 200 MB Business, sampai 5 GB Enterprise self-service. Request yang melebihi batas mendapat 413. File harus dialirkan ke R2, bukan dibuffer penuh atau dibaca berulang. Sumber: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) dan [R2 Workers API usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/).

Implikasi minimum: KPU harus menetapkan batas ukuran per jenis berkas di bawah batas paket yang akan dipakai. Jika semua file dibatasi di bawah 100 MB, upload melalui Worker binding merupakan jalur paling sederhana dan dapat memakai stream `request.body`. Bila KPU membutuhkan file lebih besar, spesifikasi perlu beralih ke upload langsung menggunakan presigned PUT atau multipart R2. Presigned URL berlaku sebagai bearer token, dapat aktif 1 detik sampai 7 hari, perlu CORS untuk browser, dan `POST` form tidak didukung. Sumber: [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

### Privasi dan akses

- R2 privat secara default. Jangan aktifkan `r2.dev` atau custom domain publik untuk berkas pendaftaran. Akses unduh harus melalui endpoint aplikasi yang memeriksa sesi/role, atau URL GET bertanda tangan dengan masa sangat singkat. Sumber: [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).
- D1 dan R2 mengenkripsi data saat disimpan menggunakan AES-256 dan melindungi transfer dengan TLS. Enkripsi platform tidak menggantikan kontrol akses, minimisasi data, atau kebijakan retensi. Sumber: [D1 data security](https://developers.cloudflare.com/d1/reference/data-security/) dan [R2 data security](https://developers.cloudflare.com/r2/reference/data-security/).
- Binding memberi Worker kapabilitas ke D1/R2 tanpa menyimpan kredensial layanan dalam source. Jika presigned URL dipakai, kredensial S3 harus menjadi secret server-side. Sumber: [Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/).
- Nama objek R2 sebaiknya berupa identifier acak yang tidak memuat nama, nomor kontak, atau jenis kondisi pribadi. Simpan nama asli dan tipe dokumen sebagai metadata yang hanya dapat dibaca role berwenang.
- `observability.enabled` sudah aktif. Workers Logs mengumpulkan invocation log, custom log, error, dan exception; API tidak boleh mencatat body formulir, nama file asli, token sesi, bukti transfer, atau isi dokumen. Sumber: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

### Kondisi repo saat ini

- Stack sudah React 19, Vite 7, Hono 4.11.1, Cloudflare Vite plugin 1.52.1, dan Wrangler `^4.131.2`; build/deploy memakai paket lokal.
- `wrangler.json` baru mengatur Worker, SPA static assets, `nodejs_compat`, source maps, dan observability. Belum ada `d1_databases`, `r2_buckets`, atau secret aplikasi.
- `worker-configuration.d.ts` memiliki `Env` kosong, mengonfirmasi belum ada binding terkonfigurasi. Setelah binding berubah, jalankan script `cf-typegen` (`wrangler types`).
- Worker hanya memiliki endpoint contoh `GET /api/`; autentikasi, registrasi, upload, unduh, pengumuman, dan admin belum ada.
- `compatibility_date` masih 8 Oktober 2025. Sebelum implementasi produksi, review perubahan kompatibilitas lalu gunakan tanggal yang disepakati dan regenerasi tipe; jangan mengubahnya tanpa pengujian.

## Keputusan manusia KPU yang masih wajib

Keputusan ini dapat dikelompokkan agar tiket lanjutan tetap sedikit:

1. **Kalender dan istilah hukum:** kalender resmi tahap 2–8; tanggal cutoff beserta zona waktu; koreksi referensi Pasal 11; label status publik; serta bentuk pengumuman perubahan yang dianggap resmi.
2. **Aturan kelengkapan dan verifikasi:** satu jalur rekomendasi atau kedua dokumen; bukti untuk syarat “tidak sedang diperpanjang”; definisi dokumen “asli” dalam upload digital; format/tanda tangan/meterai yang diterima; kriteria uji kualifikasi; siapa yang boleh memperbaiki apa dan berapa kali; mekanisme keputusan gugur.
3. **Operasional pembayaran dan akun:** rekening resmi serta cara rekonsiliasi; apakah pembayaran diperiksa manual; kapan seseorang sah menjadi `Bakal Calon`; pembukaan registrasi untuk umum atau undangan; verifikasi kontak; metode pemulihan akun; kredensial tunggal Admin dan siapa pemegangnya.
4. **Kebijakan data dan file:** format serta ukuran maksimum tiap jenis dokumen; teks pemberitahuan privasi/persetujuan yang sah; siapa di KPU yang dapat melihat atau mengunduh data; masa simpan dan tanggal penghapusan D1/R2 setelah Muktamar; penanganan backup/export; kebutuhan lokasi/yurisdiksi data; prosedur koreksi dan insiden kebocoran.
5. **Konten publik:** sumber final berkas unduhan, identitas/profil anggota KPU, kanal kontak resmi, siapa yang menyetujui pengumuman, serta apakah data/status Bacalon atau Calon mana yang boleh dipublikasikan.

Sampai keputusan di atas ada, produk dapat merencanakan alur dan kontrol akses, tetapi tidak boleh mengarang kalender, validasi berkas, rekening, profil anggota, kebijakan retensi, atau kriteria kelulusan.
