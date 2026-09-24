import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { kosongkanSkema } from "./test/replayMigrasi";

/**
 * ADR 0003: migrasi 0006 menghapus berkas kelompok 4 (instruktur), menurunkan
 * nomor kelompok 5..10 satu tingkat, dan menghapus kolom profil.instruktur.
 * Data disemai di skema SEBELUM 0006 (bentuk production 24 September 2026),
 * lalu 0006 diterapkan — sehingga yang diuji adalah perpindahan data nyata,
 * bukan skema kosong.
 */
const MIGRASI = "0006_hapus_instruktur.sql";
const USER = "bacalon-lama";

function r2Key(n: number) {
	return `berkas/00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

async function semaiSebelum0006() {
	const berkas = (kelompok: number, n: number, jenis: string | null = null, mime = "application/pdf") =>
		env.DB.prepare(
			`INSERT INTO "berkas" ("id", "userId", "kelompok", "jenisRekomendasi", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
			 VALUES (?, ?, ?, ?, ?, 'x', ?, 1, ?, '2026-09-20T00:00:00.000Z')`,
		).bind(`b${n}`, USER, kelompok, jenis, r2Key(n), mime, "0".repeat(64));

	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada", "nia", "banned")
			 VALUES (?, 'Bacalon Lama', 'lama@example.test', 1, '2026-09-18T00:00:00.000Z', '2026-09-18T00:00:00.000Z', 'bacalon', '6281200000001', 'persetujuan-v1', '2026-09-18T00:00:00.000Z', '30201000001', 0)`,
		).bind(USER),
		env.DB.prepare(
			`INSERT INTO "profil" ("userId", "namaPanggilan", "instruktur", "diubahPada") VALUES (?, 'Lama', 1, '2026-09-20T00:00:00.000Z')`,
		).bind(USER),
		// Satu berkas di tiap kelompok lama 1..10; kelompok 7 lama = dua A.3 PW.
		...[1, 2, 3, 4, 5, 6, 8, 9, 10].map((kelompok) => berkas(kelompok, kelompok)),
		berkas(7, 7, "A3_PW", "image/jpeg"),
		berkas(7, 11, "A3_PW"),
	]);
}

describe("migrasi 0006: hapus instruktur dan nomori ulang Kelompok Berkas", () => {
	it("menghapus kelompok 4 dengan jejak audit, menggeser 5..10, dan menjaga kelengkapan", async () => {
		const batas = env.TEST_MIGRATIONS.findIndex((m) => m.name === MIGRASI);
		expect(batas).toBeGreaterThan(0);

		await kosongkanSkema(env.DB);
		await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, batas));
		await semaiSebelum0006();
		await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

		const berkas = await env.DB.prepare(`SELECT "id", "kelompok", "jenisRekomendasi" FROM "berkas" ORDER BY "id"`).all<{
			id: string;
			kelompok: number;
			jenisRekomendasi: string | null;
		}>();
		expect(Object.fromEntries(berkas.results.map((b) => [b.id, b.kelompok]))).toEqual({
			b1: 1, b2: 2, b3: 3, b5: 4, b6: 5, b7: 6, b11: 6, b8: 7, b9: 8, b10: 9,
		});

		const audit = await env.DB.prepare(
			`SELECT "aktor", "tindakan", "sasaranUserId", "sasaranBerkasId", "hasil" FROM "audit" WHERE "tindakan" = 'hapus_berkas'`,
		).all();
		expect(audit.results).toEqual([
			{ aktor: "Sistem", tindakan: "hapus_berkas", sasaranUserId: USER, sasaranBerkasId: "b4", hasil: "berhasil" },
		]);

		const kelengkapan = await env.DB.prepare(`SELECT * FROM "vKelengkapan" WHERE "userId" = ?`).bind(USER).first<Record<string, number>>();
		expect(kelengkapan).toMatchObject({ jumlahHadir: 9, lengkap: 1, k6: 1 });
		expect(kelengkapan).not.toHaveProperty("k10");

		const kolomProfil = await env.DB.prepare(`SELECT "name" FROM pragma_table_info('profil')`).all<{ name: string }>();
		expect(kolomProfil.results.map((k) => k.name)).not.toContain("instruktur");
		const profil = await env.DB.prepare(`SELECT "namaPanggilan" FROM "profil" WHERE "userId" = ?`).bind(USER).first();
		expect(profil).toEqual({ namaPanggilan: "Lama" });
	});

	it("aturan kelompok baru: 5 hanya PDF, 6 wajib jenis rekomendasi, 10 ditolak", async () => {
		const sisip = (id: string, kelompok: number, jenis: string | null, mime: string) =>
			env.DB.prepare(
				`INSERT INTO "berkas" ("id", "userId", "kelompok", "jenisRekomendasi", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
				 VALUES (?, ?, ?, ?, ?, 'x', ?, 1, ?, '2026-09-25T00:00:00.000Z')`,
			).bind(id, USER, kelompok, jenis, r2Key(Number(id.slice(1))), mime, "0".repeat(64)).run();

		await expect(sisip("c21", 5, null, "image/png")).rejects.toThrow();
		await expect(sisip("c22", 6, null, "application/pdf")).rejects.toThrow();
		await expect(sisip("c23", 10, null, "application/pdf")).rejects.toThrow();
		await expect(sisip("c24", 7, "A3_PW", "application/pdf")).rejects.toThrow();
		await sisip("c25", 6, "A4_PD", "image/jpeg");
	});
});
