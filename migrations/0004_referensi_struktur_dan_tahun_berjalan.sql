-- Tiket 22: kolom referensi struktur (asalPwId/asalPdId/tempatLulusDm3Id) dan
-- penanda manual per kolom pada "profil", untuk combobox searchable (tiket 21)
-- di /akun/data. Kolom teks lama (asalPw, asalPd, tempatLulusDm3) tetap
-- menyimpan label tampilan baik saat dipilih dari combobox maupun diketik
-- manual; kolom Id kosong (NULL) persis pada kasus manual — "manual" dihitung
-- server (routes/akunData.ts) dari (Id NULL DAN teks tidak NULL), bukan
-- dikirim mentah dari klien, supaya tidak ada dua sumber yang bisa bertentangan.
--
-- Sekalian memperbaiki batas atas tahunLulusDm3, yang sebelumnya memakai
-- angka tetap 2026 (migrasi 0001, CHECK D1) dan akan menolak 2027 yang sah
-- begitu tahun berganti. Percobaan pertama memindahkan batas atas ke CHECK D1
-- memakai strftime('%Y','now') GAGAL secara empiris: D1 menolaknya dengan
-- "non-deterministic use of strftime() in a CHECK constraint" — SQLite/D1
-- tidak mengizinkan fungsi non-deterministik di CHECK sama sekali, berbeda
-- dari default value atau trigger. Batas atas karenanya HANYA ditegakkan di
-- aplikasi (`tahunLulusDm3Valid` di lib/profil.ts, sekarang menerima jam
-- suntikan alih-alih angka tetap); CHECK D1 di bawah hanya menyisakan batas
-- bawah (1998) yang deterministik.
--
-- SQLite tidak mengizinkan ALTER CHECK, jadi tabel dibuat ulang seperti pada
-- migrasi 0002/0003. "profil" tidak dirujuk view mana pun (berbeda dari
-- "user" di migrasi 0003), jadi tidak perlu DROP/CREATE VIEW di sekitar ini.
CREATE TABLE "profil_baru" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "namaPanggilan" TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT CHECK ("tanggalLahir" IS NULL OR date("tanggalLahir") = "tanggalLahir"),
  "asalPw" TEXT,
  "asalPwId" TEXT,
  "asalPwManual" INTEGER NOT NULL DEFAULT 0 CHECK ("asalPwManual" IN (0, 1)),
  "asalPd" TEXT,
  "asalPdId" TEXT,
  "asalPdManual" INTEGER NOT NULL DEFAULT 0 CHECK ("asalPdManual" IN (0, 1)),
  "tahunLulusDm3" INTEGER CHECK ("tahunLulusDm3" IS NULL OR "tahunLulusDm3" >= 1998),
  "tempatLulusDm3" TEXT,
  "tempatLulusDm3Id" TEXT,
  "tempatLulusDm3Manual" INTEGER NOT NULL DEFAULT 0 CHECK ("tempatLulusDm3Manual" IN (0, 1)),
  "instruktur" INTEGER CHECK ("instruktur" IS NULL OR "instruktur" IN (0, 1)),
  "capaianHafalan" TEXT,
  "bahasaAsing" TEXT,
  "diubahPada" DATE NOT NULL
);
INSERT INTO "profil_baru" ("userId", "namaPanggilan", "tempatLahir", "tanggalLahir", "asalPw", "asalPd", "tahunLulusDm3", "tempatLulusDm3", "instruktur", "capaianHafalan", "bahasaAsing", "diubahPada")
SELECT "userId", "namaPanggilan", "tempatLahir", "tanggalLahir", "asalPw", "asalPd", "tahunLulusDm3", "tempatLulusDm3", "instruktur", "capaianHafalan", "bahasaAsing", "diubahPada" FROM "profil";
DROP TABLE "profil";
ALTER TABLE "profil_baru" RENAME TO "profil";
