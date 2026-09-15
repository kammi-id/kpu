import { Hono } from "hono";
import { catatAudit } from "../lib/audit";
import { headerUnduh } from "./akunBerkas";
import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { konfirmasiKataSandiAdmin } from "../lib/konfirmasiAdmin";
import { layananAktif, tahapPada } from "../lib/tahap";

const ALFABET_KATA_SANDI_SEMENTARA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const BATAS_ACAK_TANPA_BIAS = 256 - (256 % ALFABET_KATA_SANDI_SEMENTARA.length);

type BarisTabel = {
	id: string;
	name: string;
	whatsapp: string;
	dibuatPada: string;
	jumlahHadir: number;
	lengkap: number;
};

type BarisDetail = {
	id: string;
	name: string;
	email: string;
	whatsapp: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPd: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	instruktur: number | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
	jumlahHadir: number;
	lengkap: number;
};

type BarisBerkas = {
	id: string;
	userId: string;
	kelompok: number;
	r2Key: string;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
	jenisRekomendasi: string | null;
	diunggahPada: string;
};

function payloadKonfirmasiKataSandi(data: unknown): data is { password: string } {
	return Boolean(data && typeof data === "object" && typeof (data as Record<string, unknown>).password === "string");
}

function kataSandiSementara() {
	let hasil = "";
	while (hasil.length < 16) {
		const angkaAcak = crypto.getRandomValues(new Uint8Array(32));
		for (const angka of angkaAcak) {
			if (angka >= BATAS_ACAK_TANPA_BIAS) continue;
			hasil += ALFABET_KATA_SANDI_SEMENTARA[angka % ALFABET_KATA_SANDI_SEMENTARA.length];
			if (hasil.length === 16) return hasil;
		}
	}
	return hasil;
}

async function adminAtauTolak(c: { env: EnvDenganRahasia; req: { raw: Request }; json: (data: unknown, status?: 401 | 403) => Response }, sekarang: () => Date) {
	if (!rahasiaTersedia(c.env)) return { response: c.json({ error: "layanan_tidak_tersedia" }, 403) };
	const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
	if (!sesi || sesi.user.role !== "admin") return { response: c.json({ error: "tidak_berwenang" }, 401) };
	const tahap = tahapPada(sekarang());
	if (!layananAktif(tahap)) return { response: c.json({ error: "tahap_tertutup", tahap }, 403) };
	return { sesi };
}

/** Tabel, detail, dan unduh khusus Admin (tiket 14). */
export function buatRuteAdminBacalon(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const query = c.req.query("q")?.trim() ?? "";
		const daftar = await c.env.DB.prepare(
			`SELECT u."id", u."name", u."whatsapp", u."createdAt" AS "dibuatPada", v."jumlahHadir", v."lengkap"
			 FROM "user" u JOIN "vKelengkapan" v ON v."userId" = u."id"
			 WHERE u."role" = 'bacalon' AND u."name" LIKE '%' || ? || '%' COLLATE NOCASE
			 ORDER BY u."createdAt" DESC`,
		)
			.bind(query)
			.all<BarisTabel>();
		return c.json({ data: daftar.results.map((baris) => ({ ...baris, lengkap: Boolean(baris.lengkap) })) });
	});

	route.get("/:id", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const id = c.req.param("id");
		const detail = await c.env.DB.prepare(
			`SELECT u."id", u."name", u."email", u."whatsapp", p."namaPanggilan", p."tempatLahir", p."tanggalLahir", p."asalPw", p."asalPd",
			        p."tahunLulusDm3", p."tempatLulusDm3", p."instruktur", p."capaianHafalan", p."bahasaAsing", v."jumlahHadir", v."lengkap"
			 FROM "user" u JOIN "vKelengkapan" v ON v."userId" = u."id" LEFT JOIN "profil" p ON p."userId" = u."id"
			 WHERE u."id" = ? AND u."role" = 'bacalon'`,
		)
			.bind(id)
			.first<BarisDetail>();
		if (!detail) return c.json({ error: "tidak_ditemukan" }, 404);
		const berkas = await c.env.DB.prepare(
			`SELECT "id", "userId", "kelompok", "r2Key", "namaAsli", "mime", "ukuranByte", "jenisRekomendasi", "diunggahPada"
			 FROM "berkas" WHERE "userId" = ? ORDER BY "kelompok", "diunggahPada"`,
		)
			.bind(id)
			.all<BarisBerkas>();
		return c.json({
			...detail,
			instruktur: detail.instruktur === null ? null : Boolean(detail.instruktur),
			lengkap: Boolean(detail.lengkap),
			berkas: berkas.results.map(({ r2Key: _r2Key, userId: _userId, ...item }) => item),
		});
	});

	route.post("/:id/reset-password", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const sasaranUserId = c.req.param("id");
		const sasaran = await c.env.DB.prepare('SELECT "id" FROM "user" WHERE "id" = ? AND "role" = ?')
			.bind(sasaranUserId, "bacalon")
			.first<{ id: string }>();
		if (!sasaran) return c.json({ error: "tidak_ditemukan" }, 404);

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadKonfirmasiKataSandi(body)) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "reset_kata_sandi", sasaranUserId, hasil: "gagal" },
				sekarang(),
			);
			return c.json({ error: "permintaan_tidak_valid" }, 400);
		}

		const auth = buatAuth(c.env);
		const waktu = sekarang();
		if (!(await konfirmasiKataSandiAdmin(auth, c.env, akses.sesi, c.req.raw.headers, body.password, waktu))) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "reset_kata_sandi", sasaranUserId, hasil: "gagal" },
				waktu,
			);
			return c.json({ error: "konfirmasi_kata_sandi_gagal" }, 401);
		}

		const password = kataSandiSementara();
		try {
			await auth.api.setUserPassword({ headers: c.req.raw.headers, body: { userId: sasaran.id, newPassword: password } });
			await auth.api.revokeUserSessions({ headers: c.req.raw.headers, body: { userId: sasaran.id } });
		} catch {
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "reset_kata_sandi", sasaranUserId, hasil: "gagal" },
				waktu,
			);
			return c.json({ error: "reset_kata_sandi_gagal" }, 500);
		}

		await catatAudit(
			c.env.DB,
			{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "reset_kata_sandi", sasaranUserId, hasil: "berhasil" },
			waktu,
		);
		return c.json({ password });
	});

	route.get("/:userId/berkas/:id/unduh", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const baris = await c.env.DB.prepare(
			`SELECT b."id", b."userId", b."kelompok", b."r2Key", b."namaAsli", b."mime", b."ukuranByte", b."jenisRekomendasi", b."diunggahPada"
			 FROM "berkas" b JOIN "user" u ON u."id" = b."userId"
			 WHERE b."id" = ? AND b."userId" = ? AND u."role" = 'bacalon'`,
		)
			.bind(c.req.param("id"), c.req.param("userId"))
			.first<BarisBerkas>();
		if (!baris) return c.json({ error: "tidak_ditemukan" }, 404);
		const objek = await c.env.BERKAS.get(baris.r2Key);
		if (!objek) return c.json({ error: "tidak_ditemukan" }, 404);
		return new Response(objek.body, {
			headers: {
				"content-type": baris.mime,
				"content-disposition": headerUnduh(baris.namaAsli),
				"x-content-type-options": "nosniff",
			},
		});
	});

	return route;
}
