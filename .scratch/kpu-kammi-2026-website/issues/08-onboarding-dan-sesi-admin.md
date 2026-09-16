# 08: Onboarding dan sesi Admin

**What to build:** Pemegang Admin membuka `/onboard`, memasukkan `ONBOARD_TOKEN`, dan membuat satu-satunya akun Admin bersama (nama tampilan, email, kata sandi minimal 12 karakter). Setelah itu `/onboard` menjawab 404 selamanya. Admin masuk, melihat shell `/admin` beserta footer, dan membaca `/admin/audit` yang sudah mencatat onboarding serta login. Sesi Admin berakhir setelah 30 menit tidak aktif atau 8 jam absolut.

Tiket ini meletakkan inti autentikasi yang dipakai semua tiket berikutnya:

- Better Auth dipin exact di atas D1 native dengan plugin Admin; pembatas bawaan dan pelacakan IP dimatikan;
- permukaan HTTP Better Auth diperkecil ke registrasi, login, keluar, dan sesi, sedangkan endpoint lain termasuk seluruh endpoint plugin Admin menjawab 404;
- cookie `HttpOnly`/`Secure`/`SameSite=Strict`;
- galat tertutup bila secret belum terpasang;
- middleware sesi per peran, dengan urutan tetap sesi → peran → kepemilikan → tahap;
- penulis audit bersama tanpa data pribadi.

Rujukan: [spec](../spec.md) bagian Autentikasi dan sesi, Onboarding Admin, dan Audit.

**Blocked by:** 07

**Status:** done

- [x] `/onboard` menolak token salah, menolak bila `ONBOARD_TOKEN` tidak terpasang, dan menjawab 404 bila Admin sudah ada. Dua onboarding bersamaan hanya menghasilkan satu Admin, dan pelanggaran indeks tidak menjadi 500 (acceptance 26).
- [x] Token dibandingkan secara aman terhadap timing.
- [x] Tanpa `BETTER_AUTH_SECRET`, `HMAC_SECRET`, atau `TURNSTILE_SECRET_KEY`, endpoint autentikasi dan onboarding menjawab galat tertutup (checklist tiket 06 C12).
- [x] Endpoint HTTP Better Auth di luar registrasi, login, keluar, dan sesi menjawab 404, termasuk pembuatan user, set-role, impersonasi, `update-user`, `change-email`, dan `change-password`.
- [x] Sesi Admin ditolak setelah 30 menit tidak aktif atau 8 jam absolut. Login keenam mencabut sesi tertua.
- [x] Tanpa sesi, API Admin menolak dan klien `/admin` mengarahkan ke `/masuk`.
- [x] Audit mencatat `onboarding_admin` dan login berhasil/gagal dengan aktor `Admin bersama` atau `Anonim`, beserta `sesiId` dan waktu, tanpa email atau nama (acceptance 25, sebagian).
- [x] `/admin/audit` menampilkan waktu, aktor, tindakan, sasaran, dan hasil, terbaru lebih dulu dengan halaman sederhana.
- [x] Seluruh butir di atas diuji lewat seam Worker.

## Comments

- Better Auth 1.7.4 uses native D1 with only the required HTTP endpoints exposed; the Worker serves `/onboard` before an Admin exists and returns 404 afterwards.
- Verification: `npm run cf-typegen`, `npm test`, `npm run lint`, `npm run build`, and `npm run check` pass. Lint retains five pre-existing fast-refresh/generated-file warnings.
- Review follow-up: session expiration now applies to `/api/auth/get-session`; login and Admin API close at tahap `Selesai`; Admin uses its dedicated white shell with footer; audit columns follow the documented label treatment.
