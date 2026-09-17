# 02: Modul verifikasi NIA bersama

**What to build:** Satu fungsi verifikasi NIA yang bisa dipanggil untuk mengecek format 11 digit, duplikasi lokal, dan kecocokan + kelayakan (Anggota Biasa III + Keadaan Kader aktif) lewat Sistem Keanggotaan KAMMI (kammi.id) — mengembalikan nama terverifikasi atau alasan gagal yang spesifik. Fungsi ini menjadi satu-satunya sumber kebenaran yang dipakai ulang oleh endpoint pengecekan interaktif (Ticket 03) maupun handler pendaftaran akhir (Ticket 04); belum ada endpoint HTTP atau UI di ticket ini.

**Blocked by:** 01 (Migrasi skema NIA)

**Status:** ready-for-agent

- [ ] Fungsi menolak NIA yang bukan persis 11 digit angka, tanpa memanggil API eksternal.
- [ ] Fungsi mendeteksi NIA yang sudah dipakai akun `bacalon` lain di database lokal, tanpa memanggil API eksternal. Urutan pengecekan: format → duplikat lokal → panggilan eksternal, sehingga duplikat yang sudah diketahui tidak memicu panggilan API yang tidak perlu.
- [ ] Fungsi memanggil API pencarian anggota kammi.id (`https://www.kammi.id/api/v1/members/{nia}`) dengan token dari secret `KAMMI_ID_TOKEN` (ditambahkan ke tipe secret aplikasi, sejajar dengan secret Better Auth/Turnstile/onboarding yang sudah ada), memakai konvensi panggilan luar yang sudah ada di codebase ini (fetch tunggal, `AbortSignal.timeout` 10 detik, tanpa retry).
- [ ] Respons 404 dari kammi.id menghasilkan alasan gagal "tidak ditemukan".
- [ ] Respons sukses dengan `jenjangKaderisasi` bukan persis `"AB3"` atau `keadaanKader` bukan persis `"aktif"` menghasilkan alasan gagal "tidak memenuhi syarat".
- [ ] Respons sukses dengan `jenjangKaderisasi === "AB3"` dan `keadaanKader === "aktif"` menghasilkan hasil sukses berisi `nama` persis dari respons kammi.id.
- [ ] Kegagalan jaringan atau status HTTP lain dari kammi.id menghasilkan alasan gagal generik yang ditandai bisa dicoba ulang, berbeda dari alasan "tidak ditemukan"/"tidak memenuhi syarat".
- [ ] Seluruh perilaku di atas diuji lewat pemanggilan fungsi secara langsung, dengan panggilan kammi.id di-mock di level jaringan memakai helper mock jaringan bersama yang sudah dipakai untuk Turnstile siteverify.
