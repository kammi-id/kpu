# Identitas Keamanan dan Siklus Data

Type: grilling
Status: resolved
Blocked by: 02

## Question

Model identitas dan perlindungan data paling sederhana apa yang cukup aman untuk satu Admin dan akun Bakal Calon? Putuskan cara registrasi/login dan pemulihan akses, masa berlaku sesi, proteksi endpoint serta objek R2, tipe dan batas ukuran file, validasi upload, persetujuan pemrosesan data, akses dan ekspor oleh Admin, jejak perubahan minimum, serta jadwal retensi/penghapusan setelah proses berakhir. Hindari layanan eksternal atau infrastruktur tambahan kecuali ada kebutuhan yang tidak dapat dipenuhi stack saat ini.

## Comments

### Putaran keputusan 1 — 15 September 2026

- Bakal Calon mendaftar langsung tanpa kode aktivasi atau pembuatan akun oleh Admin.
- Satu kredensial Admin digunakan bersama.
- Pengendali Data Pribadi adalah PP KAMMI melalui KPU Muktamar XIV KAMMI 2026; persetujuan eksplisit dan terekam diterima.
- Data dipertahankan 90 hari setelah penutupan resmi proses, lalu dihapus setelah serah-terima dan penyelesaian sengketa.
- Kebijakan format, ukuran, validasi, akses privat R2, dan unduh sebagai attachment diterima sesuai rekomendasi putaran pertama.

### Putaran keputusan 2 — 15 September 2026

- Login Bakal Calon menggunakan email dan kata sandi minimal delapan karakter; verifikasi email tidak diwajibkan.
- Reset kata sandi dilakukan oleh Admin, bukan melalui layanan email atau OTP mandiri.
- Cloudflare Turnstile digunakan pada registrasi dan setelah tiga kegagalan login, disertai pembatasan percobaan berbasis D1.
- Sesi Bakal Calon berakhir setelah dua jam tidak aktif atau 24 jam absolut; sesi Admin berakhir setelah 30 menit tidak aktif atau delapan jam absolut; maksimal lima sesi aktif per akun.
- Karena kredensial Admin dipakai bersama, audit mengatribusikan tindakan kepada `Admin bersama`, sesi, waktu, sasaran, dan hasil, bukan kepada individu.
- Penarikan persetujuan diperlakukan sebagai permintaan penutupan akun, bukan status hukum Mengundurkan Diri.
- Ekspor terdiri dari CSV keseluruhan dan ZIP per Bakal Calon dengan manifest checksum; rahasia autentikasi dikecualikan dan paket tidak disimpan permanen di R2.
- Better Auth akan dipertimbangkan bila integrasinya dengan Hono, Workers, D1, kebijakan sesi, reset oleh Admin, dan Turnstile tetap sederhana.

## Answer

Model identitas memakai **Better Auth** di atas Hono dan binding D1 native, tanpa ORM tambahan dan tanpa layanan email, OTP, atau antivirus eksternal. Satu-satunya layanan Cloudflare tambahan ialah Turnstile, yang dibenarkan karena registrasi dapat diakses publik.

### Identitas dan registrasi

- Registrasi terbuka selama Masa Pendaftaran. Tidak ada kode aktivasi dan tidak ada pembuatan akun oleh Admin.
- Identitas login ialah email yang dinormalisasi (dipangkas, huruf kecil) dan unik. Kata sandi minimal delapan karakter.
- Verifikasi email dinonaktifkan; alur reset kata sandi mandiri juga dinonaktifkan.
- Pembuatan akun langsung menjadikan pemiliknya Bakal Calon Ketua Umum dalam arti operasional, sesuai tiket 02.
- Nomor WhatsApp dicatat sebagai data kontak wajib dan unik. Ia bukan identitas login, melainkan dasar pencocokan identitas saat pemulihan manual. *Asumsi:* KPU memakai kanal ini sebagai kontak resmi Bakal Calon; jika tidak, KPU menetapkan penggantinya sebelum peluncuran.

### Akun Admin

- Satu akun Admin dengan kredensial yang dipakai bersama beberapa anggota KPU.
- Peran disimpan pada kolom akun, bukan disimpulkan dari email.
- Pemulihan akses Admin dilakukan operator infrastruktur berdasarkan permintaan tertulis penanggung jawab KPU, di luar aplikasi.

### Pemulihan akses Bakal Calon

- Sepenuhnya dilakukan Admin melalui plugin Admin Better Auth, setelah pencocokan identitas pada kanal resmi KPU.
- Admin menetapkan kata sandi baru dan menyerahkannya melalui kanal resmi; tidak ada kode reset yang dikirim sistem.
- Setiap reset wajib mencabut seluruh sesi aktif akun tersebut.

### Sesi

| Peran | Tidak aktif | Batas absolut |
| --- | --- | --- |
| Bakal Calon Ketua Umum | 2 jam | 24 jam |
| Admin | 30 menit | 8 jam |

- Maksimal lima sesi aktif per akun; login keenam mencabut sesi tertua.
- Cookie sesi `HttpOnly`, `Secure`, `SameSite=Strict`, dan proteksi CSRF serta origin bawaan Better Auth diaktifkan.
- Penyimpanan alamat IP bawaan dinonaktifkan.
- **Penyimpangan yang diterima:** Better Auth menyimpan token sesi opaque bertanda tangan di D1, bukan hash token. Tidak ada opsi hash-at-rest resmi tanpa adapter kustom, dan D1 terenkripsi saat disimpan. Kebijakan durasi per peran, batas lima sesi, dan audit aplikasi diimplementasikan sebagai middleware/hook tipis.
- Versi Better Auth dan pluginnya dipin secara exact di lockfile.

### Proteksi endpoint dan objek

