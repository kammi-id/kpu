# 15: Reset Password

**What to build:** Bakal Calon Ketua Umum yang lupa kata sandi menghubungi kanal resmi. Admin mencocokkan identitasnya di luar aplikasi, lalu menekan **Reset Password** di `/admin/:id`. Dialog konfirmasi meminta kata sandi Admin, yang diverifikasi server.

Bila benar:

- sistem membuat kata sandi baru 16 karakter tanpa karakter ambigu (`0 O o 1 l I`);
- kata sandi ditampilkan sekali dengan tombol salin;
- seluruh sesi akun sasaran dicabut;
- pemilik akun dapat langsung login dengan kata sandi baru.

Lima kegagalan konfirmasi berturut-turut mencabut sesi Admin yang sedang dipakai.

Mekanisme konfirmasi kata sandi Admin dibangun sebagai satu fungsi bersama karena dipakai ulang oleh Hapus data akun (tiket 17).

Rujukan: [spec](../spec.md) bagian Konfirmasi kata sandi Admin.

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] Kata sandi Admin yang salah menolak reset dan menambah penghitung `konfirmasi:<HMAC sesiId>`. Kegagalan kelima berturut-turut mencabut sesi Admin tersebut. Keberhasilan mereset penghitung (acceptance 27).
- [ ] Kata sandi baru panjangnya 16 karakter, hanya dari alfabet tanpa karakter ambigu, dibuat dengan `crypto.getRandomValues` tanpa bias modulo, dan langsung dapat dipakai login (acceptance 27).
- [ ] Seluruh sesi akun sasaran dicabut. Sesi lama akun sasaran ditolak setelah reset (acceptance 23).
- [ ] Kata sandi baru hanya ada di respons satu kali; tidak disimpan dalam bentuk mentah dan tidak masuk log maupun audit.
- [ ] Reset hanya dapat dilakukan sesi Admin dan hanya untuk akun `bacalon`.
- [ ] Audit mencatat `reset_kata_sandi` (berhasil/gagal) dengan aktor `Admin bersama`, `sesiId`, dan `sasaranUserId`.
- [ ] Butir server diuji lewat seam Worker.
