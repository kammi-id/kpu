# 22: Combobox Asal PW/PD/Tempat Lulus DM3, validasi, dan redesain formulir

**What to build:** Pada `/akun/data`, ganti input teks bebas Asal PW dan Tempat Lulus DM3 dengan combobox searchable (tiket 21) berjenis `pw`. Ganti Asal PD dengan combobox berjenis `pd`, dinonaktifkan sampai Asal PW terisi, dan hasilnya dibatasi (`ancestor`) ke PW yang dipilih.

Setiap kolom menyimpan referensi struktur (`id` + label) ketika dipilih dari combobox, atau teks biasa bertanda "tidak tercatat di struktur resmi, isi manual" ketika pengguna mengetik bebas karena API gagal atau opsi tidak tersedia (poin 4: kolom tetap boleh kosong dan tidak menghalangi simpan). Tambahkan lencana kecil pada nilai bertanda manual agar Admin/KPU dapat mengenalinya saat verifikasi nanti.

Perbaiki juga bug batas atas Tahun Lulus DM3: `tahunLulusDm3Valid()` (`src/worker/lib/profil.ts`) dan `CHECK` D1 sama-sama memakai angka tetap `2026`, sehingga akan menolak tahun 2027 yang sah begitu tahun berganti. Ubah keduanya memakai tahun berjalan (`new Date().getFullYear()` di kode; `strftime('%Y','now')` pada `CHECK` lewat migrasi baru).

Sekalian lakukan redesain visual formulir Data pribadi memakai komponen shadcn yang relevan (Input, Field/Form, kartu pengelompokan) agar konsisten dengan combobox baru dan blok identitas tiket 20.

Rujukan: [spec](../spec.md) bagian Data pribadi dan Skema D1.

**Blocked by:** 21. Disarankan berjalan setelah/berdampingan dengan 20 (menyentuh berkas yang sama, `AkunData.tsx`).

**Status:** ready-for-agent

- [ ] Migrasi menambah kolom referensi (mis. `asalPwId`, `asalPdId`, `tempatLulusDm3Id` — nullable) dan penanda manual per kolom pada `profil`; kolom teks lama tetap menyimpan label tampilan.
- [ ] Asal PW dan Tempat Lulus DM3 memakai combobox `jenis=pw`; Asal PD memakai `jenis=pd`, dinonaktifkan sampai Asal PW terisi, dan terbatas pada `ancestor` PW terpilih.
- [ ] Memilih dari combobox menyimpan `id` + label; mengetik bebas (tanpa match) menyimpan teks biasa dan menandai kolom sebagai manual, ditampilkan dengan lencana.
- [ ] Tahun Lulus DM3 divalidasi 1998–tahun berjalan, di klien dan server, memakai tahun yang dihitung saat itu juga (bukan angka tetap).
- [ ] Migrasi mengubah `CHECK` D1 `tahunLulusDm3` memakai `strftime('%Y','now')`.
- [ ] Redesain formulir memakai komponen shadcn yang sudah ada di proyek (Input, dsb.) tanpa CSS custom di luar Tailwind.
- [ ] Butir server (validasi, upsert kolom baru) diuji lewat seam Worker dengan jam yang disuntikkan (mencakup kasus 31 Desember → 1 Januari untuk batas tahun).

## Comments
