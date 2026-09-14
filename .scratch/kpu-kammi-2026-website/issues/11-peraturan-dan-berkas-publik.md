# 11: Peraturan dan Berkas Publik

**What to build:** Admin membuka `/admin/peraturan` dan melakukan hal berikut:

- menulis ringkasan PKPU sebagai Markdown dengan pratinjau; simpan menimpa tanpa riwayat, dapat dilakukan di tahap mana pun selain Selesai;
- mengunggah Berkas Publik PDF atau DOCX ≤ 20 MiB dengan judul, kategori `peraturan` atau `formulir`, dan urutan;
- menghapus Berkas Publik.

Pengunjung tanpa akun membaca `/peraturan` (Markdown + Berkas Publik kategori `peraturan`) dan mengunduh Formulir A.1–A.6 di `/unduhan` (kategori `formulir`, menurut urutan). Seluruh unduhan berupa attachment dengan `nosniff`. Kedua halaman menampilkan "Menyusul" bila kosong.

Unggahan memakai kontrak body mentah dengan `Content-Length` wajib dan kunci R2 `publik/<UUIDv4>`, sama dengan unggahan berkas Bakal Calon.

Rujukan: [spec](../spec.md) bagian Peraturan dan Berkas Publik, dan Kelompok berkas dan unggahan (kontrak unggah).

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Hanya sesi Admin yang dapat menyimpan Peraturan serta mengunggah dan menghapus Berkas Publik. Sesi Bakal Calon dan tanpa sesi ditolak.
- [ ] Markdown Peraturan berisi `<script>`, atribut `on*`, atau tautan `javascript:` tersimpan apa adanya, tidak pernah dijawab sebagai HTML, dan tidak dieksekusi atau dirender sebagai HTML di `/peraturan` maupun pratinjau (acceptance 28).
- [ ] Markdown > 400.000 karakter ditolak.
- [ ] Berkas Publik hanya menerima PDF/DOCX ≤ 20 MiB dengan ekstensi, MIME, dan signature (`%PDF-` / `PK\x03\x04`) yang cocok. Berkas tanpa `Content-Length`, kosong, atau berukuran berlebih ditolak.
- [ ] Berkas Publik dapat diunduh tanpa sesi dengan `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff` (acceptance 29).
- [ ] `/unduhan` hanya menampilkan kategori `formulir` dan menyediakan A.1–A.6 setelah diunggah (acceptance 5). `/peraturan` hanya menampilkan kategori `peraturan`.
- [ ] Hapus Berkas Publik menghapus baris D1 dan objek R2. Kegagalan INSERT setelah `R2.put` tidak meninggalkan objek.
- [ ] Audit mencatat `ubah_peraturan`, `unggah_berkas_publik`, dan `hapus_berkas_publik` dengan aktor `Admin bersama`.
- [ ] Butir server diuji lewat seam Worker.
