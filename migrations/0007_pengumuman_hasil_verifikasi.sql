-- berkasPublik bukan induk foreign key; semua dokumen yang ada disalin utuh.
CREATE TABLE "berkasPublik_baru" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kategori" TEXT NOT NULL CHECK ("kategori" IN ('peraturan', 'formulir', 'hasil-verifikasi')),
  "judul" TEXT NOT NULL,
  "urutan" INTEGER NOT NULL,
  "r2Key" TEXT NOT NULL UNIQUE CHECK ("r2Key" GLOB 'publik/????????-????-4???-????-????????????'),
  "namaAsli" TEXT NOT NULL,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  "ukuranByte" INTEGER NOT NULL CHECK ("ukuranByte" BETWEEN 1 AND 20971520),
  "diunggahPada" DATE NOT NULL
);
INSERT INTO "berkasPublik_baru" SELECT * FROM "berkasPublik";
DROP TABLE "berkasPublik";
ALTER TABLE "berkasPublik_baru" RENAME TO "berkasPublik";
CREATE INDEX "berkasPublik_kategori_urutan_idx" ON "berkasPublik" ("kategori", "urutan");
