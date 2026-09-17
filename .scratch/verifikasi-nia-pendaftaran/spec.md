Status: ready-for-agent

# Verifikasi NIA pada pendaftaran Bakal Calon

## Problem Statement

Saat ini form pendaftaran hanya meminta "Nama lengkap" sebagai teks bebas — siapa pun bisa mengetik nama apa pun dan membuat akun Bakal Calon, tanpa ada jaminan otomatis bahwa orang tersebut benar-benar Anggota Biasa III (AB 3) KAMMI yang aktif. Akibatnya KPU tidak punya cara memverifikasi syarat keanggotaan dasar ini sampai peninjauan manual jauh di kemudian hari — atau lebih buruk, seorang kader yang sebenarnya tidak memenuhi syarat keanggotaan bisa sempat mengunggah seluruh berkas sebelum ketidaklayakannya ketahuan.

## Solution

Calon pendaftar memasukkan NIA (Nomor Induk Anggota, 11 digit) miliknya. Aplikasi memverifikasi NIA tersebut ke Sistem Keanggotaan KAMMI (kammi.id): hanya NIA milik kader Anggota Biasa III yang berkeadaan aktif, dan belum dipakai mendaftar sebelumnya di aplikasi ini, yang membuka sisa form pendaftaran — dengan Nama Lengkap terisi otomatis dan terkunci dari sumber resmi tersebut.

## User Stories

1. As a calon pendaftar, saya ingin memasukkan NIA saya untuk memverifikasi keanggotaan saya, sehingga saya tidak perlu mengetik ulang nama lengkap secara manual.
2. As a calon pendaftar, saya ingin melihat pesan galat yang jelas jika NIA saya tidak ditemukan, sehingga saya tahu untuk memeriksa kembali nomor yang saya masukkan.
3. As a calon pendaftar yang NIA-nya sudah dipakai mendaftar sebelumnya, saya ingin diberi tahu bahwa NIA saya sudah terdaftar, sehingga saya tidak bingung kenapa pendaftaran ditolak.
4. As a calon pendaftar yang belum memenuhi syarat jenjang keanggotaan (bukan AB3) atau Keadaan Kader (tidak aktif), saya ingin diberi tahu bahwa saya belum memenuhi syarat, sehingga saya tidak salah paham itu masalah teknis.
5. As a calon pendaftar, saya ingin field lain (email, WhatsApp, kata sandi, persetujuan) tetap terkunci sampai NIA saya berhasil diverifikasi, sehingga saya tidak mengisi data yang percuma jika saya tidak memenuhi syarat.
6. As a calon pendaftar, saya ingin nama lengkap saya terisi otomatis dan tidak bisa saya ubah setelah NIA saya terverifikasi, sehingga datanya konsisten dengan data keanggotaan resmi saya.
7. As a calon pendaftar, saya ingin melihat indikator visual yang jelas bahwa NIA saya sudah terverifikasi, sehingga saya yakin proses berhasil sebelum melanjutkan.
8. As a calon pendaftar, saya ingin tombol "Reset" untuk mengganti NIA yang salah saya masukkan, sehingga saya tidak perlu memuat ulang seluruh halaman.
9. As a calon pendaftar yang menekan tombol Reset, saya ingin data email/WhatsApp/kata sandi yang sudah saya ketik tetap tersimpan, sehingga saya tidak perlu mengetik ulang semuanya.
10. As a calon pendaftar, saya ingin proses verifikasi berjalan hanya saat saya menekan tombol "Cek NIA" secara eksplisit, sehingga saya punya kontrol kapan permintaan dikirim.
11. As a calon pendaftar, saya ingin melihat pesan berbeda ketika terjadi gangguan jaringan/API dibanding ketika NIA saya memang tidak valid, sehingga saya tahu apakah perlu mencoba lagi atau memperbaiki data.
12. As a calon pendaftar, saya ingin diminta menyelesaikan tantangan Turnstile sebelum bisa menekan "Cek NIA", sehingga proses ini tetap terlindungi dari penyalahgunaan otomatis.
13. As Komisi Penjaringan Umum Muktamar (KPU), saya ingin sistem menolak pembuatan akun dari NIA yang bukan Anggota Biasa III aktif, sehingga hanya kader yang memenuhi syarat dasar yang bisa menjadi Bakal Calon.
14. As KPU, saya ingin syarat kelayakan NIA ini ditegakkan lagi secara independen saat akun benar-benar dibuat (bukan hanya di langkah pengecekan UI), sehingga syarat ini tidak bisa dilewati dengan memanggil API pendaftaran secara langsung.
15. As KPU, saya ingin nama yang tersimpan di database berasal dari data resmi Sistem Keanggotaan KAMMI, bukan yang diketik/dikirim calon pendaftar, sehingga data nama Bakal Calon selalu konsisten dengan identitas keanggotaan resminya.
16. As Admin KPU, saya ingin melihat NIA seorang Bakal Calon di halaman detail, sehingga saya bisa memverifikasi identitasnya secara manual jika diperlukan.
17. As Admin KPU, saya ingin NIA seorang Bakal Calon ikut ada di Ekspor Harian, sehingga arsip data lengkap termasuk identitas keanggotaan resminya.
18. As pemilik sistem, saya ingin endpoint verifikasi NIA dibatasi lajunya per alamat IP, sehingga sistem tidak bisa dipakai untuk menebak-nebak NIA orang lain dan membocorkan nama anggota KAMMI secara massal.
19. As pemilik sistem, saya ingin token akses ke Sistem Keanggotaan KAMMI disimpan sebagai secret Worker, sehingga kredensial API tidak bocor ke kode sumber atau klien.
20. As calon pendaftar, saya ingin field NIA sendiri berubah jadi read-only setelah tervalidasi, sehingga saya tidak bisa mengetik ulang NIA lain tanpa melalui langkah Reset yang eksplisit.
21. As calon pendaftar, saya ingin mengubah NIA lewat tombol Reset mereset seluruh status validasi, sehingga sistem tidak salah menganggap NIA baru saya sudah terverifikasi padahal belum dicek ulang.
22. As developer/maintainer, saya ingin logika verifikasi NIA (format, duplikat, panggilan API, cek kelayakan) berada di satu tempat yang dipakai ulang oleh endpoint pengecekan interaktif dan handler pendaftaran akhir, sehingga kedua tempat itu tidak bisa berbeda perilaku secara tidak sengaja.
23. As KPU, saya ingin kolom NIA di database memiliki batasan format (11 digit) dan keunikan di tingkat database, sehingga data tidak konsisten tidak mungkin tersimpan bahkan jika ada bug di kode aplikasi.

