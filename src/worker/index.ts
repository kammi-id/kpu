import { Hono } from "hono";
import { catatAudit, pernyataanAudit } from "./lib/audit";
import { ekstraksiA1 as ekstraksiA1Asli } from "./lib/ekstraksiA1";
import { buatEksporHarian } from "./lib/ekspor";
import { payloadKataSandi } from "./lib/konfirmasiAdmin";
import { jalankanPenghapusanAkhir } from "./lib/penghapusanAkhir";
import {
	ambilSesi,
	batasiLimaSesi,
	buatAuth,
	emailTernormalisasi,
	hmacHex,
	ipDari,
	tokenSama,
	rahasiaTersedia,
	type EnvDenganRahasia,
	verifikasiTurnstile,
	whatsappTernormalisasi,
} from "./lib/auth";
import { verifikasiNia } from "./lib/nia";
import { bolehRegistrasi, layananAktif, tahapPada } from "./lib/tahap";
import { pendaftaranDitutupManual } from "./lib/pengaturan";
import { teksSatuBarisValid } from "./lib/profil";
import { ambilKelengkapan } from "./lib/kelengkapan";
import { jatuhKeCangkang } from "./lib/cangkang";
import { cangkangDenganPramuat } from "./lib/pramuatRute";
import { buatRuteAkunBerkas } from "./routes/akunBerkas";
import { buatRuteAdminBacalon } from "./routes/adminBacalon";
import { buatRuteAkunData } from "./routes/akunData";
import { buatRuteAdminBerkasPublik, buatRuteUnduhBerkasPublik } from "./routes/berkasPublik";
import { buatRuteNia } from "./routes/nia";
import { buatRuteStruktur } from "./routes/struktur";
import { buatRutePengaturanAdmin } from "./routes/pengaturanAdmin";
import { buatRutePeraturanPublik, buatRuteUnduhan } from "./routes/peraturan";
import { buatRuteTahap } from "./routes/tahap";
import { buatRuteMetaHalaman } from "./routes/metaHalaman";
import { pesanGalatVerifikasiNia } from "./lib/pesanGalatNia";

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
	nia: string;
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
	return ["name", "email", "whatsapp", "password", "nia"].every((kunci) => typeof payload[kunci] === "string") &&
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
export function buatWorker(sekarang: () => Date = () => new Date(), ekstraksiA1: typeof ekstraksiA1Asli = ekstraksiA1Asli) {
	const app = new Hono<{ Bindings: EnvDenganRahasia }>();

	// Default aman untuk setiap jawaban yang dibuat Worker (JSON API, unduhan berkas
	// pribadi, 404): jangan disimpan cache mana pun. `_headers` tidak berlaku untuk
	// jawaban Worker, jadi tanpa ini yang tersisa hanya heuristik peramban. Rute yang
	// memang boleh di-cache (cangkang SPA, halaman meta, struktur, unduhan publik)
	// menetapkan `cache-control` sendiri dan tidak ditimpa.
	app.use("*", async (c, next) => {
		await next();
		if (c.res.headers.has("cache-control")) return;
		const headers = new Headers(c.res.headers);
		headers.set("cache-control", "no-store");
		c.res = new Response(c.res.body, { status: c.res.status, statusText: c.res.statusText, headers });
	});

	app.route("/api/tahap", buatRuteTahap(sekarang));
	app.route("/api/peraturan", buatRutePeraturanPublik(sekarang));
	app.route("/api/unduhan", buatRuteUnduhan(sekarang));
	app.route("/api/berkas-publik", buatRuteUnduhBerkasPublik(sekarang));
	app.route("/api/akun/data", buatRuteAkunData(sekarang, ekstraksiA1));
	app.route("/api/admin/berkas-publik", buatRuteAdminBerkasPublik(sekarang));
	app.route("/api/akun/berkas", buatRuteAkunBerkas(sekarang));
	app.route("/api/nia", buatRuteNia(sekarang));
	app.route("/api/struktur", buatRuteStruktur());
	app.route("/", buatRuteMetaHalaman());
	app.get("/api/konfigurasi-publik", async (c) => {
		const onboardTersedia =
			rahasiaTersedia(c.env) &&
			Boolean(c.env.ONBOARD_TOKEN) &&
			layananAktif(tahapPada(sekarang())) &&
			!(await c.env.DB.prepare('SELECT 1 FROM "user" WHERE "role" = ?').bind("admin").first());
		return c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY, onboardTersedia });
	});

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
			if (!bolehRegistrasi(tahap) || (await pendaftaranDitutupManual(c.env.DB))) {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				return c.json({ error: "registrasi_tidak_diizinkan", tahap }, 403);
			}
			const whatsapp = whatsappTernormalisasi(body.whatsapp);
			// name juga berakhir di CSV Ekspor Harian (lib/ekspor.ts): karakter
			// kontrol (CR/LF) di tengahnya memecah baris CSV — lihat teksSatuBarisValid.
			if (!whatsapp || !teksSatuBarisValid(body.name) || body.persetujuan !== true && body.persetujuan !== "true") {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				return c.json({ error: "registrasi_tidak_valid" }, 400);
			}
			// Penggerbangan NIA (tiket 04, ADR 0001): verifikasi PENUH dijalankan
			// ulang di sini, independen dari pengecekan interaktif "Cek NIA"
			// (tiket 03) — memanggil endpoint itu saja tidak cukup untuk lolos,
			// karena submit langsung ke sign-up/email tanpa lewatnya harus tetap
			// digerbangi. "name" yang dipakai di bawah SENGAJA berasal dari hasil
			// verifikasi ini (kammi.id), bukan dari body.name milik klien.
			const verifikasi = await verifikasiNia(body.nia, c.env);
			if (!verifikasi.sukses) {
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "registrasi", hasil: "ditolak" }, waktu);
				const { status, error } = pesanGalatVerifikasiNia(verifikasi.alasan);
				return c.json({ error }, status);
			}
			let response: Response;
			try {
				response = await buatAuth(c.env).handler(
					requestJson(c.req.raw, {
						name: verifikasi.nama,
						email: emailTernormalisasi(body.email),
						whatsapp,
						password: body.password,
						nia: body.nia,
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

	// Gerbang sesi untuk shell /akun, plus Status Kelengkapan Berkas (tiket 13):
	// sidebar, /akun, dan /akun/berkas membaca `jumlahHadir`/`lengkap` dari sini,
	// semuanya bersumber dari `vKelengkapan` (satu-satunya sumber, tak ada
	// perhitungan kedua di TypeScript).
	app.get("/api/akun", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		// Tahap × kemampuan: "baca data sendiri" ditolak pada Selesai walau sesi masih hidup.
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);
		const kelengkapan = await ambilKelengkapan(c.env.DB, sesi.user.id);
		return c.json({ ok: true, jumlahHadir: kelengkapan?.jumlahHadir ?? 0, lengkap: Boolean(kelengkapan?.lengkap) });
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

	// Permintaan Penutupan Akun (tiket 17): tidak memakai konfirmasiKataSandiAdmin
	// (itu khusus aksi Admin dengan penghitung bersama) — di sini kata sandi milik
	// Bakal Calon sendiri diverifikasi langsung, tanpa penghitung kegagalan.
	app.post("/api/akun/pengaturan/penutupan", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		const waktu = sekarang();
		if (!layananAktif(tahapPada(waktu))) return c.json({ error: "layanan_selesai" }, 403);

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadKataSandi(body)) return c.json({ error: "permintaan_tidak_valid" }, 400);

		try {
			await buatAuth(c.env).api.verifyPassword({ headers: c.req.raw.headers, body: { password: body.password } });
		} catch {
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "penutupan_akun", hasil: "gagal", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				waktu,
			);
			return c.json({ error: "kata_sandi_salah" }, 401);
		}

		await c.env.DB.batch([
			c.env.DB.prepare(`UPDATE "user" SET "banned" = 1, "banReason" = 'penutupan_akun' WHERE "id" = ?`).bind(sesi.user.id),
			c.env.DB.prepare('DELETE FROM "session" WHERE "userId" = ?').bind(sesi.user.id),
			pernyataanAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "penutupan_akun", hasil: "berhasil", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				waktu,
			),
		]);

		return c.json({ status: "diajukan" });
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
		return cangkangDenganPramuat(c.env.ASSETS, c.req.raw);
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

	app.route("/api/admin/pengaturan", buatRutePengaturanAdmin(sekarang));

	// Rute statis Admin harus didaftarkan dahulu; detail tiket 14 memakai /:id.
	app.route("/api/admin", buatRuteAdminBacalon(sekarang));

	// Rute SPA (mis. /masuk, /akun/berkas) mendarat di sini karena not_found_handling
	// "none"; berkas statis yang hilang (/assets/*.js, /logo.png) tetap 404 sungguhan.
	// Sengaja rute biasa, bukan app.notFound: gerbang seperti GET /onboard memakai
	// c.notFound() untuk menyembunyikan halamannya, dan itu harus tetap 404 JSON.
	app.get("*", (c) => {
		if (jatuhKeCangkang(c.req.method, new URL(c.req.url).pathname)) return cangkangDenganPramuat(c.env.ASSETS, c.req.raw);
		return c.notFound();
	});

	app.notFound((c) => c.json({ error: "tidak_ditemukan" }, 404));

	return {
		fetch: app.fetch,
		// Ekspor Harian, Snapshot Pemeriksaan, dan Penghapusan Akhir: lihat tiket 16 dan 18.
		// `scheduledTime` controller dipakai sebagai "sekarang", bukan `sekarang()` yang
		// disuntikkan di atas untuk fetch/uji — spec mewajibkan waktu cron sendiri supaya
		// uji dapat memilih `scheduledTime` lewat seam Worker tanpa memengaruhi jam fetch.
		async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
			const waktu = new Date(controller.scheduledTime);
			if (tahapPada(waktu) === "Selesai") {
				await jalankanPenghapusanAkhir(env, waktu);
			} else {
				await buatEksporHarian(env, waktu);
			}
		},
	};
}

export default buatWorker();
