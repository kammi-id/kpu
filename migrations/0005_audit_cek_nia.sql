-- Cek NIA (tiket 03) sekarang dicatat ke jejak audit (code review PR #5),
-- sejajar dengan login/registrasi yang sudah diaudit. SQLite tidak
-- mengizinkan ALTER CHECK: tabel "audit" dibuat ulang lagi seperti migrasi
-- 0002, kali ini menambah tindakan 'cek_nia'.
CREATE TABLE "audit_baru" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "waktu" DATE NOT NULL,
  "sesiId" TEXT,
  "aktor" TEXT NOT NULL CHECK ("aktor" IN ('Admin bersama', 'Bakal Calon Ketua Umum', 'Anonim', 'Sistem')),
  "aktorUserId" TEXT,
  "tindakan" TEXT NOT NULL CHECK ("tindakan" IN ('login', 'registrasi', 'reset_kata_sandi', 'unggah_berkas', 'hapus_berkas', 'ubah_data', 'ekspor', 'penutupan_akun', 'hapus_data', 'onboarding_admin', 'unggah_berkas_publik', 'hapus_berkas_publik', 'ekspor_harian', 'tutup_pendaftaran', 'buka_pendaftaran', 'cek_nia')),
  "sasaranUserId" TEXT,
  "sasaranBerkasId" TEXT,
  "hasil" TEXT NOT NULL CHECK ("hasil" IN ('berhasil', 'gagal', 'ditolak')),
  "keterangan" TEXT CHECK ("keterangan" IS NULL OR "aktor" = 'Sistem')
);
INSERT INTO "audit_baru" SELECT * FROM "audit";
DROP TABLE "audit";
ALTER TABLE "audit_baru" RENAME TO "audit";
CREATE INDEX "audit_waktu_idx" ON "audit" ("waktu");
