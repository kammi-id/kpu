import { Hono } from "hono";
import { headerUnduh } from "./akunBerkas";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { kunciCsvBacalon, kunciZipAkun, type KategoriEkspor } from "../lib/ekspor";
import { layananAktif, tahapPada } from "../lib/tahap";

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

function kategoriEkspor(nilai: string): KategoriEkspor | null {
	return nilai === "terkini" || nilai === "pemeriksaan" ? nilai : null;
}

async function adminAtauTolak(c: { env: EnvDenganRahasia; req: { raw: Request }; json: (data: unknown, status?: 401 | 403) => Response }, sekarang: () => Date) {
	if (!rahasiaTersedia(c.env)) return { response: c.json({ error: "layanan_tidak_tersedia" }, 403) };
	const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
	if (!sesi || sesi.user.role !== "admin") return { response: c.json({ error: "tidak_berwenang" }, 401) };
	const tahap = tahapPada(sekarang());
	if (!layananAktif(tahap)) return { response: c.json({ error: "tahap_tertutup", tahap }, 403) };
	return { sesi };
}

/**
 * Satu bentuk unduhan dipakai oleh kedua rute /ekspor di bawah (tiket 16): baca
 * objek R2, 404 "belum_tersedia" bila belum ada, catat audit `ekspor`, lalu alirkan
 * sebagai attachment + nosniff — sama seperti pola unduhan berkas di bawahnya.
 */
async function unduhEkspor(
	c: { env: EnvDenganRahasia; json: (data: unknown, status?: 404) => Response },
	sesi: { session: { id: string }; user: { id: string } },
	sekarang: () => Date,
	opsi: { kunci: string; namaBerkas: string; tipeBawaan: string; sasaranUserId?: string },
) {
	const objek = await c.env.BERKAS.get(opsi.kunci);
	if (!objek) return c.json({ error: "belum_tersedia" }, 404);
	await catatAudit(
		c.env.DB,
		{ aktor: "Admin bersama", tindakan: "ekspor", hasil: "berhasil", sesiId: sesi.session.id, aktorUserId: sesi.user.id, sasaranUserId: opsi.sasaranUserId },
		sekarang(),
	);
	return new Response(objek.body, {
		headers: {
			"content-type": objek.httpMetadata?.contentType ?? opsi.tipeBawaan,
			"content-disposition": headerUnduh(opsi.namaBerkas),
			"x-content-type-options": "nosniff",
		},
	});
}

/** Tabel, detail, dan unduh khusus Admin (tiket 14). */
export function buatRuteAdminBacalon(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	// Rute /ekspor literal harus didaftarkan sebelum /:id di bawah, atau Hono akan
	// memperlakukan "ekspor" sebagai nilai :id dan menelan permintaan ini (tiket 16).
	route.get("/ekspor/:kategori", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const kategori = kategoriEkspor(c.req.param("kategori"));
		if (!kategori) return c.notFound();
		return unduhEkspor(c, akses.sesi, sekarang, {
			kunci: kunciCsvBacalon(kategori),
			namaBerkas: `bacalon-${kategori}.csv`,
			tipeBawaan: "text/csv; charset=utf-8",
		});
	});

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

	route.get("/:id/ekspor/:kategori", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const kategori = kategoriEkspor(c.req.param("kategori"));
		if (!kategori) return c.notFound();
		const id = c.req.param("id");
		return unduhEkspor(c, akses.sesi, sekarang, {
			kunci: kunciZipAkun(kategori, id),
			namaBerkas: `${id}-${kategori}.zip`,
			tipeBawaan: "application/zip",
			sasaranUserId: id,
		});
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
