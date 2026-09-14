-- Migrasi awal tunggal: DDL tiket 05 (Skema Data dan Kontrak Penyimpanan)
-- ditambah seluruh amandemen tiket 06 (Batas Operasional). Tiket 06 menang
-- atas tiket 05 bila ada pertentangan; definisi "audit" di bawah adalah
-- versi tiket 06, bukan tiket 05.
--
-- Kolom Better Auth (user/session/account/verification) dicocokkan terhadap
-- dokumentasi Better Auth 1.7 (core schema + plugin Admin) sebelum migrasi
-- ini dibekukan: plugin Admin menambah role/banned/banReason/banExpires ke
-- "user" dan impersonatedBy ke "session", persis seperti di bawah.

-- Better Auth 1.7.4 (core + plugin Admin + additionalFields), disesuaikan dengan CHECK aplikasi
CREATE TABLE "user" (
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
  CHECK ("role" = 'admin' OR ("whatsapp" IS NOT NULL AND "persetujuanVersi" IS NOT NULL AND "persetujuanPada" IS NOT NULL))
);

-- Amandemen tiket 06, keputusan 8: paling banyak satu Admin, termasuk saat onboarding bersamaan
CREATE UNIQUE INDEX "user_satuAdmin_idx" ON "user" ("role") WHERE "role" = 'admin';

CREATE TABLE "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "impersonatedBy" TEXT
);
CREATE TABLE "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);
CREATE TABLE "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);
CREATE INDEX "session_userId_idx" ON "session" ("userId");
CREATE INDEX "account_userId_idx" ON "account" ("userId");
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- Tabel aplikasi
CREATE TABLE "profil" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "namaPanggilan" TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT CHECK ("tanggalLahir" IS NULL OR date("tanggalLahir") = "tanggalLahir"),
  "asalPw" TEXT,
  "asalPd" TEXT,
  "tahunLulusDm3" INTEGER CHECK ("tahunLulusDm3" IS NULL OR "tahunLulusDm3" BETWEEN 1998 AND 2026),
  "tempatLulusDm3" TEXT,
  "instruktur" INTEGER CHECK ("instruktur" IS NULL OR "instruktur" IN (0, 1)),
  "capaianHafalan" TEXT,
  "bahasaAsing" TEXT,
  "diubahPada" DATE NOT NULL
);

CREATE TABLE "berkas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "kelompok" INTEGER NOT NULL CHECK ("kelompok" BETWEEN 1 AND 10),
  "jenisRekomendasi" TEXT CHECK ("jenisRekomendasi" IN ('A3_PW', 'A4_PD')),
  "r2Key" TEXT NOT NULL UNIQUE CHECK ("r2Key" GLOB 'berkas/????????-????-4???-????-????????????'),
  "namaAsli" TEXT NOT NULL,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('application/pdf', 'image/jpeg', 'image/png')),
  "ukuranByte" INTEGER NOT NULL CHECK ("ukuranByte" BETWEEN 1 AND 20971520),
  "sha256" TEXT NOT NULL CHECK (length("sha256") = 64),
  "diunggahPada" DATE NOT NULL,
  CHECK (("kelompok" = 7) = ("jenisRekomendasi" IS NOT NULL)),
  CHECK ("kelompok" <> 6 OR "mime" = 'application/pdf')
);
CREATE INDEX "berkas_userId_kelompok_idx" ON "berkas" ("userId", "kelompok");

-- Definisi "audit" tiket 06 (menggantikan tiket 05): aktor Sistem, tindakan baru, kolom keterangan
CREATE TABLE "audit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "waktu" DATE NOT NULL,
  "sesiId" TEXT,
  "aktor" TEXT NOT NULL CHECK ("aktor" IN ('Admin bersama', 'Bakal Calon Ketua Umum', 'Anonim', 'Sistem')),
  "aktorUserId" TEXT,
  "tindakan" TEXT NOT NULL CHECK ("tindakan" IN ('login', 'registrasi', 'reset_kata_sandi', 'unggah_berkas', 'hapus_berkas', 'ubah_data', 'ekspor', 'penutupan_akun', 'hapus_data', 'onboarding_admin', 'ubah_peraturan', 'unggah_berkas_publik', 'hapus_berkas_publik', 'ekspor_harian')),
  "sasaranUserId" TEXT,
  "sasaranBerkasId" TEXT,
  "hasil" TEXT NOT NULL CHECK ("hasil" IN ('berhasil', 'gagal', 'ditolak')),
  "keterangan" TEXT CHECK ("keterangan" IS NULL OR "aktor" = 'Sistem')
);
CREATE INDEX "audit_waktu_idx" ON "audit" ("waktu");

CREATE TABLE "percobaanLogin" (
  "kunci" TEXT NOT NULL PRIMARY KEY,
  "gagal" INTEGER NOT NULL CHECK ("gagal" >= 0),
  "kedaluwarsa" DATE NOT NULL
);

-- Tabel baru tiket 06
CREATE TABLE "peraturan" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "isiMarkdown" TEXT NOT NULL CHECK (length("isiMarkdown") <= 400000),
  "diubahPada" DATE NOT NULL
);

CREATE TABLE "berkasPublik" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kategori" TEXT NOT NULL CHECK ("kategori" IN ('peraturan', 'formulir')),
  "judul" TEXT NOT NULL,
  "urutan" INTEGER NOT NULL,
  "r2Key" TEXT NOT NULL UNIQUE CHECK ("r2Key" GLOB 'publik/????????-????-4???-????-????????????'),
  "namaAsli" TEXT NOT NULL,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  "ukuranByte" INTEGER NOT NULL CHECK ("ukuranByte" BETWEEN 1 AND 20971520),
  "diunggahPada" DATE NOT NULL
);
CREATE INDEX "berkasPublik_kategori_urutan_idx" ON "berkasPublik" ("kategori", "urutan");

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
