# 03: Endpoint "Cek NIA"

**What to build:** Calon pendaftar yang belum punya akun bisa memanggil satu endpoint publik untuk mengecek NIA-nya sebelum mendaftar, dan mendapat nama terverifikasi atau pesan galat yang jelas dan spesifik — dilindungi dari penyalahgunaan/enumerasi data anggota.

**Blocked by:** 02 (Modul verifikasi NIA bersama)

**Status:** ready-for-agent

- [ ] Endpoint baru menerima NIA, memakai modul verifikasi dari Ticket 02, dan saat sukses mengembalikan hanya nama terverifikasi ke klien — tidak pernah membocorkan field mentah lain dari kammi.id (jenjang kaderisasi, keadaan kader, struktur) ke pemanggil anonim.
- [ ] Setiap alasan gagal dari modul verifikasi (format tidak valid, duplikat, tidak ditemukan, tidak memenuhi syarat, kegagalan upstream) menghasilkan kode/pesan galat yang bisa dibedakan klien satu sama lain.
- [ ] Endpoint menolak permintaan tanpa token Turnstile valid, pada **setiap** panggilan — bukan adaptif seperti proteksi login yang sudah ada (yang baru mewajibkan Turnstile setelah beberapa kegagalan).
- [ ] Endpoint membatasi laju permintaan per alamat IP memakai bentuk tabel kunci/hitung-gagal/kedaluwarsa yang sama seperti yang sudah dipakai untuk percobaan login, di bawah namespace kunci yang berbeda.
- [ ] Test seam HTTP Worker (pola yang sama seperti test pendaftaran/login yang sudah ada) mencakup: verifikasi sukses, setiap alasan gagal, penolakan permintaan tanpa Turnstile, dan pembatasan laju per-IP setelah berulang kali dipanggil.