## Implementation Decisions

**Skema data**
- Kolom baru `nia` pada tabel pengguna (`user`): teks, UNIQUE, CHECK persis 11 digit angka. Wajib (NOT NULL) untuk peran `bacalon`, mengikuti pola `whatsapp`/`persetujuanVersi`/`persetujuanPada` yang sudah wajib untuk peran itu dan dikecualikan untuk `admin`.

**Logika verifikasi bersama**
- Satu fungsi verifikasi NIA dipakai ulang oleh endpoint pengecekan interaktif maupun handler pendaftaran akhir. Untuk sebuah NIA: validasi format → cek duplikat lokal (tabel `user`) → panggil API pencarian anggota kammi.id → evaluasi kelayakan (`jenjangKaderisasi` persis "AB3" DAN `keadaanKader` persis "aktif"). Urutan ini disengaja: duplikat yang sudah diketahui tidak perlu memicu panggilan eksternal.
- Fungsi ini mengembalikan hasil sukses berisi nama terverifikasi, atau salah satu alasan gagal: format tidak valid, duplikat lokal, tidak ditemukan (404 dari kammi.id), tidak memenuhi syarat, atau kegagalan upstream generik (jaringan/status lain, dapat dicoba lagi).
- URL dasar API kammi.id adalah konstanta tetap di kode (mengikuti pola URL siteverify Turnstile yang juga tetap, bukan env var). Secret `KAMMI_ID_TOKEN` ditambahkan ke tipe secret aplikasi, sejajar dengan secret Better Auth/Turnstile/onboarding yang sudah ada.
- Panggilan keluar ke kammi.id mengikuti konvensi panggilan eksternal yang sudah ada di kode ini: satu `fetch` dengan `AbortSignal.timeout` 10 detik, tanpa retry, kegagalan dilaporkan sebagai alasan gagal generik yang bisa dicoba ulang.