- Seluruh endpoint API selain registrasi dan login menuntut sesi valid, lalu pemeriksaan peran, lalu pemeriksaan kepemilikan sumber daya.
- Perubahan data dan berkas oleh Bakal Calon Ketua Umum tunduk pada state machine waktu tiket 02; penolakan terjadi di server, bukan hanya di antarmuka.
- Bucket R2 tetap privat. Tidak ada custom domain publik, tidak ada URL yang dapat ditebak, dan tidak ada presigned URL pada versi minimum.
- Setiap unduhan melewati Worker yang memeriksa sesi, peran, dan kepemilikan, lalu mengalirkan objek dengan `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`. Berkas tidak pernah ditampilkan inline.
- Nama objek R2 acak dan tidak memuat identitas; pemetaan ke akun dan kelompok berkas hanya ada di D1.

### Kebijakan berkas

- Karya tulis ilmiah: PDF saja. Sembilan kelompok lain: PDF, JPEG, atau PNG.
- Maksimal 20 MiB per file dan 5 file per kelompok unggahan.
- Validasi berlapis di server: ekstensi, MIME, dan signature file. DOCX, ZIP, dan executable ditolak.
- Tidak ada pemindaian antivirus pada versi minimum; keterbatasan ini diterima secara sadar.
- Unggah melalui Worker aman di bawah batas request 100 MB.

### Mitigasi penyalahgunaan

- Turnstile pada registrasi dan setelah tiga kegagalan login berturut-turut, divalidasi server-side melalui plugin Captcha.
- Pembatasan percobaan berbasis D1 per email dan per hash IP.
- Alamat IP hanya disimpan sebagai hash bergaram dengan umur maksimal 24 jam, lalu dibersihkan.

### Persetujuan pemrosesan data

- Pengendali Data Pribadi ialah PP KAMMI melalui Komisi Penjaringan Umum Muktamar XIV KAMMI 2026. Bukan Cloudflare dan bukan badan negara.
- Registrasi memuat checkbox persetujuan eksplisit yang tidak tercentang otomatis dan tidak dapat dilewati.
- Sistem merekam versi pemberitahuan, waktu, dan akun pemberi persetujuan.
- Pemberitahuan menjelaskan tujuan, jenis data, pihak yang mengakses, masa retensi, dan hak subjek data.
- Kanal resmi untuk permintaan akses, koreksi, penarikan persetujuan, dan penghapusan ditetapkan pada checklist deployment.

### Penarikan persetujuan

- Tersedia **Permintaan Penutupan Akun dan Penarikan Persetujuan**, dikonfirmasi dengan kata sandi.
- Akun langsung dikunci dan seluruh sesinya dicabut; Admin memproses penghentian atau penghapusan paling lambat 3×24 jam, kecuali ada dasar retensi atau sengketa terdokumentasi.
- Tindakan ini tidak menetapkan status hukum apa pun, termasuk `Mengundurkan Diri`.

### Akses dan ekspor Admin

- Admin membaca seluruh data dan berkas Bakal Calon Ketua Umum serta Status Kelengkapan Berkas.
- Ekspor terdiri dari satu CSV seluruh data dan kelengkapan, serta ZIP per Bakal Calon Ketua Umum berisi data, berkas, dan manifest checksum SHA-256.
- Hash kata sandi, token sesi, dan data mitigasi penyalahgunaan tidak ikut diekspor.
- Paket ekspor dibuat sesuai permintaan dan tidak disimpan permanen di R2. Serah-terima akhir disimpan KPU pada media terenkripsi.

### Jejak perubahan minimum

- Dicatat di D1: waktu, id sesi, aktor, tindakan, sasaran, dan hasil.
- Tindakan yang dicatat: login berhasil dan gagal, registrasi, reset kata sandi oleh Admin, unggah, penggantian, dan penghapusan berkas, perubahan data, ekspor, penutupan akun, serta penghapusan data.
- **Keterbatasan yang diterima:** karena kredensial Admin dipakai bersama, aktor dicatat sebagai `Admin bersama` dan audit tidak mengklaim atribusi individu. Jika atribusi individu kelak diwajibkan, keputusan kredensial bersama harus dibatalkan lebih dulu.

### Retensi dan penghapusan

- Masa retensi 90 hari sejak penutupan resmi proses penjaringan. Bila KPU tidak menetapkan tanggal lain, penutupan dihitung sejak dimulainya Forum Muktamar, 27 Oktober 2026, sehingga penghapusan jatuh pada 25 Januari 2027.
- Ekspor serah-terima dibuat sebelum masa retensi berakhir.
- Setelah serah-terima dikonfirmasi dan tidak ada sengketa, data pribadi di D1, objek R2, sesi, dan kredensial dihapus.
- Catatan non-pribadi mengenai waktu dan hasil penghapusan dipertahankan.
- Penghapusan dinyatakan tuntas setelah jendela pemulihan otomatis D1 berakhir: 7 hari pada paket Free atau 30 hari pada paket Paid.
- Subjek data diberi pemberitahuan penghapusan melalui kanal resmi KPU.

### Rujukan

- [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) dan [R2 data security](https://developers.cloudflare.com/r2/reference/data-security/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Better Auth: Hono](https://better-auth.com/docs/integrations/hono), [Admin plugin](https://better-auth.com/docs/1.6/plugins/admin), [Captcha plugin](https://better-auth.com/docs/1.6/plugins/captcha), [session management](https://better-auth.com/docs/concepts/session-management)
- UU 27/2022 tentang Pelindungan Data Pribadi, Pasal 20–24 dan 42–45

### Catatan putaran 3 — 15 September 2026

- Better Auth diadopsi sebagai inti autentikasi dengan native D1, plugin Admin, dan plugin Captcha; penyimpanan token sesi bawaannya diterima.
