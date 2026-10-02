---
target: Beranda hasil verifikasi dan unggahan admin
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/Users/radenpioneer/projects/kpu/src/react-app/routes/Beranda.tsx"
target_fingerprint: "sha256:f920923504bdc67bb5a5fc6dce3891383588bb4b26d459338eb64a9e9781d578"
target_path: /Users/radenpioneer/projects/kpu/src/react-app/routes/Beranda.tsx
timestamp: 2026-10-02T09-43-27Z
slug: src-react-app-routes-beranda-tsx
---
Method: dual-agent (A: /root/design_critique · B: /root/technical_audit)

Target: `src/react-app/routes/Beranda.tsx`, dengan Header, PublicPageHero, SplitFlap, AdminUnggahBerkas dan SlotBerkasPublik sebagai pendukung. Mode Read untuk beranda; Operate untuk admin. Review pada 2 Oktober 2026; tidak mengubah UI.

## Verdict

Desain terasa dibuat untuk KAMMI: bidang merah Muktamar, ilustrasi, hierarki judul poster, dan split-flap marun membentuk identitas yang konsisten. Panel hasil sudah jelas setelah ditemukan. Kelemahan terbesar ada pada pengelolaan publikasi di admin dan jarak menuju tindakan utama, bukan pada identitas visual.

Detector enam komponen: exit 0, JSON [], 0 findings dan 0 advisories; tidak ada false positive. Temuan di bawah berasal dari review manusia, inspeksi desktop dan pemeriksaan kode. Detector bersih bukan bukti seluruh keadaan UI sudah benar.

## Critique: 27/40 — Acceptable

Skor heuristik gabungan beranda/admin, bukan ukuran objektif kualitas atau sertifikasi aksesibilitas. Seluruh sepuluh heuristik berlaku karena alur admin ikut dinilai.

| Heuristik Nielsen | Skor | Temuan utama |
|---|---:|---|
| Status sistem | 2/4 | Loading admin terlihat kosong; progres unggahan kurang jelas |
| Bahasa dunia nyata | 4/4 | Istilah Indonesia, PDF dan jadwal WIB jelas |
| Kendali pengguna | 2/4 | Hapus tanpa konfirmasi atau pemulihan |
| Konsistensi | 3/4 | Identitas konsisten; sebagian kontrol kecil |
| Pencegahan kesalahan | 2/4 | Validasi PDF ada; publikasi mudah berubah karena salah klik |
| Pengenalan | 3/4 | Penanda aktif membantu, tetapi keadaan gagal memuat membingungkan |
| Efisiensi | 3/4 | Unduhan langsung; slot dokumen dipakai kembali |
| Estetika/minimalisme | 3/4 | Panel ringkas; hero mendahului tindakan utama cukup jauh |
| Pemulihan galat | 2/4 | Pesan ada, retry admin belum ada |
| Bantuan | 3/4 | Petunjuk tahap dan fallback dekat tindakan |
| **Total** | **27/40** | **Acceptable** |

## Audit: 13/20 — Acceptable

Skor teknis sementara berdasarkan kode dan bukti desktop terbatas; bukan hasil Lighthouse atau audit kepatuhan WCAG lengkap.

| Dimensi | Skor | Bukti/batas |
|---|---:|---|
| Aksesibilitas | 3/4 | Label, heading dan reduced motion ada; keberhasilan operasi belum diumumkan jelas |
| Performa | 3/4 | Gambar responsif AVIF/WebP dan lazy route; metrik runtime belum diukur |
| Responsif | 2/4 | Risiko flip 320px dan kontrol 32px |
| Theming | 3/4 | Token merek konsisten; beberapa ukuran menyimpang dari DESIGN.md |
| Integritas implementasi | 2/4 | Urutan PDF aktif benar; loading dan penghapusan punya celah operasional |
| **Total** | **13/20** | **Acceptable** |

## Yang sudah kuat

- Hierarki dua blok judul terlihat jelas di desktop; ilustrasi tidak tampak overflow pada ukuran yang diperiksa.
- Alur split-flap → petunjuk → tombol PDF terasa koheren. Judul pengantar yang dihapus tidak perlu dikembalikan.
- Unduhan tetap tersedia ketika petunjuk gagal dimuat; admin menjelaskan PDF terbaru dan fallback. Heading tersembunyi menyediakan nama semantik untuk animasi, dan reduced motion menampilkan teks statis.

## Priority Issues

