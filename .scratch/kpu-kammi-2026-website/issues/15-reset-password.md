# 15: Reset Password

**What to build:** Bakal Calon Ketua Umum yang lupa kata sandi menghubungi kanal resmi. Admin mencocokkan identitasnya di luar aplikasi, lalu menekan **Reset Password** di `/admin/:id`. Dialog konfirmasi meminta kata sandi Admin, yang diverifikasi server.

Bila benar:

- sistem membuat kata sandi baru 16 karakter tanpa karakter ambigu (`0 O o 1 l I`);
- kata sandi ditampilkan sekali dengan tombol salin;
- seluruh sesi akun sasaran dicabut;
- pemilik akun dapat langsung login dengan kata sandi baru.

Lima kegagalan konfirmasi berturut-turut mencabut sesi Admin yang sedang dipakai.

Mekanisme konfirmasi kata sandi Admin dibangun sebagai satu fungsi bersama karena dipakai ulang oleh Hapus data akun (tiket 17).

Rujukan: [spec](../spec.md) bagian Konfirmasi kata sandi Admin.

**Blocked by:** 14

**Status:** ready-for-human

- [ ] Kata sandi Admin yang salah menolak reset dan menambah penghitung `konfirmasi:<HMAC sesiId>`. Kegagalan kelima berturut-turut mencabut sesi Admin tersebut. Keberhasilan mereset penghitung (acceptance 27).
- [ ] Kata sandi baru panjangnya 16 karakter, hanya dari alfabet tanpa karakter ambigu, dibuat dengan `crypto.getRandomValues` tanpa bias modulo, dan langsung dapat dipakai login (acceptance 27).
- [ ] Seluruh sesi akun sasaran dicabut. Sesi lama akun sasaran ditolak setelah reset (acceptance 23).
- [ ] Kata sandi baru hanya ada di respons satu kali; tidak disimpan dalam bentuk mentah dan tidak masuk log maupun audit.
- [ ] Reset hanya dapat dilakukan sesi Admin dan hanya untuk akun `bacalon`.
- [ ] Audit mencatat `reset_kata_sandi` (berhasil/gagal) dengan aktor `Admin bersama`, `sesiId`, dan `sasaranUserId`.
- [ ] Butir server diuji lewat seam Worker.

## Comments

- Diimplementasikan 2026-09-15. `konfirmasiKataSandiAdmin` (`src/worker/lib/konfirmasiAdmin.ts`) dibangun sebagai fungsi bersama sesuai spec, dipakai `POST /api/admin/:id/reset-password`: memverifikasi kata sandi Admin lewat `auth.api.verifyPassword`, mencabut sesi Admin sendiri pada kegagalan kelima berturut-turut (penghitung `konfirmasi:<HMAC sesiId>` di `percobaanLogin`, direset saat berhasil), membuat kata sandi 16 karakter dari `crypto.getRandomValues` tanpa bias modulo dan tanpa karakter ambigu, lalu `setUserPassword` + `revokeUserSessions` pada akun sasaran. Audit `reset_kata_sandi` dicatat untuk kedua hasil tanpa pernah menyertakan kata sandi.
- Sisi klien: dialog **Reset Password** di `/admin/:id` (`ResetPasswordDialog.tsx`, shadcn Dialog/Base UI) meminta kata sandi Admin, lalu menampilkan kata sandi baru sekali dengan tombol salin.
- Uji seam Worker (10 kasus di `adminBacalon.test.ts`) mencakup: reset berhasil dan sesi lama ditolak; kata sandi salah ditolak dengan audit gagal; kegagalan kelima mencabut sesi Admin; keberhasilan mereset penghitung (empat kegagalan berikutnya belum mencabut); sesi Bakal Calon ditolak; target selain `bacalon` ditolak. `npm test`, `npm run lint`, dan `npm run build` lulus.
- Status tetap `ready-for-human`: walkthrough peramban dengan login sungguhan terhambat oleh isu lokal `wrangler dev` yang tidak berkaitan (Better Auth menolak origin lokal meski `BETTER_AUTH_URL`/`routes` diubah — perlu ditelusuri terpisah, lihat catatan di tiket 16). Rute dan komponen sudah diverifikasi merender tanpa galat konsol dan diarahkan ke `/masuk` saat tanpa sesi.
