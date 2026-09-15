import { Hono } from "hono";
import { catatAudit } from "./lib/audit";
import {
	ambilSesi,
	batasiLimaSesi,
	buatAuth,
	emailTernormalisasi,
	hmacHex,
	tokenSama,
	rahasiaTersedia,
	type EnvDenganRahasia,
	whatsappTernormalisasi,
} from "./lib/auth";
import { bolehRegistrasi, layananAktif, tahapPada } from "./lib/tahap";
import { buatRuteAdminBerkasPublik, buatRuteUnduhBerkasPublik } from "./routes/berkasPublik";
import { buatRuteAdminPeraturan, buatRutePeraturanPublik, buatRuteUnduhan } from "./routes/peraturan";
import { buatRuteTahap } from "./routes/tahap";

const JALUR_AUTH = new Set([
	"/api/auth/sign-up/email",
	"/api/auth/sign-in/email",
	"/api/auth/sign-out",
	"/api/auth/get-session",
]);

type PayloadOnboarding = { token: string; name: string; email: string; password: string };
type BarisAudit = {
	waktu: string;
	aktor: string;
	tindakan: string;
	sasaranUserId: string | null;
	sasaranBerkasId: string | null;
	hasil: string;
};

type PayloadRegistrasi = {
	name: string;
	email: string;
	whatsapp: string;
	password: string;
	persetujuan: boolean | string;
};

type PayloadLogin = { email: string; password: string };

let onboardingSebelumnya: Promise<void> = Promise.resolve();

async function serialkanOnboarding<T>(tugas: () => Promise<T>) {
	const sebelumnya = onboardingSebelumnya;
	let selesai: () => void = () => undefined;
	onboardingSebelumnya = new Promise((resolve) => {
		selesai = resolve;
	});
	await sebelumnya;
	try {
		return await tugas();
	} finally {
		selesai();
	}
}

function payloadOnboarding(data: unknown): data is PayloadOnboarding {
	if (!data || typeof data !== "object") return false;
	const payload = data as Record<string, unknown>;
	return ["token", "name", "email", "password"].every((kunci) => typeof payload[kunci] === "string");
}

function payloadRegistrasi(data: unknown): data is PayloadRegistrasi {
	if (!data || typeof data !== "object") return false;
	const payload = data as Record<string, unknown>;
	return ["name", "email", "whatsapp", "password"].every((kunci) => typeof payload[kunci] === "string") &&
		(typeof payload.persetujuan === "boolean" || typeof payload.persetujuan === "string");
}

function payloadLogin(data: unknown): data is PayloadLogin {
	if (!data || typeof data !== "object") return false;
	const payload = data as Record<string, unknown>;
	return typeof payload.email === "string" && typeof payload.password === "string";
}

function gagalTertutup() {
	return new Response(JSON.stringify({ error: "layanan_tidak_tersedia" }), {
		status: 503,
		headers: { "content-type": "application/json" },
	});
}

async function tokenDariRespons(response: Response) {
	const body: unknown = await response.clone().json().catch(() => null);
	if (!body || typeof body !== "object" || !("token" in body)) return undefined;
	return typeof body.token === "string" ? body.token : undefined;
}

async function penggunaDariRespons(response: Response) {
	const body: unknown = await response.clone().json().catch(() => null);
	if (!body || typeof body !== "object" || !("user" in body)) return undefined;
	const pengguna = body.user;
	return pengguna && typeof pengguna === "object" && "id" in pengguna && typeof pengguna.id === "string"
		? pengguna.id
		: undefined;
}

function requestJson(request: Request, body: Record<string, unknown>) {
	const headers = new Headers(request.headers);
	headers.set("content-type", "application/json");
	return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
}

function ipDari(request: Request) {
	return request.headers.get("cf-connecting-ip") ?? "tidak-diketahui";
}

