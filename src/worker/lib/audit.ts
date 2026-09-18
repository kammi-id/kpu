type AktorAudit = "Admin bersama" | "Bakal Calon Ketua Umum" | "Anonim" | "Sistem";
type TindakanAudit =
	| "login"
	| "registrasi"
	| "cek_nia"
	| "onboarding_admin"
	| "ubah_data"
	| "unggah_berkas_publik"
	| "hapus_berkas_publik"
	| "unggah_berkas"
	| "hapus_berkas"
	| "reset_kata_sandi"
	| "ekspor_harian"
	| "ekspor"
	| "penutupan_akun"
	| "hapus_data"
	| "tutup_pendaftaran"
	| "buka_pendaftaran";
type HasilAudit = "berhasil" | "gagal" | "ditolak";

type DataAudit = {
	aktor: AktorAudit;
	tindakan: TindakanAudit;
	hasil: HasilAudit;
	sesiId?: string | null;
	aktorUserId?: string | null;
	sasaranUserId?: string | null;
	sasaranBerkasId?: string | null;
	/** CHECK migrasi: hanya boleh terisi bila `aktor` = 'Sistem' (tiket 18). */
	keterangan?: string | null;
};

/** Bentuk pernyataan tanpa mengeksekusinya, supaya dapat digabung ke `DB.batch` lain (mis. tiket 17). */
export function pernyataanAudit(db: D1Database, data: DataAudit, waktu: Date) {
	return db
		.prepare(
			`INSERT INTO "audit" ("id", "waktu", "sesiId", "aktor", "aktorUserId", "tindakan", "sasaranUserId", "sasaranBerkasId", "hasil", "keterangan")
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			crypto.randomUUID(),
			waktu.toISOString(),
			data.sesiId ?? null,
			data.aktor,
			data.aktorUserId ?? null,
			data.tindakan,
			data.sasaranUserId ?? null,
			data.sasaranBerkasId ?? null,
			data.hasil,
			data.keterangan ?? null,
		);
}

export async function catatAudit(db: D1Database, data: DataAudit, waktu: Date) {
	await pernyataanAudit(db, data, waktu).run();
}
