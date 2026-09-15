import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jalankanPenghapusanAkhir } from "./penghapusanAkhir";

// Batas tahap Selesai (lib/tahap.ts MULAI_SELESAI): 24 Jan 2027 17.00Z (inklusif).
const WAKTU_SELESAI = new Date("2027-01-24T17:00:00.000Z");
const TEPAT_SEBELUM_SELESAI = new Date("2027-01-24T16:59:59.999Z");

let whatsappBerikutnya = 0;

type BarisKeterangan = { tabel: Record<string, number>; objekR2: number };

async function jalankanTerjadwal(waktu: Date) {
	const ctx = createExecutionContext();
	await buatWorker().scheduled({ scheduledTime: waktu.getTime() } as ScheduledController, env, ctx);
	await waitOnExecutionContext(ctx);
}

async function buatBacalon(nama: string, email: string, waktu: Date) {
	whatsappBerikutnya += 1;
	const id = crypto.randomUUID();
	await env.DB.prepare(
		`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada")
		 VALUES (?, ?, ?, 1, ?, ?, 'bacalon', ?, 'persetujuan-v1', ?)`,
	)
		.bind(id, nama, email, waktu.toISOString(), waktu.toISOString(), `62812345${String(whatsappBerikutnya).padStart(4, "0")}`, waktu.toISOString())
		.run();
	return id;
}

beforeEach(async () => {
	whatsappBerikutnya = 0;
	const objek = await env.BERKAS.list();
	if (objek.objects.length) await env.BERKAS.delete(objek.objects.map((satu) => satu.key));
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "berkas"'),
		env.DB.prepare('DELETE FROM "profil"'),
		env.DB.prepare('DELETE FROM "verification"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "berkasPublik"'),
		env.DB.prepare('DELETE FROM "peraturan"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("Penghapusan Akhir (tiket 18, acceptance 32)", () => {
	it("run pertama mengosongkan R2 dan seluruh tabel, menyisakan tepat satu audit hapus_data beraktor Sistem berisi jumlah yang dihapus", async () => {
		const userId = await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_SELESAI);
		await env.BERKAS.put(`berkas/${crypto.randomUUID()}`, new Uint8Array([1]));
		await env.BERKAS.put("ekspor/terkini/bacalon.csv", "id,nama\r\n");
		await env.BERKAS.put(`publik/${crypto.randomUUID()}`, new Uint8Array([2]));
		await env.DB.prepare(`INSERT INTO "peraturan" ("id", "isiMarkdown", "diubahPada") VALUES (1, 'x', ?)`)
			.bind(WAKTU_SELESAI.toISOString())
			.run();

		await jalankanTerjadwal(WAKTU_SELESAI);

		expect((await env.BERKAS.list({ prefix: "berkas/" })).objects).toHaveLength(0);
		expect((await env.BERKAS.list({ prefix: "ekspor/" })).objects).toHaveLength(0);
		expect((await env.BERKAS.list({ prefix: "publik/" })).objects).toHaveLength(0);
		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(userId).first()).toBeNull();
		expect(await env.DB.prepare('SELECT 1 FROM "peraturan" WHERE "id" = 1').first()).toBeNull();

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil", "keterangan" FROM "audit"').all<{
			aktor: string;
			tindakan: string;
			hasil: string;
			keterangan: string;
		}>();
		expect(audit.results).toHaveLength(1);
		expect(audit.results[0]).toMatchObject({ aktor: "Sistem", tindakan: "hapus_data", hasil: "berhasil" });
		const keterangan = JSON.parse(audit.results[0].keterangan) as BarisKeterangan;
		expect(keterangan.tabel.user).toBe(1);
		expect(keterangan.objekR2).toBe(3);
	});

	it("run berikutnya tidak menambah audit kedua, dan tetap menghapus sisa data bila ada", async () => {
		await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_SELESAI);
		await jalankanTerjadwal(WAKTU_SELESAI);
		expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM "audit"').first<{ n: number }>())?.n).toBe(1);

		// Sisa yang belum sempat terhapus, mis. run sebelumnya terhenti oleh batas CPU (spec).
		await buatBacalon("Sisa Setelahnya", "sisa@example.test", WAKTU_SELESAI);
		await env.BERKAS.put(`berkas/${crypto.randomUUID()}`, new Uint8Array([9]));

		await jalankanTerjadwal(WAKTU_SELESAI);

		expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM "audit"').first<{ n: number }>())?.n).toBe(1);
		expect(await env.DB.prepare('SELECT 1 FROM "user"').first()).toBeNull();
		expect((await env.BERKAS.list({ prefix: "berkas/" })).objects).toHaveLength(0);
	});

	it("menangani listing R2 berhalaman (lebih dari satu halaman listing)", async () => {
		for (let i = 0; i < 5; i += 1) await env.BERKAS.put(`berkas/${crypto.randomUUID()}`, new Uint8Array([i]));

		await jalankanPenghapusanAkhir(env, WAKTU_SELESAI, 2);

		expect((await env.BERKAS.list({ prefix: "berkas/" })).objects).toHaveLength(0);
		const audit = await env.DB.prepare('SELECT "keterangan" FROM "audit"').first<{ keterangan: string }>();
		expect((JSON.parse(audit?.keterangan as string) as BarisKeterangan).objekR2).toBe(5);
	});

	it("run tepat sebelum tahap Selesai masih menjalankan Ekspor Harian dan tidak menghapus apa pun", async () => {
		const userId = await buatBacalon("Nabila Putri", "nabila@example.test", TEPAT_SEBELUM_SELESAI);

		await jalankanTerjadwal(TEPAT_SEBELUM_SELESAI);

		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(userId).first()).not.toBeNull();
		const audit = await env.DB.prepare('SELECT "tindakan" FROM "audit"').all<{ tindakan: string }>();
		expect(audit.results.map((baris) => baris.tindakan)).toContain("ekspor_harian");
	});
});
