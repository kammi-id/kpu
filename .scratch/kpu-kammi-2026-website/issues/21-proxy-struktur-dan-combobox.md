# 21: Proxy struktur kammi.id dan komponen combobox searchable

**What to build:** Tambahkan rute Worker yang meneruskan `GET https://kammi.id/api/v1/struktur?jenis=pw|pd&ancestor=<idPw>` ke kammi.id memakai `KAMMI_ID_TOKEN` (sudah tersedia di non-prod, mengikuti pola `verifikasiNia`), sehingga peramban tidak pernah memanggil kammi.id langsung (menghindari CORS dan tidak membocorkan token). Bentuk respons aktual (nama field id/nama/induk, dan nama parameter persis untuk `ancestor`) belum dikonfirmasi — langkah pertama tiket ini adalah memanggil endpoint sungguhan dengan token non-prod dan mendokumentasikan bentuknya sebelum menulis kontrak tipe final.

Tambahkan juga komponen combobox searchable generik di `~/components/ui`, dibangun di atas `@base-ui/react/combobox` (proyek ini memakai varian shadcn `base-rhea`/Base UI, bukan Radix+cmdk — pola `Command`+`Popover` dari dokumentasi shadcn standar tidak berlaku di sini). Komponen menerima daftar opsi `{id, label}`, mendukung pengetikan-cari, dan mengizinkan nilai bebas (free text) sebagai fallback ketika tidak ada opsi yang cocok atau API gagal — pengguna tetap dapat mengisi manual.

Ini murni infrastruktur baru (rute + komponen); tidak ada pemakai lain yang berubah pada tiket ini.

Rujukan: [spec](../spec.md) bagian Kontrak API.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Panggilan langsung ke endpoint kammi.id (dengan token non-prod) didokumentasikan sebagai komentar/catatan di kode: bentuk respons dan nama parameter `ancestor` yang sebenarnya.
- [ ] Rute Worker baru meneruskan `jenis` dan `ancestor` ke kammi.id, menyisipkan `Authorization: Bearer <KAMMI_ID_TOKEN>`, dan meneruskan hasilnya tanpa membocorkan token ke klien.
- [ ] Rute menolak `jenis` selain `pw`/`pd`, dan mewajibkan `ancestor` ketika `jenis=pd`.
- [ ] Komponen combobox: pencarian mengetik, pemilihan opsi mengembalikan `{id, label}`, dan input bebas mengembalikan string biasa ketika tidak ada opsi cocok.
- [ ] Komponen combobox mendukung status "dinonaktifkan" (dipakai kelak untuk Asal PD sebelum PW dipilih).
- [ ] Uji unit untuk rute proxy (payload valid/tidak valid, token disisipkan, tidak bocor ke respons klien).

## Comments