**Endpoint verifikasi NIA baru**
- Route module baru, tanpa autentikasi (dipanggil sebelum akun ada), mengikuti pola modul route kecil per-fitur yang sudah ada di codebase ini.
- Mewajibkan token Turnstile valid pada setiap panggilan (bukan adaptif seperti login), plus rate-limit per alamat IP memakai bentuk tabel kunci/hitung-gagal/kedaluwarsa yang sama seperti yang sudah dipakai untuk percobaan login, di bawah namespace kunci yang berbeda.
- Saat sukses, hanya mengembalikan nama terverifikasi ke klien — tidak pernah field mentah lain dari kammi.id (jenjang, keadaan, struktur), karena tidak dibutuhkan klien dan tidak seharusnya terbuka ke pemanggil anonim.

**Perubahan form pendaftaran**
- Field "Nama lengkap" manual diganti field NIA (11 digit numerik). Field lain (email, WhatsApp, kata sandi, persetujuan) nonaktif sampai verifikasi NIA sukses.
- Tombol eksplisit "Cek NIA" memicu verifikasi (tidak otomatis saat mengetik).
- Sukses: NIA dan Nama Lengkap sama-sama jadi read-only dengan indikator visual "terverifikasi"; field lain terbuka. Kontrol "Reset" eksplisit mengosongkan dan membuka kembali hanya NIA dan Nama Lengkap (nilai field lain dipertahankan) dan mengembalikan form ke status belum terverifikasi.
- Pesan berbeda untuk masing-masing: format tidak valid, tidak ditemukan, sudah terdaftar, tidak memenuhi syarat, dan kegagalan upstream/jaringan generik yang bisa dicoba ulang.

**Perubahan handler pendaftaran akhir**
- Handler pendaftaran yang sudah ada menerima field `nia` tambahan, dan menjalankan ulang verifikasi bersama secara penuh (bukan sekadar format/duplikat) sebelum akun dibuat — independen dari apa pun yang diklaim klien, menutup jalur bypass lewat pemanggilan langsung ke API pendaftaran tanpa lewat endpoint pengecekan. Keputusan ini dan alasannya tercatat sebagai ADR di repo ini (dibuat saat sesi domain modeling); jangan disederhanakan tanpa membacanya lebih dulu.
- Nama yang disimpan ke database berasal dari respons kammi.id saat re-verifikasi ini, bukan dari field nama yang dikirim klien.
- Deteksi duplikat NIA saat submit tetap mengandalkan UNIQUE constraint di database sebagai jaring pengaman terakhir (pola yang sama seperti duplikat WhatsApp saat ini), di atas pengecekan duplikat yang sudah dilakukan fungsi verifikasi bersama.

**Dashboard admin**
- Halaman detail Bacalon menampilkan `nia`.
- Ekspor Harian (CSV) menambahkan kolom `nia`, sejajar dengan kolom inti pendaftaran lain yang sudah ada (nama, email, whatsapp).
- Kolom NIA di tabel ringkasan admin bersifat opsional, diserahkan ke keputusan implementer.

## Testing Decisions

