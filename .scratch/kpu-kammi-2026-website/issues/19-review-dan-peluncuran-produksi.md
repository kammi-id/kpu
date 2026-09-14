# 19: Review dan peluncuran produksi

**What to build:** Seluruh fitur berjalan di `https://kpu.kammi.id` sebelum 17 September 2026 pukul 00.00 WIB (16 September 17.00 UTC). Sisa checklist tiket 06 dijalankan dan acceptance 1–35 terbukti.

Langkahnya:

- review cabang;
- deploy ulang;
- migrasi baru bila ada;
- Admin mengisi Peraturan dan Berkas Publik (D18);
- verifikasi bagian E;
- pengawasan pergantian tahap pada pukul 00.00–00.15 WIB.

Rujukan: [spec](../spec.md) (Further Notes); tiket 06 checklist B, D18, dan E, serta runbook.

**Blocked by:** 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18

**Status:** ready-for-human

- [ ] `ponytail-review` dan `code-review` dijalankan pada seluruh cabang, dan potongannya diterapkan kecuali yang mematahkan spec atau acceptance 1–35.
- [ ] `security-review` dijalankan sebelum deploy produksi, dan temuannya ditangani.
- [ ] Workers Paid aktif di akun pemegang zona `kammi.id`.
- [ ] `tentang.md` beserta aset dari pemilik produk dan `persetujuan-v1` sudah ter-commit (checklist B4–B5), atau `/tentang` sengaja menampilkan "Menyusul".
- [ ] Perubahan skema sejak tiket 09 hanya berupa migrasi baru dan sudah diterapkan ke remote.
- [ ] `npm run check` lulus dan deploy produksi berhasil.
- [ ] Admin mengisi Peraturan serta mengunggah PDF PKPU (kategori `peraturan`) dan Formulir A.1–A.6 (kategori `formulir`) (checklist D18).
- [ ] Seluruh uji otomatis lulus. Acceptance 1–35 diverifikasi; perilaku bergantung waktu diverifikasi lokal dengan jam yang disuntikkan (checklist E19).
- [ ] `workers.dev`, Preview URL, dan r2.dev tidak aktif; `kpu.kammi.id` dilayani Worker (acceptance 35).
- [ ] Tidak ada akun uji di produksi. Pada 17 September 00.00–00.15 WIB, Operator memastikan spanduk berganti ke Masa Pendaftaran dan tombol `Daftar` aktif (checklist E20).
