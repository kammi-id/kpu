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
const SELESAI = new Date("2027-01-27T17:00:00.000Z");
let whatsappBerikutnya = 0;
let niaBerikutnya = 0;

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
	niaBerikutnya += 1;
	jaringan.use(http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () => HttpResponse.json({ success: true })));
	// Penggerbangan NIA (tiket 04): sign-up/email memverifikasi ulang lewat kammi.id.
	jaringan.use(
		http.get("https://www.kammi.id/api/v1/members/:nia", ({ params }) =>
			HttpResponse.json({ nia: params.nia, nama: name, jenjangKaderisasi: "AB3", keadaanKader: "aktif" })),
	);
	const response = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-up/email", {
		...json({
			name,
			email,
			whatsapp: `08123450${String(whatsappBerikutnya).padStart(4, "0")}`,
			password: "kata-sandi-aman",
			persetujuan: "true",
			nia: `3020100${String(niaBerikutnya).padStart(4, "0")}`,
		}),
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

/**
 * Data uji disisipkan langsung ke database (bukan lewat sesiBacalon()/sign-up nyata):
 * sign-up sungguhan masih patah karena constraint NOT NULL `nia` dari tiket 01 belum
 * digerbangi klien sampai tiket 04 selesai (lihat tiket 05, Comments). Kolom di sini
 * meniru pola buatBacalon() di ../ekspor.test.ts.
 */
