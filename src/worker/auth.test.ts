import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "./index";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;

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

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
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
			.bind("2027-01-24T16:59:00.000Z", "2027-01-24T16:59:00.000Z", "2027-01-25T16:59:00.000Z")
			.run();
		const selesai = new Date("2027-01-25T00:00:00.000Z");
		expect((await kirimPada(selesai, "/api/auth/sign-in/email", json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }))).status).toBe(403);
		expect((await kirimPada(selesai, "/api/admin/audit", { headers: { cookie } })).status).toBe(401);
	});
});
