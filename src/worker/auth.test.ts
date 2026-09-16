import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "./index";
import { jaringan } from "./test/jaringan";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;
const AWAL_PENDAFTARAN = new Date("2026-09-16T17:00:00.000Z");

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

function envUji(overrides: Partial<typeof RAHASIA_UJI> = {}): EnvUji {
	return { ...env, ...RAHASIA_UJI, ...overrides };
}

async function kirim(
	path: string,
	init: RequestInit = {},
	overrides: Partial<typeof RAHASIA_UJI> = {},
) {
	return kirimPada(new Date("2026-09-15T00:00:00.000Z"), path, init, overrides);
}

async function kirimPada(
	waktu: Date,
	path: string,
	init: RequestInit = {},
	overrides: Partial<typeof RAHASIA_UJI> = {},
) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => waktu).fetch(
		new Request(`https://kpu.kammi.id${path}`, init),
		envUji(overrides),
		ctx,
	);
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

function jsonDenganTurnstile(body: Record<string, string>) {
	return {
		...json(body),
		headers: {
			"content-type": "application/json",
			origin: "https://kpu.kammi.id",
			"x-captcha-response": "token-turnstile-uji",
		},
	};
}

const DATA_ADMIN = {
	token: RAHASIA_UJI.ONBOARD_TOKEN,
	name: "Admin bersama",
	email: "admin@example.test",
	password: "kata-sandi-admin",
};

async function onboarding() {
	return kirim("/onboard", json(DATA_ADMIN));
}

async function masuk() {
	const response = await kirim(
		"/api/auth/sign-in/email",
		json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }),
	);
	const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
	expect(response.status).toBe(200);
	expect(cookie).toBeTruthy();
	return cookie as string;
}

/** Mendaftarkan Bakal Calon lewat seam yang sama seperti klien, lalu mengembalikan cookie sesinya (autoSignIn). */
async function daftarBacalon(email: string, password = "kata-sandi-aman", whatsapp = "081234567890") {
	turnstileSelaluLolos();
	const response = await kirimPada(
		AWAL_PENDAFTARAN,
		"/api/auth/sign-up/email",
		jsonDenganTurnstile({ name: "Bakal Calon", email, whatsapp, password, persetujuan: "true" }),
	);
	const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
	expect(response.status).toBe(200);
	expect(cookie).toBeTruthy();
	return cookie as string;
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("registrasi Bakal Calon Ketua Umum (seam Worker)", () => {
	it("memverifikasi Turnstile di jaringan, menormalisasi data, dan memaksa peran bacalon (butir 7)", async () => {
		jaringan.use(
			http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", async ({ request }) => {
				expect(await request.json()).toMatchObject({
					secret: RAHASIA_UJI.TURNSTILE_SECRET_KEY,
					response: "token-turnstile-uji",
				});
				return HttpResponse.json({ success: true });
			}),
		);

		const response = await kirimPada(
			AWAL_PENDAFTARAN,
			"/api/auth/sign-up/email",
			jsonDenganTurnstile({
				name: "Bakal Calon",
				email: "  BACALON@Example.Test ",
				whatsapp: "081234567890",
				password: "kata-sandi-aman",
				persetujuan: "true",
				role: "admin",
				persetujuanVersi: "palsu",
				persetujuanPada: "2000-01-01T00:00:00.000Z",
			}),
		);

		expect(response.status).toBe(200);
		const pengguna = await env.DB
			.prepare('SELECT "email", "whatsapp", "role", "persetujuanVersi", "persetujuanPada" FROM "user"')
			.first<Record<string, string>>();
		expect(pengguna).toMatchObject({
			email: "bacalon@example.test",
			whatsapp: "6281234567890",
			role: "bacalon",
			persetujuanVersi: "persetujuan-v1",
		});
		expect(pengguna?.persetujuanPada).not.toBe("2000-01-01T00:00:00.000Z");

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit"').first();
		expect(audit).toEqual({ aktor: "Bakal Calon Ketua Umum", tindakan: "registrasi", hasil: "berhasil" });
	});

	it("menolak persetujuan yang tidak diberikan dan registrasi di luar Masa Pendaftaran, dengan kode galat tahap (butir 8, 17)", async () => {
		turnstileSelaluLolos();
		const tanpaPersetujuan = await kirimPada(
			AWAL_PENDAFTARAN,
			"/api/auth/sign-up/email",
			jsonDenganTurnstile({ name: "Bakal", email: "bakal@example.test", whatsapp: "6281234567890", password: "kata-sandi-aman", persetujuan: "false" }),
		);
		expect(tanpaPersetujuan.status).toBe(400);
		const auditDitolak = await env.DB.prepare('SELECT "aktor", "hasil" FROM "audit" WHERE "tindakan" = ?').bind("registrasi").first();
		expect(auditDitolak).toEqual({ aktor: "Anonim", hasil: "ditolak" });

		// Batas instan: BelumDibuka, Pemeriksaan, MasaPerbaikan, Terkunci, Selesai — tepat pada mulainya.
		for (const waktu of ["2026-09-15T00:00:00.000Z", "2026-09-26T17:00:00.000Z", "2026-09-29T17:00:00.000Z", "2026-10-03T17:00:00.000Z", "2027-01-27T17:00:00.000Z"]) {
			const response = await kirimPada(new Date(waktu), "/api/auth/sign-up/email", jsonDenganTurnstile({ name: "Bakal", email: `${waktu}@example.test`, whatsapp: "6281234567890", password: "kata-sandi-aman", persetujuan: "true" }));
			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({ error: "registrasi_tidak_diizinkan" });
		}
	});

	it("menolak WhatsApp yang sudah dipakai tanpa membalas 500 (email dan WhatsApp unik ternormalisasi, butir 7)", async () => {
		turnstileSelaluLolos();
		const pertama = await kirimPada(
			AWAL_PENDAFTARAN,
			"/api/auth/sign-up/email",
			jsonDenganTurnstile({ name: "Bakal Satu", email: "satu@example.test", whatsapp: "081234567890", password: "kata-sandi-aman", persetujuan: "true" }),
		);
		expect(pertama.status).toBe(200);

		// Nomor sama, ditulis dalam bentuk "62..." — harus ternormalisasi sama dan ditolak sebagai duplikat.
		const kedua = await kirimPada(
			AWAL_PENDAFTARAN,
			"/api/auth/sign-up/email",
			jsonDenganTurnstile({ name: "Bakal Dua", email: "dua@example.test", whatsapp: "6281234567890", password: "kata-sandi-aman", persetujuan: "true" }),
		);
		expect(kedua.status).toBeLessThan(500);
		expect(kedua.status).not.toBe(200);

		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "user"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(1);
	});

	// Regresi tiket 17: name berakhir sebagai kolom CSV Ekspor Harian
	// (lib/ekspor.ts). CR/LF di tengahnya memecah baris CSV mentah dan merusak
	// baris berikutnya saat hapusBarisCsvBacalon menghapus satu baris.
	it("menolak nama berisi karakter kontrol (CR/LF) tanpa membuat akun (regresi tiket 17)", async () => {
		turnstileSelaluLolos();
		const response = await kirimPada(
			AWAL_PENDAFTARAN,
			"/api/auth/sign-up/email",
			jsonDenganTurnstile({ name: "Budi\r\nAdmin", email: "kontrol@example.test", whatsapp: "081234567890", password: "kata-sandi-aman", persetujuan: "true" }),
		);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "registrasi_tidak_valid" });
		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "user"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(0);
	});
});

