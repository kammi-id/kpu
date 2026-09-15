type AktorAudit = "Admin bersama" | "Bakal Calon Ketua Umum" | "Anonim" | "Sistem";
type TindakanAudit =
	| "login"
	| "onboarding_admin"
	| "ubah_peraturan"
	| "unggah_berkas_publik"
	| "hapus_berkas_publik";
type HasilAudit = "berhasil" | "gagal" | "ditolak";

export async function catatAudit(
	db: D1Database,
	data: {
		aktor: AktorAudit;
		tindakan: TindakanAudit;
		hasil: HasilAudit;
		sesiId?: string | null;
		aktorUserId?: string | null;
		sasaranUserId?: string | null;
		sasaranBerkasId?: string | null;
	},
	waktu: Date,
) {
	await db
		.prepare(
			`INSERT INTO "audit" ("id", "waktu", "sesiId", "aktor", "aktorUserId", "tindakan", "sasaranUserId", "sasaranBerkasId", "hasil")
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
		)
		.run();
}
