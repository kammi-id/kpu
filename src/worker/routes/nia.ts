import { Hono } from "hono";
import { hmacHex, ipDari, rahasiaTersedia, verifikasiTurnstile, type EnvDenganRahasia } from "../lib/auth";
import { verifikasiNia } from "../lib/nia";
import { pesanGalatVerifikasiNia } from "../lib/pesanGalatNia";

/** Ambang batas permintaan per IP dalam jendela `KEDALUWARSA_LAJU_NIA_MS`. */
export const BATAS_LAJU_NIA = 20;
const KEDALUWARSA_LAJU_NIA_MS = 24 * 60 * 60_000;

type PayloadCekNia = { nia: string };

function payloadCekNia(data: unknown): data is PayloadCekNia {
	if (!data || typeof data !== "object") return false;
	return typeof (data as Record<string, unknown>).nia === "string";
}

/**
 * Kunci laju khusus Cek NIA, namespace terpisah dari kunci percobaan login
 * ("email:…"/"ip:…") supaya IP yang sama tidak berbagi penghitung antara
 * dua fitur yang tidak berkaitan di tabel "percobaanLogin" yang dipakai ulang.
 */
async function kunciLajuNia(env: EnvDenganRahasia, request: Request) {
	const hash = await hmacHex(`nia-cek:ip:${ipDari(request)}`, env.HMAC_SECRET as string);
	return `nia-cek:ip:${hash}`;
}

async function lajuNiaTerlampaui(env: EnvDenganRahasia, kunci: string, sekarang: Date) {
	await env.DB.prepare('DELETE FROM "percobaanLogin" WHERE "kedaluwarsa" <= ?').bind(sekarang.toISOString()).run();
	const baris = await env.DB.prepare('SELECT "gagal" FROM "percobaanLogin" WHERE "kunci" = ?')
		.bind(kunci)
		.first<{ gagal: number }>();
	return (baris?.gagal ?? 0) >= BATAS_LAJU_NIA;
}

async function catatPermintaanNia(env: EnvDenganRahasia, kunci: string, sekarang: Date) {
	const kedaluwarsa = new Date(sekarang.getTime() + KEDALUWARSA_LAJU_NIA_MS).toISOString();
	await env.DB.prepare(
		`INSERT INTO "percobaanLogin" ("kunci", "gagal", "kedaluwarsa") VALUES (?, 1, ?)
		 ON CONFLICT("kunci") DO UPDATE SET "gagal" = "gagal" + 1, "kedaluwarsa" = excluded."kedaluwarsa"`,
	)
		.bind(kunci, kedaluwarsa)
		.run();
}

/**
 * Cek NIA (tiket 03): satu endpoint publik (tanpa sesi) supaya calon
 * pendaftar bisa mengecek NIA-nya sebelum mendaftar. Hanya memanggil ulang
 * `verifikasiNia` (tiket 02, satu-satunya sumber kebenaran, dipakai ulang
 * sama persis oleh penggerbangan pendaftaran akhir di tiket 04) dan
 * membalas hanya `nama` saat sukses — tidak pernah field mentah lain dari
 * kammi.id. Turnstile wajib pada SETIAP panggilan (bukan adaptif seperti
 * login), plus pembatas laju per-IP sebagai lapis pertahanan kedua karena
 * endpoint ini anonim dan berisiko dipakai untuk enumerasi data anggota.
 */
export function buatRuteNia(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.post("/cek", async (c) => {
		if (!rahasiaTersedia(c.env) || !c.env.KAMMI_ID_TOKEN) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const waktu = sekarang();
		const kunci = await kunciLajuNia(c.env, c.req.raw);
		if (await lajuNiaTerlampaui(c.env, kunci, waktu)) {
			return c.json({ error: "terlalu_banyak_permintaan" }, 429);
		}
		// Setiap panggilan yang lolos gerbang laju di atas dihitung di sini,
		// terlepas dari hasil di bawah (payload tidak valid, Turnstile gagal,
		// atau hasil verifikasi apa pun) — supaya percobaan berulang lewat
		// jalur mana pun tetap kena batas yang sama.
		await catatPermintaanNia(c.env, kunci, waktu);

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadCekNia(body)) return c.json({ error: "permintaan_tidak_valid" }, 400);

		const turnstileValid = await verifikasiTurnstile(c.req.header("x-captcha-response"), c.env, c.req.raw);
		if (!turnstileValid) return c.json({ error: "turnstile_tidak_valid", turnstileDiperlukan: true }, 403);

		const hasil = await verifikasiNia(body.nia, c.env);
		if (hasil.sukses) return c.json({ nama: hasil.nama });

		const { status, error } = pesanGalatVerifikasiNia(hasil.alasan);
		return c.json({ error }, status);
	});

	return route;
}