async function kunciPercobaanLogin(env: EnvDenganRahasia, email: string, request: Request) {
	return Promise.all([
		hmacHex(`email:${email}`, env.HMAC_SECRET as string),
		hmacHex(`ip:${ipDari(request)}`, env.HMAC_SECRET as string),
	]).then(([emailHash, ipHash]) => [`email:${emailHash}`, `ip:${ipHash}`] as const);
}

async function perluTurnstile(env: EnvDenganRahasia, kunci: readonly string[], sekarang: Date) {
	await env.DB.prepare('DELETE FROM "percobaanLogin" WHERE "kedaluwarsa" <= ?').bind(sekarang.toISOString()).run();
	const hasil = await env.DB.prepare(
		`SELECT MAX("gagal") AS "gagal" FROM "percobaanLogin" WHERE "kunci" IN (?, ?)`,
	)
		.bind(kunci[0], kunci[1])
		.first<{ gagal: number | null }>();
	return (hasil?.gagal ?? 0) >= 3;
}

async function tambahKegagalanLogin(env: EnvDenganRahasia, kunci: readonly string[], sekarang: Date) {
	const kedaluwarsa = new Date(sekarang.getTime() + 24 * 60 * 60_000).toISOString();
	await env.DB.batch(
		kunci.map((item) =>
			env.DB
				.prepare(
					`INSERT INTO "percobaanLogin" ("kunci", "gagal", "kedaluwarsa") VALUES (?, 1, ?)
					 ON CONFLICT("kunci") DO UPDATE SET "gagal" = "gagal" + 1, "kedaluwarsa" = excluded."kedaluwarsa"`,
				)
				.bind(item, kedaluwarsa),
		),
	);
}

async function resetKegagalanLogin(env: EnvDenganRahasia, kunci: readonly string[]) {
	await env.DB.prepare('DELETE FROM "percobaanLogin" WHERE "kunci" IN (?, ?)').bind(kunci[0], kunci[1]).run();
}

async function verifikasiTurnstile(token: string | null | undefined, env: EnvDenganRahasia, request: Request) {
	if (!token || token.length > 2048) return false;
	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				secret: env.TURNSTILE_SECRET_KEY,
				response: token,
				remoteip: ipDari(request),
			}),
			signal: AbortSignal.timeout(10_000),
		});
		const hasil: unknown = await response.json();
		return response.ok && Boolean(hasil && typeof hasil === "object" && "success" in hasil && hasil.success);
	} catch {
		return false;
	}
}

async function responsDenganPenandaTurnstile(response: Response, wajib: boolean) {
	if (!wajib) return response;
	const body: unknown = await response.clone().json().catch(() => ({}));
	const headers = new Headers(response.headers);
	headers.set("content-type", "application/json");
	return new Response(JSON.stringify({ ...(body && typeof body === "object" ? body : {}), turnstileDiperlukan: true }), {
		status: response.status,
		headers,
	});
}

/**
 * Fungsi pembuat Worker: seluruh penolakan server, spanduk, dan status tombol
 * bersumber dari `sekarang`. Ekspor default memakai jam nyata; uji menyuntikkan
 * jam tetap lewat fungsi ini alih-alih membaca `Date.now()` langsung.
 */