describe("login Bakal Calon dan percobaanLogin (seam Worker)", () => {
	it("mewajibkan Turnstile setelah tiga kegagalan berturut-turut, mereset penghitung saat berhasil (butir 9)", async () => {
		const email = "gagal-login@example.test";
		await daftarBacalon(email);

		for (let percobaan = 0; percobaan < 3; percobaan += 1) {
			const gagal = await kirim("/api/auth/sign-in/email", json({ email, password: "salah-sandi" }));
			expect(gagal.status).not.toBe(200);
		}
		const barisSetelahTigaGagal = await env.DB
			.prepare('SELECT "gagal" FROM "percobaanLogin"')
			.all<{ gagal: number }>();
		expect(barisSetelahTigaGagal.results.length).toBeGreaterThan(0);
		expect(barisSetelahTigaGagal.results.every((baris) => baris.gagal >= 3)).toBe(true);

		// Percobaan keempat tanpa Turnstile ditolak walau kata sandi benar, dengan penanda di respons.
		const tanpaTurnstile = await kirim("/api/auth/sign-in/email", json({ email, password: "kata-sandi-aman" }));
		expect(tanpaTurnstile.status).toBe(403);
		expect(await tanpaTurnstile.json()).toMatchObject({ turnstileDiperlukan: true });

		// Turnstile yang gagal diverifikasi server tetap ditolak.
		turnstileSelaluGagal();
		const turnstileGagal = await kirim("/api/auth/sign-in/email", jsonDenganTurnstile({ email, password: "kata-sandi-aman" }));
		expect(turnstileGagal.status).toBe(403);

		// Turnstile valid dan kata sandi benar: berhasil, dan mereset penghitung.
		turnstileSelaluLolos();
		const berhasil = await kirim("/api/auth/sign-in/email", jsonDenganTurnstile({ email, password: "kata-sandi-aman" }));
		expect(berhasil.status).toBe(200);
		const sisaBaris = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "percobaanLogin"').first<{ jumlah: number }>();
		expect(sisaBaris?.jumlah).toBe(0);

		// Percobaan berikutnya (setelah reset) tidak lagi menuntut Turnstile.
		const setelahReset = await kirim("/api/auth/sign-in/email", json({ email, password: "salah-lagi" }));
		expect(setelahReset.status).not.toBe(403);
	});

	it("menghapus baris percobaanLogin yang kedaluwarsa pada percobaan berikutnya", async () => {
		const email = "kedaluwarsa@example.test";
		await daftarBacalon(email);
		for (let percobaan = 0; percobaan < 3; percobaan += 1) {
			await kirim("/api/auth/sign-in/email", json({ email, password: "salah-sandi" }));
		}
		await env.DB.prepare('UPDATE "percobaanLogin" SET "kedaluwarsa" = ?').bind("2020-01-01T00:00:00.000Z").run();

		// Baris lama kedaluwarsa dihapus pada percobaan ini; penghitung dianggap nol lagi (bukan 403 tanpa Turnstile).
		const setelahKedaluwarsa = await kirim("/api/auth/sign-in/email", json({ email, password: "salah-lagi" }));
		expect(setelahKedaluwarsa.status).not.toBe(403);
		const gagalTerbaru = await env.DB.prepare('SELECT MAX("gagal") AS gagal FROM "percobaanLogin"').first<{ gagal: number }>();
		expect(gagalTerbaru?.gagal).toBe(1);
	});

	it("menolak akun ber-ban walau kata sandi benar", async () => {
		const email = "banned@example.test";
		await daftarBacalon(email);
		await env.DB.prepare('UPDATE "user" SET "banned" = 1 WHERE "email" = ?').bind(email).run();
		const response = await kirim("/api/auth/sign-in/email", json({ email, password: "kata-sandi-aman" }));
		expect(response.status).not.toBe(200);
	});

	it("menolak API akun tanpa sesi (butir 11) dan sesi Bakal Calon di seluruh API Admin (butir 20)", async () => {
		expect((await kirim("/api/akun")).status).toBe(401);
		expect((await kirim("/api/akun/pengaturan")).status).toBe(401);

		const cookie = await daftarBacalon("akun@example.test");
		expect((await kirim("/api/akun", { headers: { cookie } })).status).toBe(200);
		expect((await kirim("/api/admin/audit", { headers: { cookie } })).status).toBe(401);
	});

	it("menolak baca /api/akun pada tahap Selesai walau sesi masih berlaku (Tahap × kemampuan)", async () => {
		const cookie = await daftarBacalon("selesai@example.test");
		await env.DB
			.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ?, "expiresAt" = ?')
			.bind("2027-01-27T23:00:00.000Z", "2027-01-27T23:00:00.000Z", "2027-01-28T23:00:00.000Z")
			.run();
		const response = await kirimPada(new Date("2027-01-28T00:00:00.000Z"), "/api/akun", { headers: { cookie } });
		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({ error: "layanan_selesai" });
	});

	it("/akun/pengaturan menampilkan versi dan waktu persetujuan yang terekam (butir 18)", async () => {
		const email = "pengaturan@example.test";
		const cookie = await daftarBacalon(email, "kata-sandi-aman", "081234500000");
		const response = await kirim("/api/akun/pengaturan", { headers: { cookie } });
		expect(response.status).toBe(200);
		const body = await response.json<{ email: string; whatsapp: string; persetujuanVersi: string; persetujuanPada: string }>();
		expect(body).toMatchObject({ email, whatsapp: "6281234500000", persetujuanVersi: "persetujuan-v1" });
		expect(body.persetujuanPada).toBeTruthy();
	});
});

