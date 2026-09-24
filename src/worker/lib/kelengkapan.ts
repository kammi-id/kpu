// `vKelengkapan` (migrations/0006_hapus_instruktur.sql) adalah SATU-SATUNYA sumber Status
// Kelengkapan Berkas (spec "Skema D1"): sidebar /akun, /akun/berkas, dan endpoint
// /api/akun semuanya memanggil fungsi ini, bukan menghitung ulang di TypeScript.

export type BarisKelengkapan = {
	userId: string;
	k1: number;
	k2: number;
	k3: number;
	k4: number;
	k5: number;
	k6: number;
	k7: number;
	k8: number;
	k9: number;
	jumlahHadir: number;
	lengkap: number;
};

export async function ambilKelengkapan(db: D1Database, userId: string): Promise<BarisKelengkapan | null> {
	return db
		.prepare(
			`SELECT "userId", "k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "jumlahHadir", "lengkap"
			 FROM "vKelengkapan" WHERE "userId" = ?`,
		)
		.bind(userId)
		.first<BarisKelengkapan>();
}
