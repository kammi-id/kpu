-- Tiket 01 (verifikasi-nia-pendaftaran): kolom "nia" pada "user", wajib untuk
-- peran bacalon, dikecualikan untuk admin — pola sama dengan whatsapp/
-- persetujuanVersi/persetujuanPada. SQLite tidak mengizinkan ALTER CHECK,
-- jadi tabel dibuat ulang seperti pada migrasi 0002.
--
-- Baris "bacalon" yang sudah ada sebelum migrasi ini (jika ada) tidak
-- memiliki NIA dan harus dibackfill secara manual sebelum migrasi dijalankan,
-- kalau tidak INSERT INTO "user_baru" di bawah akan gagal terhadap CHECK baru.
--
-- "vKelengkapan" merujuk "user" dan harus dibuat ulang di sekitar penggantian
-- tabel, kalau tidak D1 menolak DROP TABLE "user" ("no such table: main.user"
-- saat memvalidasi ulang definisi view).
DROP VIEW "vKelengkapan";

CREATE TABLE "user_baru" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('bacalon', 'admin')),
  "banned" INTEGER CHECK ("banned" IN (0, 1)),
  "banReason" TEXT,
  "banExpires" DATE,
  "whatsapp" TEXT UNIQUE CHECK ("whatsapp" GLOB '62[1-9][0-9]*'),
  "persetujuanVersi" TEXT,
  "persetujuanPada" DATE,
  -- 11 kelas karakter berulang kena "GLOB pattern too complex" di D1; length()
  -- + GLOB negasi mencapai hasil yang sama (persis 11 digit angka).
  "nia" TEXT UNIQUE CHECK (length("nia") = 11 AND "nia" NOT GLOB '*[^0-9]*'),
  CHECK ("role" = 'admin' OR ("whatsapp" IS NOT NULL AND "persetujuanVersi" IS NOT NULL AND "persetujuanPada" IS NOT NULL AND "nia" IS NOT NULL))
);
INSERT INTO "user_baru" SELECT "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "role", "banned", "banReason", "banExpires", "whatsapp", "persetujuanVersi", "persetujuanPada", NULL FROM "user";
DROP TABLE "user";
ALTER TABLE "user_baru" RENAME TO "user";
CREATE UNIQUE INDEX "user_satuAdmin_idx" ON "user" ("role") WHERE "role" = 'admin';

CREATE VIEW "vKelengkapan" AS
SELECT *, (k1 + k2 + k3 + k4 + k5 + k6 + k7 + k8 + k9 + k10) AS "jumlahHadir",
       (k1 + k2 + k3 + k4 + k5 + k6 + k7 + k8 + k9 + k10) = 10 AS "lengkap"
FROM (
  SELECT u."id" AS "userId",
    COALESCE(MAX(b."kelompok" = 1), 0) AS k1,
    COALESCE(MAX(b."kelompok" = 2), 0) AS k2,
    COALESCE(MAX(b."kelompok" = 3), 0) AS k3,
    COALESCE(MAX(b."kelompok" = 4), 0) AS k4,
    COALESCE(MAX(b."kelompok" = 5), 0) AS k5,
    COALESCE(MAX(b."kelompok" = 6), 0) AS k6,
    CASE WHEN SUM(b."jenisRekomendasi" = 'A3_PW') >= 2
           OR SUM(b."jenisRekomendasi" = 'A4_PD') >= 3 THEN 1 ELSE 0 END AS k7,
    COALESCE(MAX(b."kelompok" = 8), 0) AS k8,
    COALESCE(MAX(b."kelompok" = 9), 0) AS k9,
    COALESCE(MAX(b."kelompok" = 10), 0) AS k10
  FROM "user" u
  LEFT JOIN "berkas" b ON b."userId" = u."id"
  WHERE u."role" = 'bacalon'
  GROUP BY u."id"
);
