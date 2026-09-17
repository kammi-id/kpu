# 23: Isi otomatis Data pribadi dari Formulir A.1 Bacalon

**What to build:** Tambahkan tombol "Isi otomatis dari Formulir A.1" pada `/akun/data`, aktif hanya ketika Kelompok Berkas 1 (Formulir A.1 Bacalon, lihat CONTEXT.md) berstatus hadir. Menekan tombol memanggil rute Worker baru yang mengirim berkas A.1 tersimpan ke model LLM berkemampuan visi (belum ada preseden OCR/ekstraksi dokumen di kodebase ini — ini kapabilitas baru), meminta ekstraksi seluruh kolom `profil` yang tidak terkunci: nama panggilan, tempat lahir, tanggal lahir, Asal PW, Asal PD, tahun dan tempat lulus DM 3, status instruktur, capaian hafalan, bahasa asing.

Hasil ekstraksi mengisi **hanya kolom yang sedang kosong** di formulir (belum tersimpan) — tidak pernah menimpa nilai yang sudah ada, baik yang diisi manual maupun hasil isi-otomatis sebelumnya. Tidak ada langkah "simpan" terpisah untuk hasil ekstraksi: ia hanya mengisi state formulir, dan tombol Simpan yang sudah ada di tiket 12 tetap menjadi satu-satunya jalan menulis ke `profil` — ini sekaligus menjadi langkah tinjau-dan-konfirmasi karena pengguna melihat nilai terisi sebelum menekan Simpan.

Untuk Asal PW, Asal PD, dan Tempat Lulus DM3 (tiket 22), teks lokasi hasil ekstraksi dicocokkan (fuzzy match: menormalkan huruf besar/kecil, spasi, dan awalan umum seperti "PW"/"Pengurus Wilayah") terhadap daftar dari rute struktur (tiket 21) untuk memilih entri combobox yang tepat. Bila tidak ada berkas, berkas tidak dapat dibaca, atau tidak ada kecocokan struktur, kolom terkait dibiarkan kosong untuk diisi manual (poin 4) — tombol tidak pernah gagal keras karena hasil ekstraksi buruk.

Rujukan: [spec](../spec.md) bagian Data pribadi dan Kelompok berkas dan unggahan.

**Blocked by:** 21 (daftar struktur untuk pencocokan). Bagian backend (panggilan LLM) dapat dikerjakan berdampingan dengan 22; pengait ke field combobox di frontend menunggu 22 selesai.

**Status:** ready-for-agent

- [ ] Tombol nonaktif dan menjelaskan alasannya ketika Kelompok Berkas 1 belum hadir.
- [ ] Rute Worker baru mengambil berkas A.1 tersimpan (kelompok 1) dari R2, mengirimkannya ke model visi, dan mengembalikan kolom-kolom `profil` yang berhasil terbaca sebagai JSON terstruktur.
- [ ] Ekstraksi hanya mengisi kolom yang kosong di state formulir saat itu; kolom yang sudah terisi (manual atau isi-otomatis sebelumnya) tidak pernah tertimpa.
- [ ] Teks lokasi hasil ekstraksi dicocokkan ke daftar struktur (tiket 21) dengan normalisasi dasar; tanpa kecocokan → kolom tetap kosong, bukan diisi paksa dengan teks mentah.
- [ ] Kegagalan pemanggilan LLM (timeout, berkas tidak terbaca, respons tidak valid) tidak menggagalkan halaman — formulir tetap dapat diisi manual seperti biasa.
- [ ] Tidak ada penulisan ke `profil` di rute ini; penulisan tetap lewat `PUT /api/akun/data` yang sudah ada.
- [ ] Butir server diuji lewat seam Worker, termasuk kasus berkas tidak terbaca dan respons LLM tidak lengkap/tidak valid.

## Comments
