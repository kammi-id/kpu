import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jaringan } from "../test/jaringan";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;

const MASA_PENDAFTARAN = new Date("2026-09-20T00:00:00.000Z");
const SELESAI = new Date("2027-01-24T17:00:00.000Z");
let whatsappBerikutnya = 0;

function envUji(): EnvUji {
	return { ...env, ...RAHASIA_UJI };
}

async function kirim(waktu: Date, path: string, init: RequestInit = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => waktu).fetch(new Request(`https://kpu.kammi.id${path}`, init), envUji(), ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

function json(body: Record<string, string>) {
	return {
		method: "POST",
		headers: { "content-type": "application/json", origin: "https://kpu.kammi.id" },
		body: JSON.stringify(body),
	};
}

async function pindahWaktuSesi(email: string, waktu: Date) {
	await env.DB.prepare(
		`UPDATE "session" SET "createdAt" = ?, "updatedAt" = ?
		 WHERE "userId" = (SELECT "id" FROM "user" WHERE "email" = ?)`,
	)
		.bind(waktu.toISOString(), waktu.toISOString(), email)
		.run();
}

async function sesiAdmin() {
	const data = { token: RAHASIA_UJI.ONBOARD_TOKEN, name: "Admin bersama", email: "admin@example.test", password: "kata-sandi-admin" };
	expect((await kirim(MASA_PENDAFTARAN, "/onboard", json(data))).status).toBe(201);
	const response = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-in/email", json({ email: data.email, password: data.password }));
	expect(response.status).toBe(200);
	await pindahWaktuSesi(data.email, MASA_PENDAFTARAN);
	return response.headers.get("set-cookie")?.split(";", 1)[0] as string;
}

async function sesiBacalon(email: string, name: string) {
	whatsappBerikutnya += 1;
	jaringan.use(http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () => HttpResponse.json({ success: true })));
	const response = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-up/email", {
		...json({ name, email, whatsapp: `08123450${String(whatsappBerikutnya).padStart(4, "0")}`, password: "kata-sandi-aman", persetujuan: "true" }),
		headers: {
			"content-type": "application/json",
			origin: "https://kpu.kammi.id",
			"x-captcha-response": "token-turnstile-uji",
		},
	});
	expect(response.status).toBe(200);
	await pindahWaktuSesi(email, MASA_PENDAFTARAN);
	return response.headers.get("set-cookie")?.split(";", 1)[0] as string;
}

async function simpanBerkas(userId: string, kelompok: number, namaAsli: string) {
	const id = crypto.randomUUID();
	const r2Key = `berkas/${crypto.randomUUID()}`;
	const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
	await env.BERKAS.put(r2Key, bytes);
	await env.DB.prepare(
		`INSERT INTO "berkas" ("id", "userId", "kelompok", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
		 VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?)`,
	)
		.bind(id, userId, kelompok, r2Key, namaAsli, bytes.byteLength, sha256, MASA_PENDAFTARAN.toISOString())
		.run();
	return { id, kelompok, bytes };
}

beforeEach(async () => {
	whatsappBerikutnya = 0;
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "berkas"'),
		env.DB.prepare('DELETE FROM "profil"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("Admin: tabel, detail, dan unduh Bakal Calon (acceptance 1, 20, 21, 22)", () => {
	it("menampilkan hanya Bakal Calon yang cocok dengan pencarian dan kelengkapan dari vKelengkapan", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		await sesiBacalon("raka@example.test", "Raka Pratama");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		await simpanBerkas(nabila?.id as string, 1, "a1.pdf");

		const response = await kirim(MASA_PENDAFTARAN, "/api/admin?q=nabila", { headers: { cookie: admin } });
		expect(response.status).toBe(200);
		const body = await response.json<{ data: Array<{ name: string; whatsapp: string; jumlahHadir: number; lengkap: boolean }> }>();
		expect(body.data).toEqual([{ name: "Nabila Putri", whatsapp: expect.stringMatching(/^62/), jumlahHadir: 1, lengkap: false, dibuatPada: expect.any(String), id: nabila?.id }]);
	});

	it("menolak sesi Bakal Calon, memberi detail 404 bila tidak ada, dan mengalirkan unduhan Admin sebagai attachment", async () => {
		const admin = await sesiAdmin();
		const bacalon = await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		const berkas = await simpanBerkas(nabila?.id as string, 1, "identitas.pdf");

		expect((await kirim(MASA_PENDAFTARAN, "/api/admin", { headers: { cookie: bacalon } })).status).toBe(401);
		expect((await kirim(MASA_PENDAFTARAN, `/api/admin/${crypto.randomUUID()}`, { headers: { cookie: admin } })).status).toBe(404);

		const detail = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}`, { headers: { cookie: admin } });
		expect(detail.status).toBe(200);
		expect((await detail.json<{ berkas: Array<{ id: string }> }>()).berkas).toEqual([expect.objectContaining({ id: berkas.id })]);

		const unduh = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/berkas/${berkas.id}/unduh`, { headers: { cookie: admin } });
		expect(unduh.status).toBe(200);
		expect(unduh.headers.get("content-disposition")).toContain("attachment");
		expect(unduh.headers.get("x-content-type-options")).toBe("nosniff");
		expect(new Uint8Array(await unduh.arrayBuffer())).toEqual(berkas.bytes);
		expect((await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/berkas/${berkas.id}/unduh`, { headers: { cookie: bacalon } })).status).toBe(401);
	});

	it("tidak membocorkan nama, kontak, atau berkas Bakal Calon melalui rute API publik", async () => {
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		const berkas = await simpanBerkas(nabila?.id as string, 1, "identitas-nabila.pdf");
		const publik = await Promise.all(["/api/tahap", "/api/peraturan", "/api/unduhan", "/api/konfigurasi-publik"].map(async (path) => {
			const response = await kirim(MASA_PENDAFTARAN, path);
			return JSON.stringify(await response.json());
		}));
		expect((await kirim(MASA_PENDAFTARAN, `/api/berkas-publik/${berkas.id}`)).status).toBe(404);
		for (const response of publik) {
			expect(response).not.toContain("Nabila Putri");
			expect(response).not.toContain("628123450001");
			expect(response).not.toContain("nabila@example.test");
			expect(response).not.toContain("identitas-nabila.pdf");
		}
	});

	it("menerima Admin tepat sebelum dan pada seluruh batas tahap sampai menolak tepat pada Selesai", async () => {
		const admin = await sesiAdmin();
		for (const waktu of [
			new Date("2026-09-16T16:59:59.999Z"), new Date("2026-09-16T17:00:00.000Z"),
			new Date("2026-10-04T16:59:59.999Z"), new Date("2026-10-04T17:00:00.000Z"),
			new Date("2026-10-07T16:59:59.999Z"), new Date("2026-10-07T17:00:00.000Z"),
			new Date("2026-10-11T16:59:59.999Z"), new Date("2026-10-11T17:00:00.000Z"),
			new Date("2027-01-24T16:59:59.999Z"),
		]) {
			await pindahWaktuSesi("admin@example.test", waktu);
			expect((await kirim(waktu, "/api/admin", { headers: { cookie: admin } })).status).toBe(200);
		}
		await pindahWaktuSesi("admin@example.test", SELESAI);
		const selesai = await kirim(SELESAI, "/api/admin", { headers: { cookie: admin } });
		expect(selesai.status).toBe(403);
		expect(await selesai.json()).toEqual({ error: "tahap_tertutup", tahap: "Selesai" });
	});
});
