# 06: Form pendaftaran: alur NIA di UI

**What to build:** Calon pendaftar mengisi NIA, menekan "Cek NIA", dan begitu terverifikasi, Nama Lengkap terisi otomatis (read-only) serta sisa form (email, WhatsApp, kata sandi, persetujuan) terbuka. Mereka bisa menekan "Reset" untuk mengganti NIA yang salah tanpa kehilangan isian lain, dan submit akhir membuat akun lewat NIA yang sama.

**Blocked by:** 03 (Endpoint "Cek NIA"), 04 (Penggerbangan NIA di pendaftaran akhir)

**Status:** ready-for-agent

- [ ] Field "Nama lengkap" manual diganti field NIA (11 digit numerik) sebagai field pertama form pendaftaran.
- [ ] Field lain (email, WhatsApp, kata sandi, persetujuan) nonaktif sampai verifikasi NIA sukses.
- [ ] Tombol eksplisit "Cek NIA" memicu panggilan ke endpoint Ticket 03 (tidak otomatis saat mengetik/blur).
- [ ] Sukses: NIA dan Nama Lengkap sama-sama jadi read-only dengan indikator visual "terverifikasi"; field lain terbuka.
- [ ] Tombol "Reset" eksplisit mengosongkan dan membuka kembali hanya NIA dan Nama Lengkap; nilai field lain yang sudah diisi user dipertahankan; status validasi kembali ke belum terverifikasi.
- [ ] Pesan galat berbeda ditampilkan untuk: format tidak valid, tidak ditemukan, sudah terdaftar, tidak memenuhi syarat, dan kegagalan upstream/jaringan (yang terakhir ini jelas mengundang coba lagi, bukan disamakan dengan NIA tidak valid).
- [ ] Submit akhir mengirim `nia` ke handler pendaftaran dari Ticket 04.
- [ ] Perilaku ini diverifikasi manual di browser — tidak ada test komponen baru, konsisten dengan konvensi codebase ini.
