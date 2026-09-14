# 12: Data pribadi Bakal Calon Ketua Umum

**What to build:** Bakal Calon Ketua Umum membuka `/akun/data` dan mengisi data pribadi A.1: nama panggilan, tempat dan tanggal lahir, asal PW, asal PD, tahun dan tempat lulus DM 3, status instruktur, capaian hafalan, dan bahasa asing. Nama lengkap dan WhatsApp juga dapat diubah di sini, sedangkan email hanya ditampilkan. Setiap simpan yang berhasil langsung menjadi keadaan terkini tanpa tombol "kirim pendaftaran".

Pada Pemeriksaan dan Terkunci, formulir hanya-baca, tombol simpan nonaktif beserta alasan tahap, dan server menolak simpan. Pada Masa Perbaikan, simpan kembali diterima. Data pribadi tidak memengaruhi Status Kelengkapan Berkas.

Rujukan: [spec](../spec.md) bagian Data pribadi dan Tahap × kemampuan.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Simpan pertama membuat baris `profil`; simpan berikutnya menimpa. Semua kolom boleh kosong.
- [ ] Tanggal lahir yang bukan tanggal valid dan tahun lulus DM 3 di luar 1998–2026 ditolak dengan pesan jelas.
- [ ] Perubahan WhatsApp dinormalisasi ke `62…` dan ditolak bila sudah dipakai akun lain. Nama tidak boleh kosong. Email tidak dapat diubah lewat API mana pun.
- [ ] Simpan ditolak server pada Belum dibuka, Pemeriksaan, Terkunci, dan Selesai, dan diterima pada Masa Pendaftaran dan Masa Perbaikan. Antarmuka menampilkan alasannya (acceptance 16 dan 17, bagian data).
- [ ] Bakal Calon hanya dapat membaca dan mengubah datanya sendiri.
- [ ] Audit mencatat `ubah_data` (berhasil/ditolak) tanpa isi data.
- [ ] Butir server diuji lewat seam Worker dengan jam yang disuntikkan.