async function buatBacalonLangsung(nama: string, email: string, waktu: Date) {
	whatsappBerikutnya += 1;
	niaBerikutnya += 1;
	const id = crypto.randomUUID();
	await env.DB.prepare(
		`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada", "nia", "banned", "banReason")
		 VALUES (?, ?, ?, 1, ?, ?, 'bacalon', ?, 'persetujuan-v1', ?, ?, 0, NULL)`,
	)
		.bind(
			id,
			nama,
			email,
			waktu.toISOString(),
			waktu.toISOString(),
			`62812345${String(whatsappBerikutnya).padStart(4, "0")}`,
			waktu.toISOString(),
			`3020100${String(niaBerikutnya).padStart(4, "0")}`,
		)
		.run();
	return id;
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
	niaBerikutnya = 0;
	const objek = await env.BERKAS.list();
	if (objek.objects.length) await env.BERKAS.delete(objek.objects.map((satu) => satu.key));
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
	it("mereset kata sandi Bakal Calon sekali, mencabut sesi lamanya, dan mencatat audit tanpa kata sandi", async () => {
		const admin = await sesiAdmin();
		const sesiLamaBacalon = await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});

		expect(response.status).toBe(200);
		const body = await response.json<{ password: string }>();
		expect(body.password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{16}$/);
		expect((await kirim(MASA_PENDAFTARAN, "/api/akun", { headers: { cookie: sesiLamaBacalon } })).status).toBe(401);
		expect((await kirim(MASA_PENDAFTARAN, "/api/auth/sign-in/email", json({ email: "nabila@example.test", password: body.password }))).status).toBe(200);

		const tersimpan = await env.DB.prepare('SELECT "password" FROM "account" WHERE "userId" = ?').bind(nabila?.id).first<{ password: string }>();
		expect(tersimpan?.password).not.toBe(body.password);
		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil", "sasaranUserId", "sesiId" FROM "audit" WHERE "tindakan" = ? ORDER BY "waktu" DESC LIMIT 1',
		).bind("reset_kata_sandi").first();
		expect(audit).toMatchObject({ aktor: "Admin bersama", tindakan: "reset_kata_sandi", hasil: "berhasil", sasaranUserId: nabila?.id });
		expect(JSON.stringify(audit)).not.toContain(body.password);
	});

	it("menolak konfirmasi kata sandi Admin yang salah, mencatat audit gagal, dan tidak mencabut sesi target (acceptance 27)", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
			...json({ password: "kata-sandi-salah" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "konfirmasi_kata_sandi_gagal" });
		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil", "sasaranUserId" FROM "audit" WHERE "tindakan" = ? ORDER BY "waktu" DESC LIMIT 1',
		).bind("reset_kata_sandi").first();
		expect(audit).toMatchObject({ aktor: "Admin bersama", tindakan: "reset_kata_sandi", hasil: "gagal", sasaranUserId: nabila?.id });
		expect((await kirim(MASA_PENDAFTARAN, "/api/admin", { headers: { cookie: admin } })).status).toBe(200);
	});

	it("mencabut sesi Admin yang sedang dipakai setelah lima kegagalan konfirmasi berturut-turut (acceptance 27)", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();

		for (let percobaan = 0; percobaan < 5; percobaan += 1) {
			const gagal = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
				...json({ password: "kata-sandi-salah" }),
				headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
			});
			expect(gagal.status).toBe(401);
		}

		expect((await kirim(MASA_PENDAFTARAN, "/api/admin", { headers: { cookie: admin } })).status).toBe(401);
	});

	it("mereset penghitung kegagalan Admin setelah konfirmasi berhasil, sehingga empat kegagalan berikutnya belum mencabut sesi (acceptance 27)", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		await sesiBacalon("citra@example.test", "Citra Ayu");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		const citra = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("citra@example.test").first<{ id: string }>();

		for (let percobaan = 0; percobaan < 4; percobaan += 1) {
			await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
				...json({ password: "kata-sandi-salah" }),
				headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
			});
		}

		const berhasil = await kirim(MASA_PENDAFTARAN, `/api/admin/${citra?.id}/reset-password`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});
		expect(berhasil.status).toBe(200);

		for (let percobaan = 0; percobaan < 4; percobaan += 1) {
			await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
				...json({ password: "kata-sandi-salah" }),
				headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
			});
		}

		expect((await kirim(MASA_PENDAFTARAN, "/api/admin", { headers: { cookie: admin } })).status).toBe(200);
	});

	it("menolak reset dari sesi Bakal Calon", async () => {
		const bacalon = await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/reset-password`, {
			...json({ password: "kata-sandi-aman" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: bacalon },
		});

		expect(response.status).toBe(401);
	});

	it("menolak reset untuk akun selain Bakal Calon", async () => {
		const admin = await sesiAdmin();
		const adminUser = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("admin@example.test").first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${adminUser?.id}/reset-password`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});

		expect(response.status).toBe(404);
	});

	it("menampilkan hanya Bakal Calon yang cocok dengan pencarian dan kelengkapan dari vKelengkapan", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("nabila@example.test", "Nabila Putri");
		await sesiBacalon("raka@example.test", "Raka Pratama");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		await simpanBerkas(nabila?.id as string, 1, "a1.pdf");

		const response = await kirim(MASA_PENDAFTARAN, "/api/admin?q=nabila", { headers: { cookie: admin } });
		expect(response.status).toBe(200);
		const body = await response.json<{ data: Array<{ name: string; whatsapp: string; jumlahHadir: number; lengkap: boolean; mintaDitutup: boolean }> }>();
		expect(body.data).toEqual([{ name: "Nabila Putri", whatsapp: expect.stringMatching(/^62/), jumlahHadir: 1, lengkap: false, mintaDitutup: false, dibuatPada: expect.any(String), id: nabila?.id }]);
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

	it("menampilkan nia pada detail Bakal Calon (tiket 05, data uji disisipkan langsung)", async () => {
		const admin = await sesiAdmin();
		const userId = await buatBacalonLangsung("Nabila Putri", "nabila-nia@example.test", MASA_PENDAFTARAN);
		const dibuat = await env.DB.prepare('SELECT "nia" FROM "user" WHERE "id" = ?').bind(userId).first<{ nia: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${userId}`, { headers: { cookie: admin } });

		expect(response.status).toBe(200);
		const body = await response.json<{ nia: string }>();
		expect(body.nia).toBe(dibuat?.nia);
		expect(body.nia).toMatch(/^\d{11}$/);
	});

	it("menampilkan penanda manual struktur pada detail Bakal Calon (tiket 22)", async () => {
		const admin = await sesiAdmin();
		const userId = await buatBacalonLangsung("Citra Lestari", "citra-manual@example.test", MASA_PENDAFTARAN);
		await env.DB.prepare(
			`INSERT INTO "profil" ("userId", "asalPw", "asalPwManual", "asalPd", "asalPdManual", "tempatLulusDm3", "tempatLulusDm3Manual", "diubahPada")
			 VALUES (?, 'PW Manual', 1, 'PD Manual', 1, 'PW Lulus Manual', 1, ?)`,
		).bind(userId, MASA_PENDAFTARAN.toISOString()).run();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${userId}`, { headers: { cookie: admin } });
		expect(response.status).toBe(200);
		const body = await response.json<Record<string, unknown>>();
		expect(body.asalPwManual).toBe(true);
		expect(body.asalPdManual).toBe(true);
		expect(body.tempatLulusDm3Manual).toBe(true);
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
			new Date("2026-09-26T16:59:59.999Z"), new Date("2026-09-26T17:00:00.000Z"),
			new Date("2026-09-29T16:59:59.999Z"), new Date("2026-09-29T17:00:00.000Z"),
			new Date("2026-10-03T16:59:59.999Z"), new Date("2026-10-03T17:00:00.000Z"),
			new Date("2027-01-27T16:59:59.999Z"),
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

describe("Hapus data akun (tiket 17, acceptance 30; berlaku untuk semua Bakal Calon)", () => {
	async function jadikanMintaDitutup(userId: string) {
		await env.DB.prepare(`UPDATE "user" SET "banned" = 1, "banReason" = 'penutupan_akun' WHERE "id" = ?`).bind(userId).run();
	}

	it("menghapus Bakal Calon aktif tanpa penanda Minta ditutup", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("tanpa-penanda@example.test", "Tanpa Penanda");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("tanpa-penanda@example.test").first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/hapus-data`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});
		expect(response.status).toBe(200);
		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(nabila?.id).first()).toBeNull();
	});

	it("menolak menghapus akun Admin", async () => {
		const admin = await sesiAdmin();
		const akunAdmin = await env.DB.prepare(`SELECT "id" FROM "user" WHERE "role" = 'admin'`).first<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${akunAdmin?.id}/hapus-data`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});
		expect(response.status).toBe(404);
		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(akunAdmin?.id).first()).not.toBeNull();
	});

	it("menolak sesi Bakal Calon", async () => {
		const bacalon = await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		await jadikanMintaDitutup(nabila?.id as string);

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${nabila?.id}/hapus-data`, {
			...json({ password: "kata-sandi-aman" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: bacalon },
		});
		expect(response.status).toBe(401);
	});

	it("membagi penghitung kegagalan konfirmasi dengan Reset Password, mencabut sesi Admin pada kegagalan kelima gabungan", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("bersama-penghitung@example.test", "Bersama Penghitung");
		const target = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("bersama-penghitung@example.test").first<{ id: string }>();
		await jadikanMintaDitutup(target?.id as string);

		for (let percobaan = 0; percobaan < 4; percobaan += 1) {
			const gagal = await kirim(MASA_PENDAFTARAN, `/api/admin/${target?.id}/reset-password`, {
				...json({ password: "kata-sandi-salah" }),
				headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
			});
			expect(gagal.status).toBe(401);
		}

		const kelima = await kirim(MASA_PENDAFTARAN, `/api/admin/${target?.id}/hapus-data`, {
			...json({ password: "kata-sandi-salah" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});
		expect(kelima.status).toBe(401);
		expect((await kirim(MASA_PENDAFTARAN, "/api/admin", { headers: { cookie: admin } })).status).toBe(401);
	});

	it("menghapus D1, objek R2, kedua ZIP, dan baris CSV, lalu mencatat tepat satu audit hapus_data", async () => {
		const admin = await sesiAdmin();
		await sesiBacalon("hapus-data@example.test", "Hapus Data");
		const target = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("hapus-data@example.test").first<{ id: string }>();
		const targetId = target?.id as string;
		const berkas = await simpanBerkas(targetId, 1, "identitas.pdf");
		const barisBerkas = await env.DB.prepare('SELECT "r2Key" FROM "berkas" WHERE "id" = ?').bind(berkas.id).first<{ r2Key: string }>();
		await jadikanMintaDitutup(targetId);

		await env.BERKAS.put(
			"ekspor/terkini/bacalon.csv",
			`id,nama\r\n${targetId},Hapus Data\r\nid-lain,Bertahan\r\n`,
			{ httpMetadata: { contentType: "text/csv; charset=utf-8" } },
		);
		await env.BERKAS.put(
			"ekspor/pemeriksaan/bacalon.csv",
			`id,nama\r\n${targetId},Hapus Data\r\nid-lain,Bertahan\r\n`,
			{ httpMetadata: { contentType: "text/csv; charset=utf-8" } },
		);
		await env.BERKAS.put(`ekspor/terkini/${targetId}.zip`, new Uint8Array([1, 2, 3]));
		await env.BERKAS.put(`ekspor/pemeriksaan/${targetId}.zip`, new Uint8Array([4, 5, 6]));

		const response = await kirim(MASA_PENDAFTARAN, `/api/admin/${targetId}/hapus-data`, {
			...json({ password: "kata-sandi-admin" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie: admin },
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "terhapus" });

		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(targetId).first()).toBeNull();
		expect(await env.DB.prepare('SELECT 1 FROM "berkas" WHERE "userId" = ?').bind(targetId).first()).toBeNull();
		expect(await env.DB.prepare('SELECT 1 FROM "session" WHERE "userId" = ?').bind(targetId).first()).toBeNull();

		expect(await env.BERKAS.head(barisBerkas?.r2Key as string)).toBeNull();
		expect(await env.BERKAS.head(`ekspor/terkini/${targetId}.zip`)).toBeNull();
		expect(await env.BERKAS.head(`ekspor/pemeriksaan/${targetId}.zip`)).toBeNull();

		const terkiniCsv = await (await env.BERKAS.get("ekspor/terkini/bacalon.csv"))?.text();
		expect(terkiniCsv).not.toContain(targetId);
		expect(terkiniCsv).toContain("id-lain");
		const pemeriksaanCsv = await (await env.BERKAS.get("ekspor/pemeriksaan/bacalon.csv"))?.text();
		expect(pemeriksaanCsv).not.toContain(targetId);
		expect(pemeriksaanCsv).toContain("id-lain");

		// Audit lama yang menyebut akun ini (mis. registrasi) hilang, kecuali satu hapus_data baru.
		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil", "sasaranUserId" FROM "audit" WHERE "sasaranUserId" = ? OR "aktorUserId" = ?',
		).bind(targetId, targetId).all();
		expect(audit.results).toEqual([{ aktor: "Admin bersama", tindakan: "hapus_data", hasil: "berhasil", sasaranUserId: targetId }]);
	});
});

describe("Ekspor: unduhan Terkini dan Pemeriksaan (tiket 16)", () => {
	it("mengunduh CSV Terkini dan Pemeriksaan sebagai attachment ber-nosniff, 'belum tersedia' bila kosong, dan mencatat audit ekspor", async () => {
		const admin = await sesiAdmin();

		const belumAda = await kirim(MASA_PENDAFTARAN, "/api/admin/ekspor/terkini", { headers: { cookie: admin } });
		expect(belumAda.status).toBe(404);
		expect(await belumAda.json()).toEqual({ error: "belum_tersedia" });

		await env.BERKAS.put("ekspor/terkini/bacalon.csv", "id,nama\r\n1,Terkini\r\n", { httpMetadata: { contentType: "text/csv; charset=utf-8" } });
		await env.BERKAS.put("ekspor/pemeriksaan/bacalon.csv", "id,nama\r\n1,Pemeriksaan\r\n", { httpMetadata: { contentType: "text/csv; charset=utf-8" } });

		const terkini = await kirim(MASA_PENDAFTARAN, "/api/admin/ekspor/terkini", { headers: { cookie: admin } });
		expect(terkini.status).toBe(200);
		expect(terkini.headers.get("content-type")).toContain("text/csv");
		expect(terkini.headers.get("content-disposition")).toContain("attachment");
		expect(terkini.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await terkini.text()).toBe("id,nama\r\n1,Terkini\r\n");

		const pemeriksaan = await kirim(MASA_PENDAFTARAN, "/api/admin/ekspor/pemeriksaan", { headers: { cookie: admin } });
		expect(pemeriksaan.status).toBe(200);
		expect(await pemeriksaan.text()).toBe("id,nama\r\n1,Pemeriksaan\r\n");

		const audit = await env.DB.prepare(
			'SELECT COUNT(*) AS n FROM "audit" WHERE "tindakan" = ? AND "hasil" = ? AND "aktor" = ? AND "sasaranUserId" IS NULL',
		).bind("ekspor", "berhasil", "Admin bersama").first<{ n: number }>();
		expect(audit?.n).toBe(2);

		expect((await kirim(MASA_PENDAFTARAN, "/api/admin/ekspor/terkini")).status).toBe(401);
	});

	it("mengunduh ZIP akun Terkini dan Pemeriksaan dengan sasaranUserId pada audit, 'belum tersedia' bila belum ada, dan menolak non-Admin", async () => {
		const admin = await sesiAdmin();
		const bacalon = await sesiBacalon("nabila@example.test", "Nabila Putri");
		const nabila = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind("nabila@example.test").first<{ id: string }>();
		const id = nabila?.id as string;

		const belumAda = await kirim(MASA_PENDAFTARAN, `/api/admin/${id}/ekspor/terkini`, { headers: { cookie: admin } });
		expect(belumAda.status).toBe(404);
		expect(await belumAda.json()).toEqual({ error: "belum_tersedia" });
		expect((await kirim(MASA_PENDAFTARAN, `/api/admin/${id}/ekspor/terkini`, { headers: { cookie: bacalon } })).status).toBe(401);

		await env.BERKAS.put(`ekspor/terkini/${id}.zip`, new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: "application/zip" } });
		await env.BERKAS.put(`ekspor/pemeriksaan/${id}.zip`, new Uint8Array([4, 5, 6, 7]), { httpMetadata: { contentType: "application/zip" } });

		const terkini = await kirim(MASA_PENDAFTARAN, `/api/admin/${id}/ekspor/terkini`, { headers: { cookie: admin } });
		expect(terkini.status).toBe(200);
		expect(terkini.headers.get("content-type")).toContain("application/zip");
		expect(terkini.headers.get("content-disposition")).toContain("attachment");
		expect(terkini.headers.get("x-content-type-options")).toBe("nosniff");
		expect(new Uint8Array(await terkini.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));

		const pemeriksaan = await kirim(MASA_PENDAFTARAN, `/api/admin/${id}/ekspor/pemeriksaan`, { headers: { cookie: admin } });
		expect(pemeriksaan.status).toBe(200);
		expect(new Uint8Array(await pemeriksaan.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6, 7]));

		const audit = await env.DB.prepare(
			'SELECT COUNT(*) AS n FROM "audit" WHERE "tindakan" = ? AND "sasaranUserId" = ? AND "hasil" = ?',
		).bind("ekspor", id, "berhasil").first<{ n: number }>();
		expect(audit?.n).toBe(2);

		expect((await kirim(MASA_PENDAFTARAN, `/api/admin/${id}/ekspor/pemeriksaan`)).status).toBe(401);

		await pindahWaktuSesi("admin@example.test", SELESAI);
		const tertutup = await kirim(SELESAI, `/api/admin/${id}/ekspor/terkini`, { headers: { cookie: admin } });
		expect(tertutup.status).toBe(403);
		expect(await tertutup.json()).toEqual({ error: "tahap_tertutup", tahap: "Selesai" });
	});
});
