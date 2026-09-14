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

**Status:** ready-for-agent

- [ ] `/onboard` menolak token salah, menolak bila `ONBOARD_TOKEN` tidak terpasang, dan menjawab 404 bila Admin sudah ada. Dua onboarding bersamaan hanya menghasilkan satu Admin, dan pelanggaran indeks tidak menjadi 500 (acceptance 26).
- [ ] Token dibandingkan secara aman terhadap timing.
- [ ] Tanpa `BETTER_AUTH_SECRET`, `HMAC_SECRET`, atau `TURNSTILE_SECRET_KEY`, endpoint autentikasi dan onboarding menjawab galat tertutup (checklist tiket 06 C12).
- [ ] Endpoint HTTP Better Auth di luar registrasi, login, keluar, dan sesi menjawab 404, termasuk pembuatan user, set-role, impersonasi, `update-user`, `change-email`, dan `change-password`.
- [ ] Sesi Admin ditolak setelah 30 menit tidak aktif atau 8 jam absolut. Login keenam mencabut sesi tertua.
- [ ] Tanpa sesi, API Admin menolak dan klien `/admin` mengarahkan ke `/masuk`.
- [ ] Audit mencatat `onboarding_admin` dan login berhasil/gagal dengan aktor `Admin bersama` atau `Anonim`, beserta `sesiId` dan waktu, tanpa email atau nama (acceptance 25, sebagian).
- [ ] `/admin/audit` menampilkan waktu, aktor, tindakan, sasaran, dan hasil, terbaru lebih dulu dengan halaman sederhana.
- [ ] Seluruh butir di atas diuji lewat seam Worker.
