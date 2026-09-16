import { pernyataanAudit } from "./audit";

// Urutan tidak penting untuk kebenaran (tiap DELETE eksplisit per tabel, tidak
// bersandar pada ON DELETE CASCADE), tapi cocok dengan kepemilikan kolom di
// spec: Better Auth dulu, lalu tabel aplikasi, "user" dan "audit" terakhir.
const TABEL_APLIKASI = [
	"session",
	"account",
	"verification",
	"profil",
	"berkas",
	"percobaanLogin",
	"berkasPublik",
	"user",
	"audit",
] as const;

const PREFIKS_R2 = ["berkas/", "ekspor/", "publik/"] as const;

/** Menghapus seluruh objek di bawah tiap prefix, menangani listing berhalaman. */
async function hapusObjekR2(bucket: R2Bucket, prefiks: readonly string[], ukuranHalaman?: number) {
	let jumlah = 0;
	for (const prefix of prefiks) {
		let cursor: string | undefined;
		do {
			const halaman = await bucket.list({ prefix, cursor, limit: ukuranHalaman });
			if (halaman.objects.length) {
				await bucket.delete(halaman.objects.map((objek) => objek.key));
				jumlah += halaman.objects.length;
			}
			cursor = halaman.truncated ? halaman.cursor : undefined;
		} while (cursor);
	}
	return jumlah;
}

async function jumlahBaris(db: D1Database, tabel: string) {
	const hasil = await db.prepare(`SELECT COUNT(*) AS "n" FROM "${tabel}"`).first<{ n: number }>();
	return hasil?.n ?? 0;
}

/**
 * Penghapusan Akhir (tiket 18): run cron pertama pada atau setelah tahap Selesai
 * mengosongkan R2 (`berkas/`, `ekspor/`, `publik/`) dan seluruh baris semua tabel,
 * lalu menyisipkan tepat satu audit `hapus_data` beraktor Sistem berisi jumlah
 * yang dihapus. Idempotent: run berikutnya mengulang penghapusan sisa (bila ada)
 * tanpa menyisipkan audit kedua — diperiksa lewat baris `hapus_data` yang sudah ada
 * sebelum tabel `audit` sendiri ikut dikosongkan.
 *
 * `ukuranHalamanR2` hanya untuk uji (memaksa listing R2 lebih dari satu halaman
 * tanpa perlu membuat ribuan objek); produksi memakai batas bawaan R2Bucket.list.
 */
export async function jalankanPenghapusanAkhir(env: Env, waktu: Date, ukuranHalamanR2?: number) {
	const sudahAda = await env.DB.prepare(
		`SELECT 1 FROM "audit" WHERE "aktor" = 'Sistem' AND "tindakan" = 'hapus_data'`,
	).first();

	const jumlahPerTabel: Record<string, number> = {};
	for (const tabel of TABEL_APLIKASI) jumlahPerTabel[tabel] = await jumlahBaris(env.DB, tabel);

	const jumlahObjekR2 = await hapusObjekR2(env.BERKAS, PREFIKS_R2, ukuranHalamanR2);

	// "audit" dikecualikan dari DELETE polos: baris `hapus_data` beraktor Sistem
	// adalah satu-satunya bukti bahwa Penghapusan Akhir sudah terjadi, jadi ia
	// harus bertahan lewat run berikutnya, bukan ikut terhapus lalu tak pernah
	// disisipkan ulang (itu akan membuatnya hilang-muncul tiap run, bukan "tepat satu").
	await env.DB.batch(
		TABEL_APLIKASI.map((tabel) =>
			tabel === "audit"
				? env.DB.prepare(`DELETE FROM "audit" WHERE NOT ("aktor" = 'Sistem' AND "tindakan" = 'hapus_data')`)
				: env.DB.prepare(`DELETE FROM "${tabel}"`),
		),
	);

	if (!sudahAda) {
		await pernyataanAudit(
			env.DB,
			{
				aktor: "Sistem",
				tindakan: "hapus_data",
				hasil: "berhasil",
				keterangan: JSON.stringify({ tabel: jumlahPerTabel, objekR2: jumlahObjekR2 }),
			},
			waktu,
		).run();
	}
}
