# Skema Data dan Kontrak Penyimpanan

Type: grilling
Status: resolved
Blocked by: 04

## Question

Skema D1 dan kontrak objek R2 paling kecil apa yang cukup untuk memenuhi
blueprint Varian A tanpa menambah entitas di luar destination? Putuskan tabel
dan kolom untuk akun, peran, data pribadi, kelompok berkas, metadata objek,
rekaman persetujuan, audit, dan pembatasan percobaan, termasuk kolom mana yang
dimiliki Better Auth dan mana yang milik aplikasi. Putuskan pola penamaan objek
R2 yang acak dan tidak memuat identitas beserta pemetaannya di D1, kolom
checksum untuk manifest ekspor, serta representasi tahap waktu: disimpan
sebagai kolom atau diturunkan dari jam server. Tetapkan aturan yang dapat diuji
untuk perhitungan Status Kelengkapan Berkas, khususnya kelompok rekomendasi,
dan indeks minimum yang dibutuhkan tabel Admin serta ekspor. Hasilnya harus
berupa DDL yang siap dieksekusi beserta daftar batasan integritas.

## Comments

### Sesi grilling — 15 September 2026

- Q1–Q10 disetujui sesuai rekomendasi. `user.name` Better Auth adalah nama tampilan, bukan username, sehingga berisi nama lengkap; login tetap memakai email.
- Q11–Q14 disetujui: kunci akun via kolom ban plugin Admin, pembatas percobaan milik aplikasi, dua indeks tambahan, satu file migrasi wrangler.
- Fakta Better Auth 1.7.4 yang memengaruhi skema: tanggal disimpan sebagai teks ISO dan boolean 0/1; `defaultValue` tidak menjadi SQL `DEFAULT`; adapter D1 tanpa transaksi; pembatas bawaan dikunci per IP saja dan mati bila pelacakan IP dinonaktifkan; plugin Captcha tidak kondisional; email dijadikan huruf kecil tetapi tidak dipangkas; D1 menegakkan foreign key secara default.

## Answer

### Keputusan

1. **Tahap waktu diturunkan dari jam server.** Kalender tiket 02 menjadi konstanta kode; satu fungsi murni `tahapPada(instant)` melayani spanduk, tombol `Daftar`, dan penolakan server. D1 tidak menyimpan tahap. Perubahan jadwal berarti deploy ulang.
2. **Kepemilikan kolom.** Better Auth memiliki `user`, `session`, `account`, `verification`, termasuk kolom plugin Admin (`role`, `banned`, `banReason`, `banExpires`, `impersonatedBy`) dan additional field `whatsapp`, `persetujuanVersi`, `persetujuanPada`. Aplikasi memiliki `profil`, `berkas`, `audit`, `percobaanLogin`, dan view `vKelengkapan`. Tabel `rateLimit` bawaan tidak dibuat.
3. **Identitas.** `user.name` = nama lengkap. Email dipangkas di hook sebelum Better Auth menjadikannya huruf kecil. WhatsApp dinormalisasi ke digit berawalan `62` dan unik. Peran `bacalon` (`defaultRole`) atau `admin`; baris Admin tidak wajib WhatsApp atau persetujuan.
4. **Data pribadi A.1** selain nama, email, dan WhatsApp berada di `profil` (1:1, semua nullable). Baris dibuat saat simpan pertama, bukan saat registrasi. Profil tidak memengaruhi Status Kelengkapan Berkas.
5. **Kelompok berkas** adalah konstanta kode 1–10 (label, format, aturan hadir). Kelompok 7 mewajibkan pengunggah memilih `A3_PW` atau `A4_PD`.
6. **Status Kelengkapan Berkas dihitung, tidak disimpan**, lewat `vKelengkapan` sebagai satu-satunya sumber untuk sidebar, `/akun`, `/akun/berkas`, tabel Admin, dan CSV.
7. **Hapus dan ganti berkas adalah hapus keras** baris D1 dan objek R2; ganti = hapus lalu unggah; tidak ada riwayat versi.
8. **Kontrak R2.** Kunci `berkas/<UUIDv4>` tanpa identitas, kelompok, atau ekstensi. `httpMetadata.contentType` = MIME tervalidasi; tanpa `customMetadata`. Nama asli hanya di D1.
9. **Checksum.** SHA-256 dihitung saat unggah (`crypto.DigestStream` bersamaan dengan stream ke R2; body wajib ber-`Content-Length`) dan disimpan di `berkas.sha256`. Manifest ekspor membaca kolom ini.
10. **Persetujuan** direkam di dua kolom `user` yang diisi server di `databaseHooks.user.create.before` (`input: false`); klien hanya mengirim centang dan registrasi ditolak tanpa centang.
11. **Audit** tanpa data pribadi dan tanpa foreign key, sehingga dapat bertahan setelah akun dihapus.
12. **Pembatasan percobaan.** Pembatas bawaan Better Auth dimatikan dan `advanced.ipAddress.disableIpTracking: true`. Tabel `percobaanLogin` menyimpan kunci `email:<HMAC>` dan `ip:<HMAC>` (IP dari `cf-connecting-ip`), jumlah gagal, dan kedaluwarsa paling lama 24 jam. Plugin Captcha hanya untuk `/sign-up/email`; Turnstile pada `/sign-in/email` diperiksa hook `before` bila salah satu kunci sudah gagal ≥3 kali, dan hook `after` menambah atau mereset penghitung. Baris kedaluwarsa dihapus saat percobaan berikutnya, tanpa cron.
13. **Indeks** = indeks bawaan Better Auth ditambah `berkas(userId, kelompok)` dan `audit(waktu)`.
14. **Migrasi** = satu file `migrations/0001_init.sql` berisi DDL di bawah, diterapkan dengan `wrangler d1 migrations apply`. Tidak ada endpoint migrasi di Worker. Bila versi Better Auth yang dipin berubah, skema bawaannya dibandingkan ulang dengan `npx auth@latest generate`.

