# 18: Penghapusan Akhir dan Tahap Selesai

**What to build:** Mulai 25 Januari 2027 00.00 WIB, seluruh situs memasuki Tahap Selesai. Setiap rute publik, akun, dan Admin hanya menampilkan "Proses penjaringan telah selesai dan data telah dihapus" beserta footer. Registrasi, login, onboarding, unduh Berkas Publik, dan seluruh API ditolak.

Cron pertama pada atau setelah waktu itu menjalankan Penghapusan Akhir tanpa konfirmasi. Seluruh objek R2 (`berkas/`, `ekspor/`, `publik/`) dan seluruh baris semua tabel, termasuk Peraturan dan audit, dihapus. Lalu tepat satu audit `hapus_data` beraktor `Sistem` disisipkan, dengan `keterangan` berisi jumlah baris per tabel dan jumlah objek R2 yang dihapus. Run berikutnya mengulang penghapusan sisa tanpa audit kedua.

Rujukan: [spec](../spec.md) bagian Tahap × kemampuan dan Ekspor Harian, Snapshot Pemeriksaan, Penghapusan Akhir.

**Blocked by:** 11, 16

**Status:** ready-for-agent

- [ ] Run terjadwal pertama dengan `scheduledTime` ≥ 24 Jan 2027 17.00Z mengosongkan R2 dan seluruh tabel serta menyisakan tepat satu audit `hapus_data` beraktor `Sistem` dengan `keterangan` berisi jumlah yang dihapus (acceptance 32).
- [ ] Run berikutnya tidak menambah audit, dan tetap menghapus sisa bila ada (acceptance 32).
- [ ] Run pada tahap Selesai tidak lagi membuat Ekspor Harian.
- [ ] Run tepat sebelum 24 Jan 2027 17.00Z masih membuat Ekspor Harian dan tidak menghapus apa pun.
- [ ] Pada tahap Selesai, registrasi, login, onboarding, unduh Berkas Publik, dan seluruh API ditolak dengan kode tahap. Setiap rute klien menampilkan pesan selesai beserta footer (acceptance 33 dan 34).
- [ ] Penghapusan menangani daftar objek R2 berhalaman (lebih dari satu halaman listing).
- [ ] Butir server diuji lewat seam Worker dengan jam dan `scheduledTime` yang disuntikkan.
