type AktorAudit = "Admin bersama" | "Bakal Calon Ketua Umum" | "Anonim" | "Sistem";
type TindakanAudit = "login" | "registrasi" | "onboarding_admin";
type HasilAudit = "berhasil" | "gagal" | "ditolak";

export async function catatAudit(
	db: D1Database,
	data: {
		aktor: AktorAudit;
		tindakan: TindakanAudit;
		hasil: HasilAudit;
		sesiId?: string | null;
		aktorUserId?: string | null;
	},
	waktu: Date,
) {
	await db
		.prepare(
			`INSERT INTO "audit" ("id", "waktu", "sesiId", "aktor", "aktorUserId", "tindakan", "hasil")
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			crypto.randomUUID(),
			waktu.toISOString(),
			data.sesiId ?? null,
			data.aktor,
			data.aktorUserId ?? null,
			data.tindakan,
			data.hasil,
		)
		.run();
}
