# 17: Penutupan Akun dan Hapus data akun

**What to build:** Bakal Calon Ketua Umum membuka `/akun/pengaturan` dan mengajukan Permintaan Penutupan Akun dan Penarikan Persetujuan dengan konfirmasi kata sandi. Antarmuka menjelaskan bahwa permintaan ini tidak menetapkan status Mengundurkan Diri dan diproses KPU paling lambat 3×24 jam. Akun langsung terkunci dan seluruh sesinya dicabut. Permintaan tersedia di semua tahap selain Selesai.

Tabel `/admin` menampilkan penanda **Minta ditutup**. Hanya untuk akun berpenanda itu, `/admin/:id` menampilkan tombol **Hapus data akun** dengan konfirmasi kata sandi Admin (fungsi bersama dari tiket 15). Tombol menghapus:

- seluruh data akun di D1 (berantai);
- audit yang menyebut akun itu, kecuali `hapus_data`;
- berkasnya di R2;
- kedua ZIP ekspor akun itu;
- barisnya di CSV terkini dan CSV pemeriksaan.

Setelah itu satu audit `hapus_data` dicatat.

Rujukan: [spec](../spec.md) bagian Penutupan akun dan Hapus data akun, dan Konfirmasi kata sandi Admin.

**Blocked by:** 15, 16

**Status:** ready-for-agent

- [ ] Permintaan penutupan menolak kata sandi salah. Bila benar, `banned = 1`, `banReason = 'penutupan_akun'`, seluruh sesi terhapus, dan audit `penutupan_akun` tercatat dalam satu batch (acceptance 19).
- [ ] Akun yang ditutup tidak dapat login.
- [ ] Permintaan diterima pada Belum dibuka sampai Terkunci dan ditolak pada Selesai.
- [ ] Tabel Admin menampilkan penanda Minta ditutup hanya untuk `banned = 1` dengan `banReason = 'penutupan_akun'`.
- [ ] Tombol Hapus data akun hanya muncul untuk akun berpenanda Minta ditutup. API menolak penghapusan akun tanpa penanda, dan menolak kata sandi Admin yang salah dengan penghitung konfirmasi yang sama (acceptance 30).
- [ ] Setelah dihapus, tidak ada baris `user`, `profil`, `berkas`, `session`, atau `account` akun itu. Objek `berkas/` akun itu, `ekspor/terkini/<userId>.zip`, dan `ekspor/pemeriksaan/<userId>.zip` hilang. Kedua CSV tidak lagi memuat barisnya (acceptance 30).
- [ ] Audit yang menyebut akun itu terhapus, kecuali satu audit `hapus_data` baru.
- [ ] Butir server diuji lewat seam Worker, termasuk keadaan dengan dan tanpa ekspor yang sudah ada.
