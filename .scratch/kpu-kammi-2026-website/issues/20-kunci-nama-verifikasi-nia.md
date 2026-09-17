# 20: Kunci Nama Lengkap dari Verifikasi NIA di /akun/data

**What to build:** Sejak Verifikasi NIA mengonfirmasi nama seorang Bakal Calon saat registrasi, `/akun/data` tidak lagi memperlakukan Nama lengkap sebagai field yang dapat diubah. Tambahkan blok identitas hanya-baca di atas formulir Data pribadi (tiket 12), menampilkan Nama lengkap dan NIA berdampingan sebagai "identitas terkonfirmasi lewat Verifikasi NIA" — NIA belum pernah ditampilkan di halaman ini. Rute `PUT /api/akun/data` menolak perubahan `name` (bukan hanya mengabaikannya secara diam-diam).

WhatsApp dan seluruh kolom `profil` (tiket 22, 23) tetap dapat diubah seperti sebelumnya; hanya Nama lengkap yang terkunci.

Rujukan: [spec](../spec.md) bagian Data pribadi.

**Blocked by:** PR `worktree-verifikasi-nia-pendaftaran` (kolom `user.nia` dan Verifikasi NIA) harus tergabung ke `main` lebih dulu.

**Status:** ready-for-agent

- [ ] `GET /api/akun/data` menyertakan `nia` pada respons.
- [ ] Blok identitas menampilkan Nama lengkap dan NIA sebagai teks hanya-baca, terpisah dari `<fieldset>` formulir yang dapat diubah.
- [ ] `PUT /api/akun/data` menolak permintaan yang menyertakan `name` berbeda dari nilai tersimpan, dengan pesan galat jelas (bukan diabaikan tanpa keterangan).
- [ ] Audit `ubah_data` tidak berubah perilakunya untuk kolom lain.
- [ ] Butir server diuji lewat seam Worker.

## Comments
