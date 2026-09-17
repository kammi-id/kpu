# 05: NIA di dashboard Admin dan Ekspor Harian

**What to build:** Admin KPU bisa melihat NIA seorang Bakal Calon di halaman detailnya, dan NIA ikut tercantum di berkas Ekspor Harian yang diunduh Admin.

**Blocked by:** 01 (Migrasi skema NIA)

**Status:** ready-for-agent

- [ ] Halaman/API detail Bacalon admin menampilkan `nia`.
- [ ] Berkas CSV Ekspor Harian menyertakan kolom `nia`, sejajar dengan kolom inti pendaftaran lain yang sudah ada (nama, email, whatsapp).
- [ ] Test memakai data uji yang disisipkan langsung ke database — tidak bergantung pada Ticket 02/03/04 selesai, sehingga ticket ini bisa dikerjakan paralel dengan ketiganya.
- [ ] Kolom NIA di tabel ringkasan admin bersifat opsional — tidak wajib ada sebagai bagian dari ticket ini.
