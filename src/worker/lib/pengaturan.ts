// Penutupan Pendaftaran Manual (lihat CONTEXT.md): baris tunggal "pengaturan",
// dibaca di seam yang sama dengan bolehRegistrasi (tahap.ts) — tidak pernah
// menggantikan jadwal, hanya menambah gerbang penutupan di atasnya.

export async function pendaftaranDitutupManual(db: D1Database): Promise<boolean> {
	const baris = await db
		.prepare('SELECT "pendaftaranDitutupManual" FROM "pengaturan" WHERE "id" = 1')
		.first<{ pendaftaranDitutupManual: number }>();
	return Boolean(baris?.pendaftaranDitutupManual);
}

export async function aturPendaftaranDitutupManual(db: D1Database, ditutup: boolean): Promise<void> {
	await db
		.prepare('UPDATE "pengaturan" SET "pendaftaranDitutupManual" = ? WHERE "id" = 1')
		.bind(ditutup ? 1 : 0)
		.run();
}