1. **P1 — Hapus PDF aktif langsung mengubah dokumen publik.** `SlotBerkasPublik.tsx:58` dan `:84` langsung memanggil penghapusan; Worker menghapus baris dan objek tanpa undo. Salah klik dapat mengaktifkan surat sebelumnya. Tambahkan konfirmasi berisi nama PDF dan dokumen penggantinya, dengan pilihan batal. **Command:** `$impeccable harden`.
2. **P1 — Loading/galat admin tampil sebagai kosong.** `AdminUnggahBerkas.tsx:10` dan `:29`: seluruh daftar mulai kosong dan satu kegagalan Promise.all membuang semua hasil. Slot tetap menampilkan “Belum ada” dan input aktif. Bedakan loading, gagal, dan benar-benar kosong per daftar; pertahankan hasil yang berhasil dan sediakan retry. **Command:** `$impeccable harden`.
3. **P2 — Flip berisiko overflow pada 320px.** `Beranda.tsx:50`, `SplitFlap.tsx:53`: konten panel 248px, sementara kata VERIFIKASI membutuhkan sekitar 264px pada root font 16px. Ini risiko 16px dari perhitungan kode, belum render ponsel. Sesuaikan ukuran ubin/gap minimum terhadap ruang yang tersedia, sambil mempertahankan animasi. **Command:** `$impeccable adapt`.
4. **P2 — Unduhan utama muncul terlambat.** Pada desktop, tombol PDF perlu satu scroll. `PublicPageHero.tsx:26` memberi minimum 90vh ponsel dan 75vh desktop sebelum panel. Pertahankan hero/ilustrasi yang disetujui, tetapi pendekkan tinggi atau jaraknya untuk membawa aksi lebih awal. Dampak ponsel masih source-derived. **Command:** `$impeccable adapt`.
5. **P2 — Progres dan keberhasilan unggahan kurang tegas.** `SlotBerkasPublik.tsx:34` dan `:50`: kontrol dinonaktifkan ketika bekerja, tetapi keberhasilan mengosongkan pesan. Tambahkan status “Mengunggah…” serta “PDF ini sekarang aktif di beranda” dalam live region yang stabil. **Command:** `$impeccable clarify`.

## Temuan teknis tambahan

- **P2 — Kontrol pendukung 32px:** Header Masuk serta admin Unduh/Hapus memakai size sm; input juga 32px (`button.tsx:25`, `input.tsx:11`). Perbesar area sentuh mobile mengikuti kontrak 44px; tombol utama sudah 48px. Angka 32px saja tidak membuktikan pelanggaran WCAG 2.2 AA. **Command:** `$impeccable adapt`.
- **P3 — Heading admin Lilita 20px:** `AdminUnggahBerkas.tsx:47` memakai text-xl, di bawah minimum 24px dalam DESIGN.md. Gunakan Poppins semibold pada ukuran itu atau naikkan ukuran display. **Command:** `$impeccable polish`.

Jumlah unik: **0 P0, 2 P1, 4 P2, 1 P3**. Pola utamanya adalah kurangnya pembedaan keadaan operasi admin, bukan kerusakan sistem desain menyeluruh.

## Beban kognitif, perjalanan dan persona

Beban rendah di panel publik: satu tindakan utama, jadwal kontekstual, tiga pintu dokumen terkelompok. Tidak ada titik keputusan utama dengan lebih dari empat pilihan. Beban naik ketika admin harus menafsirkan “Belum ada” di tengah galat global.

Identitas resmi membangun kepercayaan; scroll sebelum unduhan menunda penyelesaian. Penanda “Aktif di beranda” meyakinkan, tetapi unggahan senyap dan hapus langsung menambah ketidakpastian pada saat publikasi.

- Jordan/pendatang baru: tindakan jelas setelah panel ditemukan; kegagalan admin dapat disalahartikan sebagai tidak ada surat.
- Casey/pengguna ponsel: hero panjang dan kontrol kecil menambah usaha; unduhan tanpa login merupakan kekuatan.
- Riley/penguji kondisi ekstrem: satu fetch gagal membuat seluruh daftar tampak kosong; perubahan surat karena hapus terlalu mudah; koneksi lambat kurang mendapat umpan balik.

## Observasi minor dan pengecualian

“Jadwal berikutnya” juga memasukkan tahap berjalan; label “Tahapan saat ini dan berikutnya” lebih tepat. Dark mode memang tidak masuk kontrak. Eager loading hero disengaja untuk LCP. Badge pembaruan tidak tampil pada tanggal review. Tidak ada bug nama file panjang yang terbukti. App mengganti seluruh halaman dengan SelesaiPage setelah tahap Selesai, jadi CTA aktif setelah penutupan bukan temuan stabil.

## Pertanyaan untuk langkah berikutnya

1. Prioritas: pengamanan/status admin atau responsivitas/kecepatan menemukan unduhan?
2. Scope: P1 saja, P1+P2, atau semua temuan?
3. Hero: pertahankan proporsi sekarang atau pendekkan sambil mempertahankan identitas dan ilustrasi?
