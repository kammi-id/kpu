-- ADR 0003: berkas dan status instruktur dihapus, Kelompok Berkas menyusut
-- dari sepuluh menjadi sembilan dan dinomori ulang 1..9 (kelompok 5..10 lama
-- turun satu). Objek R2 berkas kelompok 4 lama dihapus LEBIH DULU oleh
-- scripts/hapusBerkasInstruktur.mjs, karena migrasi SQL tidak dapat menyentuh
-- R2; di sini hanya barisnya yang dihapus, dengan jejak audit Sistem.
--
-- "berkas" hanya tabel ANAK (tidak ada foreign key yang merujuknya), jadi
-- membangunnya ulang aman menurut ADR 0002. Pembangunan ulang diperlukan
-- karena CHECK nomor kelompok (BETWEEN 1 AND 10, rekomendasi = 7, PDF saja
-- = 6) tidak dapat diubah dengan ALTER dan akan menolak UPDATE penomoran.
-- vKelengkapan merujuk "berkas", jadi view dijatuhkan dulu dan dibuat ulang.
DROP VIEW "vKelengkapan";

INSERT INTO "audit" ("id", "waktu", "sesiId", "aktor", "aktorUserId", "tindakan", "sasaranUserId", "sasaranBerkasId", "hasil", "keterangan")
SELECT lower(hex(randomblob(16))), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, 'Sistem', NULL, 'hapus_berkas', "userId", "id", 'berhasil',
       'Berkas instruktur (Kelompok Berkas 4 lama) dihapus: tidak lagi wajib diserahkan, ADR 0003'
FROM "berkas" WHERE "kelompok" = 4;
DELETE FROM "berkas" WHERE "kelompok" = 4;

CREATE TABLE "berkas_baru" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "kelompok" INTEGER NOT NULL CHECK ("kelompok" BETWEEN 1 AND 9),
  "jenisRekomendasi" TEXT CHECK ("jenisRekomendasi" IN ('A3_PW', 'A4_PD')),
  "r2Key" TEXT NOT NULL UNIQUE CHECK ("r2Key" GLOB 'berkas/????????-????-4???-????-????????????'),
  "namaAsli" TEXT NOT NULL,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('application/pdf', 'image/jpeg', 'image/png')),
  "ukuranByte" INTEGER NOT NULL CHECK ("ukuranByte" BETWEEN 1 AND 20971520),
  "sha256" TEXT NOT NULL CHECK (length("sha256") = 64),
  "diunggahPada" DATE NOT NULL,
  CHECK (("kelompok" = 6) = ("jenisRekomendasi" IS NOT NULL)),
  CHECK ("kelompok" <> 5 OR "mime" = 'application/pdf')
);
INSERT INTO "berkas_baru" ("id", "userId", "kelompok", "jenisRekomendasi", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
SELECT "id", "userId", CASE WHEN "kelompok" > 4 THEN "kelompok" - 1 ELSE "kelompok" END,
       "jenisRekomendasi", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada"
FROM "berkas";
DROP TABLE "berkas";
ALTER TABLE "berkas_baru" RENAME TO "berkas";
CREATE INDEX "berkas_userId_kelompok_idx" ON "berkas" ("userId", "kelompok");

CREATE VIEW "vKelengkapan" AS
SELECT *, (k1 + k2 + k3 + k4 + k5 + k6 + k7 + k8 + k9) AS "jumlahHadir",
       (k1 + k2 + k3 + k4 + k5 + k6 + k7 + k8 + k9) = 9 AS "lengkap"
FROM (
  SELECT u."id" AS "userId",
    COALESCE(MAX(b."kelompok" = 1), 0) AS k1,
    COALESCE(MAX(b."kelompok" = 2), 0) AS k2,
    COALESCE(MAX(b."kelompok" = 3), 0) AS k3,
    COALESCE(MAX(b."kelompok" = 4), 0) AS k4,
    COALESCE(MAX(b."kelompok" = 5), 0) AS k5,
    CASE WHEN SUM(b."jenisRekomendasi" = 'A3_PW') >= 2
           OR SUM(b."jenisRekomendasi" = 'A4_PD') >= 3 THEN 1 ELSE 0 END AS k6,
    COALESCE(MAX(b."kelompok" = 7), 0) AS k7,
    COALESCE(MAX(b."kelompok" = 8), 0) AS k8,
    COALESCE(MAX(b."kelompok" = 9), 0) AS k9
  FROM "user" u
  LEFT JOIN "berkas" b ON b."userId" = u."id"
  WHERE u."role" = 'bacalon'
  GROUP BY u."id"
);

-- "profil" tidak dirujuk view mana pun dan kolom ini tidak diindeks, jadi
-- DROP COLUMN cukup; tabel tidak perlu dibangun ulang.
ALTER TABLE "profil" DROP COLUMN "instruktur";
