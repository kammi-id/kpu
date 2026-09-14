# Skema Data dan Kontrak Penyimpanan

Type: grilling
Status: open
Blocked by: 04

## Question

Skema D1 dan kontrak objek R2 paling kecil apa yang cukup untuk memenuhi
blueprint Varian A tanpa menambah entitas di luar destination? Putuskan tabel
dan kolom untuk akun, peran, data pribadi, kelompok berkas, metadata objek,
rekaman persetujuan, audit, dan pembatasan percobaan, termasuk kolom mana yang
dimiliki Better Auth dan mana yang milik aplikasi. Putuskan pola penamaan objek
R2 yang acak dan tidak memuat identitas beserta pemetaannya di D1, kolom
checksum untuk manifest ekspor, serta representasi tahap waktu: disimpan
sebagai kolom atau diturunkan dari jam server. Tetapkan aturan yang dapat diuji
untuk perhitungan Status Kelengkapan Berkas, khususnya kelompok rekomendasi,
dan indeks minimum yang dibutuhkan tabel Admin serta ekspor. Hasilnya harus
berupa DDL yang siap dieksekusi beserta daftar batasan integritas.
