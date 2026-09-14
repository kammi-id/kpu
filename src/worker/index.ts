import { Hono } from "hono";
import { catatAudit } from "./lib/audit";
import {
	ambilSesi,
	batasiLimaSesi,
	buatAuth,
	tokenSama,
	rahasiaTersedia,
	type EnvDenganRahasia,
} from "./lib/auth";
import { layananAktif, tahapPada } from "./lib/tahap";
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

/**
 * Fungsi pembuat Worker: seluruh penolakan server, spanduk, dan status tombol
 * bersumber dari `sekarang`. Ekspor default memakai jam nyata; uji menyuntikkan
 * jam tetap lewat fungsi ini alih-alih membaca `Date.now()` langsung.
 */
export function buatWorker(sekarang: () => Date = () => new Date()) {
	const app = new Hono<{ Bindings: EnvDenganRahasia }>();

	app.route("/api/tahap", buatRuteTahap(sekarang));

	app.all("/api/auth/*", async (c) => {
		if (!rahasiaTersedia(c.env)) return gagalTertutup();
		if (!JALUR_AUTH.has(new URL(c.req.url).pathname)) return c.notFound();

		const auth = buatAuth(c.env);
		const path = new URL(c.req.url).pathname;
		if (!layananAktif(tahapPada(sekarang())) && path === "/api/auth/sign-in/email") {
			await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, sekarang());
			return c.json({ error: "layanan_selesai" }, 403);
		}
		if (path === "/api/auth/get-session") {
			const sesi = await ambilSesi(auth, c.env, c.req.raw.headers, sekarang());
			if (!sesi) return c.json(null);
		}
		let response: Response;
		try {
			response = await auth.handler(c.req.raw);
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
				await catatAudit(c.env.DB, { aktor: "Anonim", tindakan: "login", hasil: "gagal" }, sekarang());
			}
		}
		return response;
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
