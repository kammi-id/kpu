import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jaringan } from "../test/jaringan";
import { BATAS_LAJU_NIA } from "./nia";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	KAMMI_ID_TOKEN: "token-kammi-id-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;
const WAKTU = new Date("2026-09-20T00:00:00.000Z");

function envUji(overrides: Partial<typeof RAHASIA_UJI> = {}): EnvUji {
	return { ...env, ...RAHASIA_UJI, ...overrides };
}

async function kirim(init: RequestInit, overrides: Partial<typeof RAHASIA_UJI> = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => WAKTU).fetch(
		new Request("https://kpu.kammi.id/api/nia/cek", init),
		envUji(overrides),
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

function json(body: Record<string, unknown>) {
	return {
		method: "POST",
		headers: { "content-type": "application/json", origin: "https://kpu.kammi.id" },
		body: JSON.stringify(body),
	};
}

function jsonDenganTurnstile(body: Record<string, unknown>) {
	return {
		...json(body),
		headers: {
			"content-type": "application/json",
			origin: "https://kpu.kammi.id",
			"x-captcha-response": "token-turnstile-uji",
		},
	};
}

function turnstileSelaluLolos() {
	jaringan.use(
		http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () => HttpResponse.json({ success: true })),
	);
}

function turnstileSelaluGagal() {
	jaringan.use(
		http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () =>
			HttpResponse.json({ success: false, "error-codes": ["invalid-input-response"] })),
	);
}

const URL_ANGGOTA = (nia: string) => `https://www.kammi.id/api/v1/members/${nia}`;

let niaBerikutnya = 0;
function niaBaru() {
	niaBerikutnya += 1;
	return `3020100${String(niaBerikutnya).padStart(4, "0")}`;
}

async function sisipBacalonDenganNia(nia: string) {
	const id = crypto.randomUUID();
	await env.DB.prepare(
		`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada", "nia")
		 VALUES (?, ?, ?, 1, ?, ?, 'bacalon', ?, 'persetujuan-v1', ?, ?)`,
	)
		.bind(
			id,
			"Bacalon Duplikat Uji",
			`${id}@example.test`,
			WAKTU.toISOString(),
			WAKTU.toISOString(),
			`6281234${String(niaBerikutnya).padStart(6, "0")}`,
			WAKTU.toISOString(),
			nia,
		)
		.run();
}

beforeEach(async () => {
	niaBerikutnya = 0;
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

/** rowid implisit SQLite: baris terakhir yang dimasukkan, tidak bergantung pada "waktu" (sama di semua uji ini). */
async function auditTerakhir() {
	return env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit" ORDER BY rowid DESC LIMIT 1').first();
}

describe("POST /api/nia/cek (tiket 03, seam Worker)", () => {
	it("menolak permintaan tanpa Turnstile valid", async () => {
		const nia = niaBaru();
		const tanpaHeader = await kirim(json({ nia }));
		expect(tanpaHeader.status).toBe(403);
		expect(await tanpaHeader.json()).toMatchObject({ error: "turnstile_tidak_valid", turnstileDiperlukan: true });

		turnstileSelaluGagal();
		const turnstileSalah = await kirim(jsonDenganTurnstile({ nia }));
		expect(turnstileSalah.status).toBe(403);
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("mencatat audit 'gagal' pada payload tidak valid", async () => {
		turnstileSelaluLolos();
		const response = await kirim(jsonDenganTurnstile({ nia: 12345 }));
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "permintaan_tidak_valid" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "gagal" });
	});

	it("sukses membalas hanya nama terverifikasi, tidak field mentah lain dari kammi.id", async () => {
		const nia = niaBaru();
		turnstileSelaluLolos();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), () =>
				HttpResponse.json({
					nia,
					nama: "Nabila Putri Kader AB3",
					jenjangKaderisasi: "AB3",
					keadaanKader: "aktif",
					struktur: { nama: "PD KAMMI Uji", jenjang: "Daerah" },
				})),
		);

		const response = await kirim(jsonDenganTurnstile({ nia }));

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ nama: "Nabila Putri Kader AB3" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "berhasil" });
	});

	it("format tidak valid menghasilkan kode galat berbeda dari alasan lain", async () => {
		turnstileSelaluLolos();
		const response = await kirim(jsonDenganTurnstile({ nia: "salah" }));
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "nia_format_tidak_valid" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("NIA duplikat lokal menghasilkan kode galat berbeda", async () => {
		const nia = niaBaru();
		await sisipBacalonDenganNia(nia);
		turnstileSelaluLolos();

		const response = await kirim(jsonDenganTurnstile({ nia }));

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: "nia_sudah_terdaftar" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("NIA tidak ditemukan di kammi.id menghasilkan kode galat berbeda", async () => {
		const nia = niaBaru();
		turnstileSelaluLolos();
		jaringan.use(http.get(URL_ANGGOTA(nia), () => new HttpResponse(null, { status: 404 })));

		const response = await kirim(jsonDenganTurnstile({ nia }));

		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ error: "nia_tidak_ditemukan" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("NIA tidak memenuhi syarat (bukan AB3 aktif) menghasilkan kode galat berbeda", async () => {
		const nia = niaBaru();
		turnstileSelaluLolos();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), () =>
				HttpResponse.json({ nia, nama: "Kader Bukan AB3", jenjangKaderisasi: "AB2", keadaanKader: "aktif" })),
		);

		const response = await kirim(jsonDenganTurnstile({ nia }));

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({ error: "nia_tidak_memenuhi_syarat" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("kegagalan upstream kammi.id menghasilkan kode galat berbeda, ditandai bisa dicoba ulang", async () => {
		const nia = niaBaru();
		turnstileSelaluLolos();
		jaringan.use(http.get(URL_ANGGOTA(nia), () => new HttpResponse(null, { status: 500 })));

		const response = await kirim(jsonDenganTurnstile({ nia }));

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({ error: "nia_gagal_upstream" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "ditolak" });
	});

	it("membatasi laju permintaan per IP setelah dipanggil berulang kali", async () => {
		const nia = niaBaru();
		await sisipBacalonDenganNia(nia);
		turnstileSelaluLolos();

		for (let percobaan = 0; percobaan < BATAS_LAJU_NIA; percobaan += 1) {
			const response = await kirim(jsonDenganTurnstile({ nia }));
			expect(response.status).not.toBe(429);
		}

		const setelahBatas = await kirim(jsonDenganTurnstile({ nia }));
		expect(setelahBatas.status).toBe(429);
		expect(await setelahBatas.json()).toMatchObject({ error: "terlalu_banyak_permintaan" });
		expect(await auditTerakhir()).toEqual({ aktor: "Anonim", tindakan: "cek_nia", hasil: "gagal" });
	});

	it("menutup endpoint bila KAMMI_ID_TOKEN tidak tersedia", async () => {
		turnstileSelaluLolos();
		const response = await kirim(jsonDenganTurnstile({ nia: niaBaru() }), { KAMMI_ID_TOKEN: undefined });
		expect(response.status).toBe(503);
	});
});
