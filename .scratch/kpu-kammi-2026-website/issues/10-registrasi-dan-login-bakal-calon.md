# 10: Registrasi dan login Bakal Calon Ketua Umum

**What to build:** Selama Masa Pendaftaran, Anggota Biasa III membuka gerbang `/daftar` dan mendaftar dengan data berikut:

- nama lengkap;
- email;
- WhatsApp (`08…`, `+62…`, atau `62…` diterima dan dinormalisasi ke `62…`);
- kata sandi minimal 8 karakter;
- centang Persetujuan Pemrosesan Data yang tidak tercentang otomatis, setelah membaca pemberitahuan `persetujuan-v1`;
- Turnstile.

Akun langsung menjadi Bakal Calon Ketua Umum. Pemilik akun masuk di tab `/masuk`. Setelah tiga kegagalan berturut-turut, Turnstile muncul dan diverifikasi server. Halaman masuk tidak memuat tautan reset mandiri dan mengarahkan ke kanal resmi di `/tentang`.

Setelah masuk, Bakal Calon melihat shell `/akun` dengan spanduk tahap, sidebar (sementara `0/10` / `Belum lengkap`), footer, dan tombol keluar. `/akun/pengaturan` menampilkan email, WhatsApp, versi, dan waktu persetujuan. Sesi berakhir setelah 2 jam tidak aktif atau 24 jam absolut, maksimal lima sesi.

Pemberitahuan `persetujuan-v1` ditulis developer dari unsur tiket 03 dengan tautan `/tentang` dan tanggal penghapusan 25 Januari 2027, lalu dirender dengan renderer Markdown tiket 07.

Rujukan: [spec](../spec.md) bagian Autentikasi dan sesi, Tahap × kemampuan, dan Klien React.

**Blocked by:** 08

**Status:** done

- [ ] Registrasi menuntut nama, email unik, WhatsApp unik ternormalisasi, kata sandi ≥ 8 karakter, centang persetujuan, dan Turnstile yang divalidasi server (acceptance 7).
- [ ] Registrasi tanpa centang persetujuan ditolak server. `persetujuanVersi` dan `persetujuanPada` diisi server, bukan klien.
- [ ] Registrasi ditolak server pada Belum dibuka, Pemeriksaan, Masa Perbaikan, Terkunci, dan Selesai, dengan kode galat tahap (acceptance 8 dan 17, bagian registrasi).
- [ ] Peran hasil registrasi selalu `bacalon`, apa pun isi permintaan.
- [ ] Email dipangkas dan dijadikan huruf kecil sebelum dicocokkan.
- [ ] Setelah tiga kegagalan login berturut-turut per email atau per IP (HMAC), login tanpa Turnstile valid ditolak dan respons memberi penanda Turnstile diperlukan. Klien menampilkan Turnstile (acceptance 9). Login berhasil mereset penghitung. Baris kedaluwarsa dihapus pada percobaan berikutnya.
- [ ] Tidak ada tautan reset kata sandi mandiri; halaman mengarahkan ke kanal resmi KPU (acceptance 10).
- [ ] Tanpa sesi, API akun menolak dan klien `/akun` mengarahkan ke `/masuk` (acceptance 11).
- [ ] Sesi Bakal Calon ditolak di seluruh API Admin (acceptance 20).
- [ ] Sesi Bakal Calon ditolak setelah 2 jam tidak aktif atau 24 jam absolut. Login keenam mencabut sesi tertua.
- [ ] `/akun/pengaturan` menampilkan versi dan waktu persetujuan yang terekam (acceptance 18).
- [ ] Audit mencatat `registrasi` dan `login` (berhasil, gagal, ditolak) tanpa data pribadi.
- [ ] Butir server diuji lewat seam Worker, dengan permintaan siteverify Turnstile di-stub pada tingkat jaringan.