describe("onboarding dan sesi Admin (seam Worker)", () => {
	it("menutup auth dan onboarding bila secret wajib tidak tersedia", async () => {
		expect((await kirim("/onboard", json(DATA_ADMIN), { HMAC_SECRET: undefined })).status).toBe(503);
		expect((await kirim("/api/auth/sign-in/email", json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }), {
			BETTER_AUTH_SECRET: undefined,
		})).status).toBe(503);
	});

	it("menolak token onboarding yang salah atau tidak ada", async () => {
		expect((await kirim("/onboard", json({ ...DATA_ADMIN, token: "salah" }))).status).toBe(404);
		expect((await kirim("/onboard", json(DATA_ADMIN), { ONBOARD_TOKEN: undefined })).status).toBe(404);
	});

	it("membuat satu Admin, mengauditnya, lalu menutup onboarding", async () => {
		expect((await onboarding()).status).toBe(201);
		expect((await onboarding()).status).toBe(404);

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit"').all();
		expect(audit.results).toEqual([
			{ aktor: "Admin bersama", tindakan: "onboarding_admin", hasil: "berhasil" },
		]);
	});

	it("menandai onboardTersedia di /api/konfigurasi-publik sebelum dan sesudah onboarding, dan bila secret hilang", async () => {
		expect((await (await kirim("/api/konfigurasi-publik")).json() as { onboardTersedia: boolean }).onboardTersedia).toBe(true);
		expect((await onboarding()).status).toBe(201);
		expect((await (await kirim("/api/konfigurasi-publik")).json() as { onboardTersedia: boolean }).onboardTersedia).toBe(false);

		await env.DB.prepare('DELETE FROM "user" WHERE "role" = ?').bind("admin").run();
		const tanpaSecret = await kirim("/api/konfigurasi-publik", undefined, { HMAC_SECRET: undefined });
		expect(tanpaSecret.status).toBe(200);
		expect((await tanpaSecret.json() as { onboardTersedia: boolean }).onboardTersedia).toBe(false);
	});

	it("membatasi HTTP Better Auth ke endpoint yang dipakai", async () => {
		expect((await kirim("/api/auth/update-user", json({ name: "Tidak boleh" }))).status).toBe(404);
		expect((await kirim("/api/auth/admin/create-user", json(DATA_ADMIN))).status).toBe(404);
		expect((await kirim("/api/auth/change-email", json(DATA_ADMIN))).status).toBe(404);
		expect((await kirim("/api/auth/change-password", json(DATA_ADMIN))).status).toBe(404);
		expect((await kirim("/api/auth/get-session")).status).toBe(200);
	});

	it("menjaga satu Admin ketika onboarding tiba bersamaan", async () => {
		const hasil = await Promise.all([onboarding(), onboarding()]);
		expect(hasil.map((response) => response.status).sort()).toEqual([201, 404]);
		const admin = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "user" WHERE "role" = ?')
			.bind("admin")
			.first<{ jumlah: number }>();
		expect(admin?.jumlah).toBe(1);
	});

	it("menolak API Admin tanpa sesi dan menampilkan audit tanpa data pribadi", async () => {
		expect((await kirim("/api/admin/audit")).status).toBe(401);
		await onboarding();
		const cookie = await masuk();
		await kirim("/api/auth/sign-in/email", json({}));
		const audit = await kirim("/api/admin/audit", { headers: { cookie } });
		expect(audit.status).toBe(200);
		const body = await audit.json<{ data: Array<Record<string, unknown>> }>();
		expect(body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ aktor: "Admin bersama", tindakan: "login", hasil: "berhasil" }),
				expect.objectContaining({ aktor: "Anonim", tindakan: "login", hasil: "gagal" }),
			]),
		);
		expect(Object.keys(body.data[0] ?? {})).not.toContain("email");
		expect(Object.keys(body.data[0] ?? {})).not.toContain("name");
	});

	it("mencabut sesi Admin yang tidak aktif, absolut, dan yang keenam", async () => {
		await onboarding();
		const pertama = await masuk();
		const sesi = await env.DB.prepare('SELECT "id" FROM "session" LIMIT 1').first<{ id: string }>();
		await env.DB
			.prepare('UPDATE "session" SET "updatedAt" = ? WHERE "id" = ?')
			.bind("2026-09-14T23:29:59.999Z", sesi?.id)
			.run();
		expect((await kirim("/api/admin/audit", { headers: { cookie: pertama } })).status).toBe(401);

		expect(await (await kirim("/api/auth/get-session", { headers: { cookie: pertama } })).json()).toBeNull();

		const kedua = await masuk();
		const sesiKedua = await env.DB.prepare('SELECT "id" FROM "session" LIMIT 1').first<{ id: string }>();
		await env.DB
			.prepare('UPDATE "session" SET "createdAt" = ? WHERE "id" = ?')
			.bind("2026-09-14T15:59:59.999Z", sesiKedua?.id)
			.run();
		expect((await kirim("/api/admin/audit", { headers: { cookie: kedua } })).status).toBe(401);

		const cookies = [await masuk()];
		for (let hitung = 0; hitung < 5; hitung += 1) cookies.push(await masuk());
		expect((await kirim("/api/admin/audit", { headers: { cookie: cookies[0] } })).status).toBe(401);
		expect((await kirim("/api/admin/audit", { headers: { cookie: cookies.at(-1) } })).status).toBe(200);
	});

	it("menutup login pada tahap Selesai dan menolak API Admin setelah sesi berakhir", async () => {
		await onboarding();
		const cookie = await masuk();
		await env.DB
			.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ?, "expiresAt" = ?')
			.bind("2027-01-27T16:59:00.000Z", "2027-01-27T16:59:00.000Z", "2027-01-28T16:59:00.000Z")
			.run();
		const selesai = new Date("2027-01-28T00:00:00.000Z");
		expect((await kirimPada(selesai, "/api/auth/sign-in/email", json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }))).status).toBe(403);
		expect((await kirimPada(selesai, "/api/admin/audit", { headers: { cookie } })).status).toBe(401);
	});
});
