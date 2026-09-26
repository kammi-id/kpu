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

// Batas tahap (lib/tahap.ts): Masa Pendaftaran mulai 16 Sep 2026 17.00Z,
// Pemeriksaan 30 Sep 17.00Z, Masa Perbaikan 2 Okt 17.00Z, Terkunci 5 Okt
// 17.00Z, Selesai 27 Jan 2027 17.00Z.
const BELUM_DIBUKA = new Date("2026-09-10T00:00:00.000Z");
const MASA_PENDAFTARAN = new Date("2026-09-20T00:00:00.000Z");
const PEMERIKSAAN = new Date("2026-10-01T00:00:00.000Z");
const MASA_PERBAIKAN = new Date("2026-10-03T00:00:00.000Z");
const TERKUNCI = new Date("2026-10-12T00:00:00.000Z");
const SELESAI = new Date("2027-01-28T00:00:00.000Z");

function envUji(overrides: Partial<typeof RAHASIA_UJI> = {}): EnvUji {
	return { ...env, ...RAHASIA_UJI, ...overrides };
}

async function kirim(waktu: Date, path: string, init: RequestInit = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => waktu).fetch(
		new Request(`https://kpu.kammi.id${path}`, init),
		envUji(),
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

function turnstileSelaluLolos() {
	jaringan.use(
		http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () => HttpResponse.json({ success: true })),
	);
}

/** Penggerbangan NIA (tiket 04): sign-up/email sekarang memverifikasi ulang lewat kammi.id, jadi setiap registrasi uji butuh ini juga. */
function kammiIdSelaluLolos() {
	jaringan.use(
		http.get("https://www.kammi.id/api/v1/members/:nia", ({ params }) =>
			HttpResponse.json({ nia: params.nia, nama: "Bakal Calon", jenjangKaderisasi: "AB3", keadaanKader: "aktif" })),
	);
}

let niaBerikutnya = 0;
function niaBaru() {
	niaBerikutnya += 1;
	return `3020100${String(niaBerikutnya).padStart(4, "0")}`;
}

async function daftarBacalon(email: string, whatsapp: string) {
	turnstileSelaluLolos();
	kammiIdSelaluLolos();
	const permintaan = json({ name: "Bakal Calon", email, whatsapp, password: "kata-sandi-aman", persetujuan: "true", nia: niaBaru() });
	const response = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-up/email", {
		...permintaan,
		headers: { ...permintaan.headers, "x-captcha-response": "token-turnstile-uji" },
	});
	expect(response.status).toBe(200);
	const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] as string;
	const user = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind(email).first<{ id: string }>();
	return { cookie, userId: user?.id as string, email };
}

async function setelWaktuSesi(userId: string, waktu: Date) {
	await env.DB.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ? WHERE "userId" = ?')
		.bind(waktu.toISOString(), waktu.toISOString(), userId)
		.run();
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "profil"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("Permintaan Penutupan Akun (tiket 17, acceptance 19)", () => {
	it("menolak kata sandi salah, tanpa mengunci akun atau mencabut sesi", async () => {
		const { cookie, userId } = await daftarBacalon("penutupan-salah@example.test", "081200000001");
		await setelWaktuSesi(userId, MASA_PENDAFTARAN);

		const response = await kirim(MASA_PENDAFTARAN, "/api/akun/pengaturan/penutupan", {
			...json({ password: "kata-sandi-salah" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie },
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "kata_sandi_salah" });

		const user = await env.DB.prepare('SELECT "banned", "banReason" FROM "user" WHERE "id" = ?').bind(userId).first();
		expect(user).toMatchObject({ banned: 0, banReason: null });
		expect((await kirim(MASA_PENDAFTARAN, "/api/akun", { headers: { cookie } })).status).toBe(200);

		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil" FROM "audit" WHERE "tindakan" = ?',
		).bind("penutupan_akun").first();
		expect(audit).toEqual({ aktor: "Bakal Calon Ketua Umum", tindakan: "penutupan_akun", hasil: "gagal" });
	});

	it("dengan kata sandi benar mengunci akun, mencabut seluruh sesi, dan mencatat satu audit", async () => {
		const { cookie, userId, email } = await daftarBacalon("penutupan-benar@example.test", "081200000002");
		await setelWaktuSesi(userId, MASA_PENDAFTARAN);

		const response = await kirim(MASA_PENDAFTARAN, "/api/akun/pengaturan/penutupan", {
			...json({ password: "kata-sandi-aman" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "diajukan" });

		const user = await env.DB.prepare('SELECT "banned", "banReason" FROM "user" WHERE "id" = ?').bind(userId).first();
		expect(user).toEqual({ banned: 1, banReason: "penutupan_akun" });

		// Sesi lama dicabut: baik gerbang akun maupun login baru dengan kata sandi lama ditolak.
		expect((await kirim(MASA_PENDAFTARAN, "/api/akun", { headers: { cookie } })).status).toBe(401);
		const loginUlang = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-in/email", json({ email, password: "kata-sandi-aman" }));
		expect(loginUlang.status).not.toBe(200);

		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil", "aktorUserId" FROM "audit" WHERE "tindakan" = ?',
		).bind("penutupan_akun").all();
		expect(audit.results).toEqual([{ aktor: "Bakal Calon Ketua Umum", tindakan: "penutupan_akun", hasil: "berhasil", aktorUserId: userId }]);
	});

	it("diterima pada Belum dibuka sampai Terkunci dan ditolak pada Selesai", async () => {
		const { cookie, userId } = await daftarBacalon("penutupan-tahap@example.test", "081200000003");

		for (const waktu of [BELUM_DIBUKA, MASA_PENDAFTARAN, PEMERIKSAAN, MASA_PERBAIKAN, TERKUNCI]) {
			await setelWaktuSesi(userId, waktu);
			const response = await kirim(waktu, "/api/akun/pengaturan/penutupan", {
				...json({ password: "kata-sandi-salah" }),
				headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie },
			});
			// Kata sandi salah dipilih supaya akun tidak benar-benar tertutup di
			// tengah loop; status 401 (bukan 403 tahap) membuktikan gerbang tahap lolos.
			expect(response.status).toBe(401);
			expect(await response.json()).toEqual({ error: "kata_sandi_salah" });
		}

		await setelWaktuSesi(userId, SELESAI);
		const selesai = await kirim(SELESAI, "/api/akun/pengaturan/penutupan", {
			...json({ password: "kata-sandi-salah" }),
			headers: { "content-type": "application/json", origin: "https://kpu.kammi.id", cookie },
		});
		expect(selesai.status).toBe(403);
		expect(await selesai.json()).toEqual({ error: "layanan_selesai" });
	});

	it("menolak tanpa sesi Bakal Calon", async () => {
		const response = await kirim(MASA_PENDAFTARAN, "/api/akun/pengaturan/penutupan", json({ password: "apa-saja" }));
		expect(response.status).toBe(401);
	});
});
