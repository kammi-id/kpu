# 01: Migrasi skema NIA

**What to build:** Tabel pengguna (`user`) punya tempat menyimpan NIA yang valid secara format dan unik di seluruh aplikasi, siap dipakai fitur Verifikasi NIA di ticket-ticket berikutnya.

**Blocked by:** None (bisa mulai sekarang)

**Status:** done

- [x] Migrasi baru menambahkan kolom `nia` pada tabel `user`: teks, UNIQUE, CHECK persis 11 digit angka.
- [x] Kolom `nia` wajib (NOT NULL) untuk peran `bacalon`, dikecualikan untuk `admin` — mengikuti pola constraint gabungan yang sudah ada untuk `whatsapp`/`persetujuanVersi`/`persetujuanPada`.
- [x] Percobaan menyimpan NIA dengan format salah (bukan persis 11 digit) atau NIA duplikat ditolak di tingkat database.
- [x] Test integritas migrasi (mengikuti pola test integritas migrasi yang sudah ada di repo ini) memverifikasi bentuk kolom dan constraint di atas.

## Comments

Implemented in `migrations/0003_migrasi_skema_nia.sql` (table-recreate pattern per migration 0002, since SQLite can't ALTER a multi-column CHECK; `vKelengkapan` view also had to be dropped/recreated around the swap). Integrity tests added to `src/worker/index.test.ts` under "migrasi 0003_migrasi_skema_nia: integritas".

Known, accepted consequence (confirmed with the user): making `nia` NOT NULL for `bacalon` breaks the real `/sign-up/email` flow and everything that signs up a bacalon fixture through it — 6 test files, 54 tests (auth, akunBerkas, akunData, adminBacalon, akunPengaturan route tests). Nothing wires `nia` into signup yet; that belongs to ticket 04 (`penggerbangan-signup`). Raw-SQL test fixtures that don't go through signup (index.test.ts, ekspor.test.ts, penghapusanAkhir.test.ts, peraturan.test.ts) were updated to supply a valid `nia` and are green. `metaHalaman.test.ts` (4 more failing tests) is unrelated pre-existing/environmental — it needs a `dist/` build this fresh worktree doesn't have.
