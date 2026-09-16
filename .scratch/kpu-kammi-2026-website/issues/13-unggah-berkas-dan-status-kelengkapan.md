# 13: Unggah berkas dan Status Kelengkapan Berkas

**What to build:** Bakal Calon Ketua Umum membuka `/akun/berkas` dan melihat sepuluh kelompok berkas dengan penanda hadir atau belum. Di `/akun/berkas/:no`, ia membaca ketentuan format, lalu mengunggah, menghapus, dan mengunduh kembali berkasnya sebagai attachment. Ganti berkas dilakukan dengan hapus lalu unggah.

Kelompok 7 meminta pilihan A.3 dari PW atau A.4 dari PD pada setiap unggahan. Status Kelengkapan Berkas (`x/10`, `Lengkap` atau `Belum lengkap`, dijelaskan sebagai "berkas yang disyaratkan telah berada di sistem") tampil sama di sidebar, `/akun`, dan `/akun/berkas`. Perubahan hanya diterima pada Masa Pendaftaran dan Masa Perbaikan.

Aturan unggah:

- body mentah dengan `Content-Length` wajib;
- validasi ekstensi, MIME, dan signature byte awal terhadap kelompok;
- stream ke `berkas/<UUIDv4>` sambil menghitung SHA-256;
- INSERT bersyarat atomik dengan batas lima berkas per kelompok;
- objek R2 dihapus bila INSERT gagal.

`vKelengkapan` adalah satu-satunya sumber status.

Rujukan: [spec](../spec.md) bagian Kelompok berkas dan unggahan, Skema D1 (`vKelengkapan`), dan Tahap × kemampuan.

**Blocked by:** 10

**Status:** done

- [ ] Kelompok 6 hanya menerima PDF. Sembilan kelompok lain menerima PDF, JPEG, dan PNG (acceptance 14).
- [ ] Berkas > 20 MiB, berkas tanpa `Content-Length`, dan berkas keenam dalam satu kelompok ditolak dengan alasan jelas (acceptance 15).
- [ ] Berkas dengan ekstensi atau MIME yang tidak cocok dengan signature ditolak, begitu pula DOCX, ZIP, dan executable.
- [ ] `berkas.sha256` sama dengan SHA-256 isi objek R2. Kunci R2 tidak memuat identitas, kelompok, atau ekstensi.
- [ ] Kegagalan INSERT, termasuk batas lima, tidak meninggalkan objek R2.
- [ ] Unggahan kelompok 7 tanpa `jenisRekomendasi` ditolak, dan `jenisRekomendasi` di kelompok lain ditolak.
- [ ] Kelompok 7 hadir dengan 2 A.3 atau 3 A.4. Campuran 1 A.3 + 2 A.4 belum hadir (acceptance 13).
- [ ] `x/10` dan label keseluruhan sama di sidebar, `/akun`, dan `/akun/berkas`, semuanya dari `vKelengkapan` (acceptance 12).
- [ ] Unggah dan hapus ditolak server pada Belum dibuka, Pemeriksaan, Terkunci, dan Selesai, dan diterima pada Masa Pendaftaran dan Masa Perbaikan. Antarmuka menampilkan alasannya (acceptance 16 dan 17).
- [ ] Unduh berkas sendiri memakai `Content-Disposition: attachment` dan `X-Content-Type-Options: nosniff`. Bakal Calon lain ditolak walau mengetahui id berkas (acceptance 22, bagian pemilik).
- [ ] Hapus berkas menghapus baris D1 lalu objek R2.
- [ ] Audit mencatat `unggah_berkas` dan `hapus_berkas` tanpa nama berkas.
- [ ] Butir server diuji lewat seam Worker dengan jam yang disuntikkan.