export function buatWorker(sekarang: () => Date = () => new Date()) {
	const app = new Hono<{ Bindings: EnvDenganRahasia }>();

	app.route("/api/tahap", buatRuteTahap(sekarang));
	app.route("/api/peraturan", buatRutePeraturanPublik());
	app.route("/api/unduhan", buatRuteUnduhan());
	app.route("/api/berkas-publik", buatRuteUnduhBerkasPublik());
	app.route("/api/admin/peraturan", buatRuteAdminPeraturan(sekarang));
	app.route("/api/admin/berkas-publik", buatRuteAdminBerkasPublik(sekarang));
	app.get("/api/konfigurasi-publik", (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY }));

	app.all("/api/auth/*", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		if (!JALUR_AUTH.has(new URL(c.req.url).pathname)) return c.notFound();

		const path = new URL(c.req.url).pathname;
		const waktu = sekarang();
		if (path === "/api/auth/sign-up/email") {
			const body: unknown = await c.req.json().catch(() => null);
			if (!payloadRegistrasi(body)) {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				return c.json({ error: "permintaan_tidak_valid" }, 400);
			}
			const tahap = tahapPada(waktu);
			if (!bolehRegistrasi(tahap)) {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				return c.json({ error: "registrasi_tidak_diizinkan", tahap }, 403);
			}
			const whatsapp = whatsappTernormalisasi(body.whatsapp);
			if (!whatsapp || body.persetujuan !== true && body.persetujuan !== "true") {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				return c.json({ error: "registrasi_tidak_valid" }, 400);
			}
			let response: Response;
			try {
				response = await buatAuth(c.env).handler(
					requestJson(c.req.raw, {
						name: body.name,
						email: emailTernormalisasi(body.email),
						whatsapp,
						password: body.password,
					}),
				);
			} catch {
				// Mis. WhatsApp ganda menabrak UNIQUE di D1: Better Auth tidak
				// mengenal keunikan kolom aplikasi ini dan bisa melempar, bukan
				// menjawab JSON. Ditangkap di sini supaya tidak pernah 500.
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "gagal" }, waktu);
				return c.json({ error: "registrasi_gagal" }, 400);
			}
			const userId = await penggunaDariRespons(response);
			await catatAudit(
				c.env.DB,
				{ aktor: response.ok ? "Bakal Calon Ketua Umum" : "Anonim", tindakan: "registrasi", hasil: response.ok ? "berhasil" : "gagal", aktorUserId: userId },
				waktu,
			);
			return response;
		}

		const auth = buatAuth(c.env);
		if (!layananAktif(tahapPada(sekarang())) && path === "/api/auth/sign-in/email") {
			await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, sekarang());
			return c.json({ error: "layanan_selesai" }, 403);
		}
		if (path === "/api/auth/get-session") {
			const sesi = await ambilSesi(auth, c.env, c.req.raw.headers, sekarang());
			if (!sesi) return c.json(null);
		}
		let request = c.req.raw;
		let kunciLogin: readonly string[] | undefined;
		if (path === "/api/auth/sign-in/email") {
			const body: unknown = await c.req.json().catch(() => null);
			if (!payloadLogin(body)) {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, waktu);
				return c.json({ error: "kredensial_tidak_valid" }, 401);
			}
			const email = emailTernormalisasi(body.email);
			kunciLogin = await kunciPercobaanLogin(c.env, email, c.req.raw);
			if (await perluTurnstile(c.env, kunciLogin, waktu)) {
				const valid = await verifikasiTurnstile(c.req.header("x-captcha-response"), c.env, c.req.raw);
				if (!valid) {
					await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "ditolak" }, waktu);
					return c.json({ error: "turnstile_tidak_valid", turnstileDiperlukan: true }, 403);
				}
			}
			request = requestJson(c.req.raw, { email, password: body.password });
		}

		let response: Response;
		try {
			response = await auth.handler(request);
		} catch {
			if (path === "/api/auth/sign-in/email") {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, sekarang());
				return c.json({ error: "kredensial_tidak_valid" }, 401);
			}
			return c.json({ error: "permintaan_tidak_valid" }, 400);
		}
		if (path === "/api/auth/sign-in/email") {
			const token = await tokenDariRespons(response);
			const sesi = token
				? await c.env.DB.prepare('SELECT "id", "userId" FROM "session" WHERE "token" = ?')
						.bind(token)
						.first<{ id: string; userId: string }>()
				: null;
			if (response.ok && sesi) {
				const pengguna = await c.env.DB.prepare('SELECT "role" FROM "user" WHERE "id" = ?')
					.bind(sesi.userId)
					.first<{ role: string }>();
				await batasiLimaSesi(c.env, sesi.userId);
				if (kunciLogin) await resetKegagalanLogin(c.env, kunciLogin);
				await catatAudit(
					c.env.DB,
					{
						aktor: pengguna?.role === "admin" ? "Admin bersama" : "Bakal Calon Ketua Umum",
						tindakan: "login",
						hasil: "berhasil",
						sesiId: sesi.id,
						aktorUserId: sesi.userId,
					},
					sekarang(),
				);
			} else if (!response.ok) {
				if (kunciLogin) await tambahKegagalanLogin(c.env, kunciLogin, waktu);
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, sekarang());
				response = await responsDenganPenandaTurnstile(response, Boolean(kunciLogin && await perluTurnstile(c.env, kunciLogin, waktu)));
			}
		}
		return response;
	});

	// Sekadar gerbang sesi untuk shell /akun (tiket 10). `vKelengkapan` yang
	// sesungguhnya dan sidebar `x/10` dinamis adalah tiket 13; di sini sidebar
	// tetap statis "0/10" / "Belum lengkap" seperti kata tiket.
	app.get("/api/akun", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		// Tahap × kemampuan: "baca data sendiri" ditolak pada Selesai walau sesi masih hidup.
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);
		return c.json({ ok: true });
	});

	app.get("/api/akun/pengaturan", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);
		const pengguna = await c.env.DB.prepare(
			`SELECT "email", "whatsapp", "persetujuanVersi", "persetujuanPada" FROM "user" WHERE "id" = ?`,
		).bind(sesi.user.id).first();
		return c.json(pengguna);
	});

	app.post("/onboard", async (c) => serialkanOnboarding(async () => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		if (!layananAktif(tahapPada(sekarang()))) return c.notFound();
		const sudahAda = await c.env.DB.prepare('SELECT 1 FROM "user" WHERE "role" = ?').bind("admin").first();
		if (sudahAda || !c.env.ONBOARD_TOKEN) return c.notFound();

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadOnboarding(body) || body.password.length < 12 || !(await tokenSama(body.token, c.env.ONBOARD_TOKEN))) {
			return c.notFound();
		}

		try {
			const auth = buatAuth(c.env);
			const hasil = await auth.api.createUser({
				body: { name: body.name, email: body.email.trim(), password: body.password, role: "admin" },
			});
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", tindakan: "onboarding_admin", hasil: "berhasil", aktorUserId: hasil.user.id },
				sekarang(),
			);
			return c.json({ status: "dibuat" }, 201);
		} catch {
			return c.json({ error: "konflik" }, 409);
		}
	}));

	app.get("/onboard", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sudahAda = await c.env.DB.prepare('SELECT 1 FROM "user" WHERE "role" = ?').bind("admin").first();
		if (sudahAda || !c.env.ONBOARD_TOKEN || !layananAktif(tahapPada(sekarang()))) return c.notFound();
		return c.env.ASSETS.fetch(c.req.raw);
	});

	app.get("/api/admin/audit", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "admin") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const halaman = Math.max(Number(c.req.query("halaman") ?? "1") || 1, 1);
		const limit = 25;
		const audit = await c.env.DB.prepare(
			`SELECT "waktu", "aktor", "tindakan", "sasaranUserId", "sasaranBerkasId", "hasil"
			 FROM "audit" ORDER BY "waktu" DESC LIMIT ? OFFSET ?`,
		)
			.bind(limit, (halaman - 1) * limit)
			.all<BarisAudit>();
		return c.json({ halaman, adaBerikutnya: audit.results.length === limit, data: audit.results });
	});

	app.notFound((c) => c.json({ error: "tidak_ditemukan" }, 404));

	return {
		fetch: app.fetch,
		async scheduled(_controller: ScheduledController, _env: Env, _ctx: ExecutionContext) {
			// Ekspor Harian, Snapshot Pemeriksaan, dan Penghapusan Akhir: lihat tiket 16 dan 18.
		},
	};
}

export default buatWorker();
