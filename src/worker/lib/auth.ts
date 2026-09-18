import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
// Better Auth 1.7.4 does not export a dedicated captcha subpath.
import { captcha } from "better-auth/plugins";

export type RahasiaEnv = {
	BETTER_AUTH_SECRET?: string;
	HMAC_SECRET?: string;
	TURNSTILE_SECRET_KEY?: string;
	ONBOARD_TOKEN?: string;
	KAMMI_ID_TOKEN?: string;
};

export type EnvDenganRahasia = Env & RahasiaEnv;

export function rahasiaTersedia(env: EnvDenganRahasia) {
	return Boolean(env.BETTER_AUTH_SECRET && env.HMAC_SECRET && env.TURNSTILE_SECRET_KEY);
}

export function buatAuth(env: EnvDenganRahasia) {
	if (!rahasiaTersedia(env)) throw new Error("Rahasia autentikasi belum lengkap");

	return betterAuth({
		database: env.DB,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		emailAndPassword: { enabled: true, minPasswordLength: 8 },
		user: {
			additionalFields: {
				whatsapp: { type: "string", required: false, returned: false },
				// input: false tanpa defaultValue: mengisi lewat databaseHooks di
				// bawah, bukan lewat defaultValue, karena defaultValue berlaku untuk
				// SETIAP pembuatan user (termasuk Admin onboarding via
				// auth.api.createUser) dan Admin tidak boleh punya data persetujuan.
				persetujuanVersi: { type: "string", input: false, returned: false },
				persetujuanPada: { type: "date", input: false, returned: false },
				// Sama seperti whatsapp: input dari body permintaan, tapi nilainya
				// sudah dipaksa berasal dari verifikasiNia (bukan mentah dari klien)
				// di requestJson pada index.ts sebelum mencapai sini.
				nia: { type: "string", required: false, returned: false },
			},
		},
		databaseHooks: {
			user: {
				create: {
					// Berjalan setelah hook peran plugin Admin (plugin didaftar lebih
					// dulu di array `plugins`, jadi hook-nya lebih dulu dalam rantai),
					// sehingga `user.role` di sini sudah final: 'bacalon' (default) atau
					// 'admin' (onboarding). Hanya Bakal Calon yang mendapat persetujuan.
					// Better Auth belum menginferensi tipe additionalFields plugin lain
					// (mis. `role` dari plugin Admin) di parameter hook ini, jadi diakses
					// lewat cast aman alih-alih anotasi tipe yang bentrok dengan bawaan.
					before: async (user: Record<string, unknown>) => {
						if (user.role !== "bacalon") return;
						return {
							data: { persetujuanVersi: "persetujuan-v1", persetujuanPada: new Date() },
						};
					},
				},
			},
		},
		plugins: [
			admin({ defaultRole: "bacalon" }),
			captcha({
				provider: "cloudflare-turnstile",
				secretKey: env.TURNSTILE_SECRET_KEY as string,
				endpoints: ["/sign-up/email"],
			}),
		],
		rateLimit: { enabled: false },
		session: { expiresIn: 60 * 60 * 24, disableSessionRefresh: true },
		advanced: {
			useSecureCookies: true,
			defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "strict" },
			ipAddress: { disableIpTracking: true },
		},
	});
}

export function emailTernormalisasi(email: string) {
	return email.trim().toLowerCase();
}

/**
 * `08…`, `+62…`, dan `62…` diterima; hasil selalu `62` diikuti digit
 * (menyamai CHECK kolom `whatsapp` di migrasi). Format lain atau panjang
 * tidak wajar ditolak (null) sebelum sempat memicu galat CHECK di D1.
 */
export function whatsappTernormalisasi(whatsapp: string): string | null {
	const digit = whatsapp.replaceAll(/[^0-9]/g, "");
	let ternormalisasi: string | null = null;
	if (digit.startsWith("08")) ternormalisasi = `62${digit.slice(1)}`;
	else if (digit.startsWith("62")) ternormalisasi = digit;
	return ternormalisasi && /^62[1-9][0-9]{6,12}$/.test(ternormalisasi) ? ternormalisasi : null;
}

export function ipDari(request: Request) {
	return request.headers.get("cf-connecting-ip") ?? "tidak-diketahui";
}

/**
 * Verifikasi token Turnstile langsung ke Cloudflare siteverify (bukan lewat
 * plugin captcha Better Auth) — dipakai untuk rute di luar `auth.handler`
 * (login setelah tiga kegagalan, dan endpoint Cek NIA tiket 03) yang butuh
 * Turnstile tanpa melalui Better Auth.
 */
export async function verifikasiTurnstile(token: string | null | undefined, env: EnvDenganRahasia, request: Request) {
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

export async function hmacHex(teks: string, rahasia: string) {
	const encoder = new TextEncoder();
	const kunci = await crypto.subtle.importKey(
		"raw",
		encoder.encode(rahasia),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", kunci, encoder.encode(teks));
	return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function tokenSama(token: string, rahasia: string) {
	const encoder = new TextEncoder();
	const [hashToken, hashRahasia] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(token)),
		crypto.subtle.digest("SHA-256", encoder.encode(rahasia)),
	]);
	return crypto.subtle.timingSafeEqual(hashToken, hashRahasia);
}

export type SesiAutentikasi = {
	session: { id: string; createdAt: Date; updatedAt: Date };
	user: { id: string; role: string };
};

export async function ambilSesi(
	auth: ReturnType<typeof buatAuth>,
	env: EnvDenganRahasia,
	headers: Headers,
	sekarang: Date,
): Promise<SesiAutentikasi | null> {
	const sesi = await auth.api.getSession({ headers });
	if (!sesi) return null;
	const peran = sesi.user.role ?? "bacalon";

	const batasTidakAktif = peran === "admin" ? 30 * 60_000 : 2 * 60 * 60_000;
	const batasAbsolut = peran === "admin" ? 8 * 60 * 60_000 : 24 * 60 * 60_000;
	if (
		sekarang.getTime() - sesi.session.updatedAt.getTime() > batasTidakAktif ||
		sekarang.getTime() - sesi.session.createdAt.getTime() > batasAbsolut
	) {
		await env.DB.prepare('DELETE FROM "session" WHERE "id" = ?').bind(sesi.session.id).run();
		return null;
	}

	await env.DB.prepare('UPDATE "session" SET "updatedAt" = ? WHERE "id" = ?')
		.bind(sekarang.toISOString(), sesi.session.id)
		.run();
	return {
		session: { id: sesi.session.id, createdAt: sesi.session.createdAt, updatedAt: sesi.session.updatedAt },
		user: { id: sesi.user.id, role: peran },
	};
}

export async function batasiLimaSesi(env: EnvDenganRahasia, userId: string) {
	const sesi = await env.DB.prepare(
		'SELECT "id" FROM "session" WHERE "userId" = ? ORDER BY "createdAt" DESC',
	)
		.bind(userId)
		.all<{ id: string }>();
	await Promise.all(
		sesi.results.slice(5).map(({ id }) =>
			env.DB.prepare('DELETE FROM "session" WHERE "id" = ?').bind(id).run(),
		),
	);
}
