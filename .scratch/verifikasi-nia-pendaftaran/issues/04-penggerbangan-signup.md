# 04: Penggerbangan NIA di pendaftaran akhir

**What to build:** Saat seseorang benar-benar membuat akun Bakal Calon, sistem menegakkan ulang syarat NIA secara independen — nama yang tersimpan berasal dari data resmi kammi.id, bukan dari apa pun yang dikirim klien — sehingga syarat kelayakan NIA ini tidak bisa dilewati dengan memanggil API pendaftaran secara langsung tanpa lewat Ticket 03. Lihat ADR yang dicatat di repo ini (`docs/adr/`) untuk alasan keputusan re-verifikasi ini.

**Blocked by:** 02 (Modul verifikasi NIA bersama)

**Status:** ready-for-agent

- [ ] Handler pendaftaran (`sign-up/email`) menerima field `nia` tambahan pada payload-nya.
- [ ] Handler menjalankan ulang modul verifikasi dari Ticket 02 secara penuh sebelum akun dibuat — bukan sekadar mempercayai hasil pengecekan interaktif sebelumnya.
- [ ] Akun tidak dibuat, dengan pesan galat yang sesuai, jika re-verifikasi ini gagal dengan alasan apa pun (format, duplikat, tidak ditemukan, tidak memenuhi syarat, kegagalan upstream).
- [ ] `name` yang tersimpan ke akun yang dibuat berasal dari respons kammi.id saat re-verifikasi ini, bukan dari field nama apa pun yang dikirim klien.
- [ ] `nia` tersimpan ke akun yang dibuat.
- [ ] Duplikat NIA yang lolos dari pre-check (mis. race condition dua pendaftaran bersamaan) tetap ditolak lewat constraint UNIQUE di database, tanpa membalas error 500 — mengikuti pola penanganan duplikat WhatsApp yang sudah ada.
- [ ] Test membuktikan skenario bypass: memanggil endpoint pendaftaran langsung dengan sebuah NIA yang belum pernah dicek lewat Ticket 03 tetap digerbangi dengan benar, baik untuk NIA yang seharusnya lolos maupun yang seharusnya ditolak.
