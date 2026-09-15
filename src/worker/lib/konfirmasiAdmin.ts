import { buatAuth, hmacHex, type EnvDenganRahasia, type SesiAutentikasi } from "./auth";

const MASA_BERLAKU_KONFIRMASI_MS = 24 * 60 * 60_000;

/** Bentuk payload bersama tiap rute yang meminta konfirmasi kata sandi (Admin atau Bakal Calon sendiri). */
export function payloadKataSandi(data: unknown): data is { password: string } {
	return Boolean(data && typeof data === "object" && typeof (data as Record<string, unknown>).password === "string");
}

/**
 * Mengonfirmasi kata sandi Admin bersama untuk aksi yang mengubah data secara
 * permanen. Tiket 17 memakai batas yang sama agar sebuah sesi tidak dapat
 * mencoba kata sandi tanpa henti di setiap aksi.
 */
export async function konfirmasiKataSandiAdmin(
	auth: ReturnType<typeof buatAuth>,
	env: EnvDenganRahasia,
	sesi: SesiAutentikasi,
	headers: Headers,
	password: string,
	sekarang: Date,
) {
	const kunci = `konfirmasi:${await hmacHex(sesi.session.id, env.HMAC_SECRET as string)}`;
	await env.DB.prepare('DELETE FROM "percobaanLogin" WHERE "kunci" = ? AND "kedaluwarsa" <= ?')
		.bind(kunci, sekarang.toISOString())
		.run();

	try {
		await auth.api.verifyPassword({ headers, body: { password } });
	} catch {
		const kedaluwarsa = new Date(sekarang.getTime() + MASA_BERLAKU_KONFIRMASI_MS).toISOString();
		const kegagalan = await env.DB
			.prepare(
				`INSERT INTO "percobaanLogin" ("kunci", "gagal", "kedaluwarsa") VALUES (?, 1, ?)
				 ON CONFLICT("kunci") DO UPDATE SET "gagal" = "gagal" + 1, "kedaluwarsa" = excluded."kedaluwarsa"
				 RETURNING "gagal"`,
			)
			.bind(kunci, kedaluwarsa)
			.first<{ gagal: number }>();
		if ((kegagalan?.gagal ?? 0) >= 5) {
			await env.DB.prepare('DELETE FROM "session" WHERE "id" = ?').bind(sesi.session.id).run();
		}
		return false;
	}

	await env.DB.prepare('DELETE FROM "percobaanLogin" WHERE "kunci" = ?').bind(kunci).run();
	return true;
}
