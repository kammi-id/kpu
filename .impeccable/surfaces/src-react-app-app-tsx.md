---
version: 1
slug: "src-react-app-app-tsx"
primary_target: "src/react-app/App.tsx"
related_targets: ["index.html"]
---

# Beranda publik dan shell publik

Scope: shell publik (header, navigasi, footer penegasan) dan beranda `/`. Mode: Read.
Pengunjung: kader KAMMI dan AB 3 calon pendaftar, sebagian besar di ponsel. Tugas: mengetahui tahap berjalan menurut WIB, apakah `Daftar` terbuka dan mengapa, lalu menuju Peraturan, Jadwal, atau Unduhan.
Konten: logo PP KAMMI (`public/logo-kammi.png`), logo Muktamar XIV (`public/logo-white.png`, `public/logo-colours.png`), foto bersama KPU (`public/members/all.png`, tanpa nama atau jabatan sampai `tentang.md` ada), kalender resmi tiket 02, dan enam tahap operasional.
Keputusan area kerja (didelegasikan pengguna): identitas poster hidup di bingkai (header merah, spanduk tahap, judul display, footer marun); formulir, daftar berkas, dan tabel Admin tenang di atas putih dengan tangga tipe dan tanda status yang sama.
Belum diputuskan: berkas pola ornamen asli kampanye (sementara tile ornamen buatan), kanal resmi WhatsApp/email, akun media sosial.

## Direction contract

THESIS: Penjaringan dibaca seperti papan jadwal pelabuhan Ambon: sepuluh jadwal WIB, satu baris sedang berjalan, sisanya jelas terjadwal atau ditutup. Menolak hero portal organisasi dengan grid tiga kartu dan lencana tahap kecil.

OWN-WORLD: Tiga tinta: merah Muktamar sebagai bidang (≥ sepertiga layar publik), hijau KAMMI untuk status terbuka dan catatan, putih enamel untuk panel papan; navy hanya teks; marun untuk footer dan tepi 3D. Huruf display tebal membulat (keluarga poster kampanye) untuk judul dan ubin split-flap; sans geometris untuk isi, angka tabular. Ornamen tonal di atas merah. Tindakan ditutup tahap diarsir diagonal dengan alasan tertulis; status selalu tanda + teks.

STORY: Pengunjung langsung melihat tahap yang sedang berjalan dan rentang WIB-nya, memahami apakah pendaftaran dibuka, lalu menekan Daftar atau membaca alasannya, dan menemukan tiga pintu resmi. Mereka percaya situs ini internal KAMMI, bukan penyelenggara pemilu.

FIRST VIEWPORT: Ponsel 390: header merah dengan logo PP KAMMI kiri dan Muktamar XIV putih kanan, strip navigasi; judul display putih bertepi marun "Penjaringan Calon Ketua Umum PP KAMMI" dua-tiga baris; baris fakta Ambon · 27–31 Oktober 2026. Panel papan putih menumpang batas merah: label tahap, nama tahap dalam ubin split-flap selebar kolom, rentang WIB tabular, satu kalimat penjelasan, tombol Daftar (atau Daftar terarsir + alasan) dan Masuk. Desktop: judul kiri, foto bersama kanan, papan melebar di bawah dengan jadwal berikutnya di kolom kanan. Signature: ubin split-flap berputar sekali ke nama tahap saat dimuat; reduced-motion menampilkannya statis.

FORM: Papan Keberangkatan Pelabuhan Ambon, kandidat 6 dari daftar tujuh berperingkat. Seed key b68edb44. Raise: batas tiga tinta (Depot Blind), merah ≥ sepertiga layar (Cutting Bench), satu tangga ukuran peringkat (Star Atlas), status bernama bukan warna (Tensegrity), tindakan tertutup diarsir + alasan (Quote Grammar).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
