import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";

export type RahasiaEnv = {
	BETTER_AUTH_SECRET?: string;
	HMAC_SECRET?: string;
	TURNSTILE_SECRET_KEY?: string;
	ONBOARD_TOKEN?: string;
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
		plugins: [admin({ defaultRole: "bacalon" })],
		rateLimit: { enabled: false },
		session: { expiresIn: 60 * 60 * 24, disableSessionRefresh: true },
		advanced: {
			useSecureCookies: true,
			defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "strict" },
			ipAddress: { disableIpTracking: true },
		},
	});
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
