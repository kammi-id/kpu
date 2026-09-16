-- Penutupan Pendaftaran Manual (lihat CONTEXT.md): sakelar Admin untuk menutup
-- pendaftaran akun baru kapan pun selama Masa Pendaftaran, di luar jadwal tahap.
-- Baris tunggal, tidak pernah bertambah/berkurang.
CREATE TABLE "pengaturan" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "pendaftaranDitutupManual" INTEGER NOT NULL CHECK ("pendaftaranDitutupManual" IN (0, 1))
);
INSERT INTO "pengaturan" ("id", "pendaftaranDitutupManual") VALUES (1, 0);

-- SQLite tidak mengizinkan ALTER CHECK: tabel "audit" dibuat ulang dengan dua
-- tindakan baru (tutup_pendaftaran, buka_pendaftaran), data lama disalin apa adanya.
CREATE TABLE "audit_baru" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "waktu" DATE NOT NULL,
  "sesiId" TEXT,
  "aktor" TEXT NOT NULL CHECK ("aktor" IN ('Admin bersama', 'Bakal Calon Ketua Umum', 'Anonim', 'Sistem')),
  "aktorUserId" TEXT,
  "tindakan" TEXT NOT NULL CHECK ("tindakan" IN ('login', 'registrasi', 'reset_kata_sandi', 'unggah_berkas', 'hapus_berkas', 'ubah_data', 'ekspor', 'penutupan_akun', 'hapus_data', 'onboarding_admin', 'unggah_berkas_publik', 'hapus_berkas_publik', 'ekspor_harian', 'tutup_pendaftaran', 'buka_pendaftaran')),
  "sasaranUserId" TEXT,
  "sasaranBerkasId" TEXT,
  "hasil" TEXT NOT NULL CHECK ("hasil" IN ('berhasil', 'gagal', 'ditolak')),
  "keterangan" TEXT CHECK ("keterangan" IS NULL OR "aktor" = 'Sistem')
);
INSERT INTO "audit_baru" SELECT * FROM "audit";
DROP TABLE "audit";
ALTER TABLE "audit_baru" RENAME TO "audit";
CREATE INDEX "audit_waktu_idx" ON "audit" ("waktu");
