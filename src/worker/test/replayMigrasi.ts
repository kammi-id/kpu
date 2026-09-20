import { applyD1Migrations } from "cloudflare:test";
import type { Migrasi } from "./analisisMigrasi";

/**
 * Objek milik D1 sendiri: `_cf_METADATA` dan `sqlite_*` ditolak dengan
 * SQLITE_AUTH bila di-DROP, dan `d1_migrations` sengaja ikut dibuang supaya
 * applyD1Migrations memulai dari nol.
 */
function bolehDijatuhkan(nama: string) {
	return !nama.startsWith("_cf_") && !nama.startsWith("sqlite_");
}

/** Mengosongkan skema aplikasi sehingga migrasi dapat diputar ulang dari nol. */
export async function kosongkanSkema(db: D1Database) {
	const objek = await db
		.prepare(`SELECT "type", "name" FROM sqlite_master WHERE "type" IN ('table', 'view')`)
		.all<{ type: string; name: string }>();
	const dipilih = objek.results.filter(({ name }) => bolehDijatuhkan(name));
	// View lebih dulu: definisinya merujuk tabel, dan D1 memvalidasi ulang
	// view yang tersisa setiap kali sebuah tabel dijatuhkan.
	for (const { name } of dipilih.filter(({ type }) => type === "view")) {
		await db.prepare(`DROP VIEW IF EXISTS "${name}"`).run();
	}
	for (const { name } of dipilih.filter(({ type }) => type === "table")) {
		await db.prepare(`DROP TABLE IF EXISTS "${name}"`).run();
	}
}

/**
 * Akun Admin dengan hash kata sandi — persis bentuk data yang hilang pada
 * insiden 18 September 2026. Sengaja hanya peran 'admin': ia dikecualikan
 * dari CHECK `whatsapp`/`persetujuan*`/`nia` di setiap versi skema, sehingga
 * baris benih yang sama sah disisipkan sebelum migrasi mana pun.
 */
export const BENIH = {
	userId: "benih-user",
	accountId: "benih-account",
	email: "benih@kpu.kammi.id",
	hash: "HASH-KATA-SANDI-BENIH",
} as const;

export async function benihAkunAdmin(db: D1Database) {
	await db.batch([
		db
			.prepare(
				`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "banned")
				 VALUES (?, 'Admin Benih', ?, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'admin', 0)`,
			)
			.bind(BENIH.userId, BENIH.email),
		db
			.prepare(
				`INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
				 VALUES (?, ?, 'credential', ?, ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
			)
			.bind(BENIH.accountId, BENIH.userId, BENIH.userId, BENIH.hash),
	]);
}

/**
 * Memutar ulang migrasi dari nol: menerapkan migrasi sebelum `batas`,
 * menyisipkan akun Admin bernilai hash, lalu menerapkan sisanya. Mengembalikan
 * hash yang bertahan (atau null bila barisnya lenyap).
 */
export async function hashSetelahMigrasi(db: D1Database, migrasi: readonly Migrasi[], batas: number) {
	await kosongkanSkema(db);
	await applyD1Migrations(db, migrasi.slice(0, batas) as Migrasi[]);
	await benihAkunAdmin(db);
	await applyD1Migrations(db, migrasi as Migrasi[]);
	const baris = await db
		.prepare(`SELECT "password" FROM "account" WHERE "id" = ?`)
		.bind(BENIH.accountId)
		.first<{ password: string | null }>();
	return baris?.password ?? null;
}