- Seam satu-satunya: batas HTTP Worker, digerakkan lewat helper pengirim permintaan yang sama yang sudah dipakai di seluruh test suite yang ada (menjalankan aplikasi Hono langsung terhadap database D1 uji nyata).
- Panggilan pencarian anggota ke kammi.id di-mock di level jaringan memakai helper mock jaringan bersama yang sudah ada — persis seperti panggilan siteverify Turnstile saat ini — tidak memperkenalkan seam mock fetch baru.
- Uji mengecek: kode status/alasan galat pada respons, baris yang benar-benar tersimpan di tabel `user` (khususnya bahwa `name`/`nia` yang tersimpan cocok dengan respons kammi.id, bukan nilai yang dikirim klien), dan entri jejak audit — mengikuti pola yang sudah ada di test pendaftaran/login.
- Cakupan minimum: verifikasi + pendaftaran sukses; setiap alasan penolakan (format tidak valid, tidak ditemukan, sudah terdaftar, bukan AB3, tidak aktif, kegagalan upstream/jaringan) di kedua titik — endpoint pengecekan dan submit akhir; skenario bypass (submit langsung ke pendaftaran dengan NIA yang belum pernah dicek lewat endpoint pengecekan) untuk membuktikan re-verifikasi benar-benar menggerbangi; kewajiban Turnstile dan rate-limit per-IP pada endpoint pengecekan NIA; constraint UNIQUE/CHECK `nia` di database secara langsung, mengikuti pola uji integritas migrasi yang sudah ada.
- Tidak ada test baru di level komponen React, konsisten dengan codebase ini (hanya ada satu test komponen yang sudah ada, untuk rendering markdown, tidak terkait fitur ini) — perilaku form (kunci/buka field, autofill, Reset) diverifikasi manual, bukan otomatis.

## Out of Scope

- Perubahan pada uji kualifikasi Calon Ketua Umum — fitur ini hanya menggerbangi pembuatan akun, bukan penetapan Calon Ketua Umum.
- Override manual oleh Admin untuk NIA yang gagal verifikasi (mis. mengizinkan kader non-AB3 atau tidak aktif tetap mendaftar) — tidak diminta, tidak dirancang.
- Perubahan pada logika Masa Perbaikan atau Penutupan Pendaftaran Manual — verifikasi NIA adalah pengecekan tambahan di dalam jendela pendaftaran yang sudah ada, bukan pengganti jendela itu.
- Penanganan downtime kammi.id di luar pesan gagal generik yang bisa dicoba ulang — tidak ada antrean offline atau sumber data cadangan.
- Perubahan proteksi Turnstile/rate-limit pada endpoint pendaftaran itu sendiri (sudah ditangani plugin captcha Better Auth) atau pada login (sudah adaptif) — hanya endpoint verifikasi NIA baru yang mendapat proteksi baru ini.
- Kolom NIA di tabel ringkasan admin — opsional/didelegasikan ke implementer, bukan syarat wajib.
- Perubahan bahasa glosarium "Pengendali Data Pribadi" atau "Persetujuan Pemrosesan Data" — sudah dikonfirmasi saat domain modeling bahwa kammi.id adalah bagian dari PP KAMMI, sehingga tidak ada perubahan bahasa yang diperlukan di sana.
- Perubahan pada cara deteksi duplikat WhatsApp/email bekerja.

## Further Notes

- Istilah domain untuk fitur ini (NIA, Verifikasi NIA, Sistem Keanggotaan KAMMI, Keadaan Kader) sudah tercatat di `CONTEXT.md` root repo — pakai istilah ini secara konsisten di komentar kode, pesan galat, dan tiket berikutnya.
- Contoh respons nyata dari API kammi.id sempat diperiksa langsung (memakai token yang sudah tersedia di `.dev.vars`) dan persis berisi field yang diasumsikan spec ini: `nia`, `nama`, `keadaanKader`, `jenjangKaderisasi`, `struktur.{nama,jenjang}`. NIA yang tidak ada mengembalikan 404 dengan body kosong. Status HTTP lain (mis. 401 untuk token salah) belum pernah teramati dan sebaiknya diperlakukan secara konservatif sebagai kasus kegagalan upstream generik.
- "AB3" dan "aktif" diperlakukan sebagai exact match, dikonfirmasi langsung ke pengguna: AB3 adalah jenjang keanggotaan tertinggi KAMMI (tidak ada jenjang di atasnya yang juga perlu diterima), dan hanya keadaan "aktif" yang diterima (nilai lain apa pun ditolak, tanpa mengklaim tahu daftar lengkap nilai yang mungkin dikembalikan kammi.id).

## Comments
