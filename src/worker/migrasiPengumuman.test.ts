import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { kosongkanSkema } from "./test/replayMigrasi";

it("migrasi 0007 mempertahankan seluruh metadata dokumen publik lama", async () => {
	const batas = env.TEST_MIGRATIONS.findIndex((m) => m.name === "0007_pengumuman_hasil_verifikasi.sql");
	expect(batas).toBeGreaterThan(0);
	await kosongkanSkema(env.DB);
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, batas));
	for (const kategori of ["peraturan", "formulir"]) {
		await env.DB.prepare(
			`INSERT INTO berkasPublik VALUES (?, ?, 'Dokumen lama', 2, ?, 'lama.docx',
			 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1234, '2026-09-20T00:00:00.000Z')`,
		).bind(kategori, kategori, `publik/${crypto.randomUUID()}`).run();
	}
	const sebelum = await env.DB.prepare('SELECT * FROM berkasPublik ORDER BY id').all();
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	const sesudah = await env.DB.prepare('SELECT * FROM berkasPublik ORDER BY id').all();
	expect(sesudah.results).toEqual(sebelum.results);
});