### DDL

Diuji pada SQLite lokal dengan `PRAGMA foreign_keys = ON`: DDL terbuat tanpa galat; Bakal Calon tanpa WhatsApp, PNG di kelompok 6, dan jenis rekomendasi di luar kelompok 7 ditolak; 1 PW + 2 PD menghasilkan kelompok 7 belum hadir, 3 PD hadir; menghapus `user` ikut menghapus berkasnya.

```sql
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

CREATE TABLE "audit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "waktu" DATE NOT NULL,
  "sesiId" TEXT,
  "aktor" TEXT NOT NULL CHECK ("aktor" IN ('Admin bersama', 'Bakal Calon Ketua Umum', 'Anonim')),
  "aktorUserId" TEXT,
  "tindakan" TEXT NOT NULL CHECK ("tindakan" IN ('login', 'registrasi', 'reset_kata_sandi', 'unggah_berkas', 'hapus_berkas', 'ubah_data', 'ekspor', 'penutupan_akun', 'hapus_data')),
  "sasaranUserId" TEXT,
  "sasaranBerkasId" TEXT,
  "hasil" TEXT NOT NULL CHECK ("hasil" IN ('berhasil', 'gagal', 'ditolak'))
);
CREATE INDEX "audit_waktu_idx" ON "audit" ("waktu");

CREATE TABLE "percobaanLogin" (
  "kunci" TEXT NOT NULL PRIMARY KEY,
  "gagal" INTEGER NOT NULL CHECK ("gagal" >= 0),
  "kedaluwarsa" DATE NOT NULL
);

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
```

### Batasan integritas dan aturan yang dapat diuji

**Ditegakkan skema**

- Email unik; WhatsApp unik dan berpola `62…`; peran hanya `bacalon` atau `admin`; `bacalon` wajib memiliki WhatsApp dan rekaman persetujuan.
- `profil`, `berkas`, `session`, `account` terhapus berantai bersama `user`.
- `berkas.kelompok` 1–10; `jenisRekomendasi` terisi jika dan hanya jika kelompok 7; kelompok 6 hanya PDF; MIME hanya PDF/JPEG/PNG; ukuran 1 byte sampai 20 MiB; `sha256` 64 karakter; `r2Key` unik dan berbentuk `berkas/<UUIDv4>`.
- `audit.aktor`, `tindakan`, dan `hasil` terbatas pada nilai yang tercantum.

**Ditegakkan Worker**

- **Maksimal lima berkas per kelompok** secara atomik dengan satu pernyataan: `INSERT INTO berkas (…) SELECT … WHERE (SELECT count(*) FROM berkas WHERE userId = ?1 AND kelompok = ?2) < 5`; nol baris tersisip berarti ditolak.
- **Kelompok hadir**: kelompok 1–6 dan 8–10 bila ada ≥1 berkas; kelompok 7 bila ada ≥2 `A3_PW` atau ≥3 `A4_PD`. `lengkap` bila sepuluh kelompok hadir.
- **Urutan unggah**: validasi ekstensi/MIME/signature → `R2.put` sambil menghitung SHA-256 → `INSERT` bersyarat di atas. Jika INSERT gagal atau nol baris, objek R2 langsung dihapus.
- **Urutan hapus berkas**: `DELETE` baris D1 → `R2.delete`. Kegagalan `R2.delete` meninggalkan objek yatim yang tidak dapat diakses dan terhapus pada pengosongan akhir Masa Retensi.
- **Penutupan Akun**: satu `DB.batch` berisi `UPDATE user SET banned = 1, banReason = 'penutupan_akun'`, `DELETE FROM session WHERE userId = ?`, dan satu baris audit `penutupan_akun`. Better Auth menolak login akun ber-ban.
- **Penghapusan data akun** (penutupan diproses atau akhir Masa Retensi): kumpulkan `r2Key` → satu `DB.batch` yang menghapus `user` (berantai), menghapus audit dengan `aktorUserId` atau `sasaranUserId` akun itu kecuali `hapus_data`, dan menyisipkan satu audit `hapus_data` → hapus objek R2.
- **Tabel Admin dan CSV** hanya membaca `user` dengan `role = 'bacalon'` bergabung `vKelengkapan`.
- Seluruh tanggal ditulis sebagai teks ISO-8601 UTC, sama dengan Better Auth.

### Masukan untuk tiket Batas Operasional

- Secret HMAC untuk `percobaanLogin` perlu disediakan bersama secret Better Auth dan kunci Turnstile.
- Karena berkas dihapus keras, bukti keadaan saat Pemeriksaan hanya tersedia bila KPU mengambil ekspor pada 5–7 Oktober.
- Pembuatan baris Admin (peran `admin`, tanpa WhatsApp) termasuk prosedur penyediaan.
