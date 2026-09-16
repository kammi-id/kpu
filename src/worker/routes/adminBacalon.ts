import { Hono } from "hono";
import { adminAtauTolak } from "../lib/aksesAdmin";
import { catatAudit, pernyataanAudit } from "../lib/audit";
import { headerUnduh } from "./akunBerkas";
import { buatAuth, type EnvDenganRahasia } from "../lib/auth";
import { hapusBarisCsvBacalon, KOLOM_MINTA_DITUTUP, kunciCsvBacalon, kunciZipAkun, type KategoriEkspor } from "../lib/ekspor";
import { konfirmasiKataSandiAdmin, payloadKataSandi } from "../lib/konfirmasiAdmin";

const ALFABET_KATA_SANDI_SEMENTARA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const BATAS_ACAK_TANPA_BIAS = 256 - (256 % ALFABET_KATA_SANDI_SEMENTARA.length);

type BarisTabel = {
	id: string;
	name: string;
	whatsapp: string;
	dibuatPada: string;
	jumlahHadir: number;
	lengkap: number;
	mintaDitutup: number;
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
	mintaDitutup: number;
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

function kategoriEkspor(nilai: string): KategoriEkspor | null {
	return nilai === "terkini" || nilai === "pemeriksaan" ? nilai : null;
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
			`SELECT u."id", u."name", u."whatsapp", u."createdAt" AS "dibuatPada", v."jumlahHadir", v."lengkap", ${KOLOM_MINTA_DITUTUP}
			 FROM "user" u JOIN "vKelengkapan" v ON v."userId" = u."id"
			 WHERE u."role" = 'bacalon' AND u."name" LIKE '%' || ? || '%' COLLATE NOCASE
			 ORDER BY u."createdAt" DESC`,
		)
			.bind(query)
			.all<BarisTabel>();
		return c.json({
			data: daftar.results.map((baris) => ({ ...baris, lengkap: Boolean(baris.lengkap), mintaDitutup: Boolean(baris.mintaDitutup) })),
		});
	});

	route.get("/:id", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const id = c.req.param("id");
		const detail = await c.env.DB.prepare(
			`SELECT u."id", u."name", u."email", u."whatsapp", p."namaPanggilan", p."tempatLahir", p."tanggalLahir", p."asalPw", p."asalPd",
			        p."tahunLulusDm3", p."tempatLulusDm3", p."instruktur", p."capaianHafalan", p."bahasaAsing", v."jumlahHadir", v."lengkap", ${KOLOM_MINTA_DITUTUP}
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
			mintaDitutup: Boolean(detail.mintaDitutup),
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
		if (!payloadKataSandi(body)) {
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

	// Hapus data akun (tiket 17): hanya untuk akun berpenanda Minta ditutup, dengan
	// konfirmasi kata sandi Admin yang sama (dan penghitung kegagalan yang sama)
	// dengan Reset Password di atas.
	route.post("/:id/hapus-data", async (c) => {
		const akses = await adminAtauTolak(c, sekarang);
		if ("response" in akses) return akses.response;
		const sasaranUserId = c.req.param("id");
		const sasaran = await c.env.DB.prepare(
			`SELECT "id" FROM "user" WHERE "id" = ? AND "role" = 'bacalon' AND "banned" = 1 AND "banReason" = 'penutupan_akun'`,
		)
			.bind(sasaranUserId)
			.first<{ id: string }>();
		if (!sasaran) return c.json({ error: "tidak_ditemukan" }, 404);

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadKataSandi(body)) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "hapus_data", sasaranUserId, hasil: "gagal" },
				sekarang(),
			);
			return c.json({ error: "permintaan_tidak_valid" }, 400);
		}

		const auth = buatAuth(c.env);
		const waktu = sekarang();
		if (!(await konfirmasiKataSandiAdmin(auth, c.env, akses.sesi, c.req.raw.headers, body.password, waktu))) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "hapus_data", sasaranUserId, hasil: "gagal" },
				waktu,
			);
			return c.json({ error: "konfirmasi_kata_sandi_gagal" }, 401);
		}

		// r2Key dikumpulkan sebelum baris D1-nya hilang lewat DELETE "user" berantai di bawah.
		const berkas = await c.env.DB.prepare('SELECT "r2Key" FROM "berkas" WHERE "userId" = ?')
			.bind(sasaranUserId)
			.all<{ r2Key: string }>();

		await c.env.DB.batch([
			c.env.DB.prepare('DELETE FROM "user" WHERE "id" = ?').bind(sasaranUserId),
			c.env.DB.prepare(`DELETE FROM "audit" WHERE ("sasaranUserId" = ? OR "aktorUserId" = ?) AND "tindakan" != 'hapus_data'`)
				.bind(sasaranUserId, sasaranUserId),
			pernyataanAudit(
				c.env.DB,
				{ aktor: "Admin bersama", aktorUserId: akses.sesi.user.id, sesiId: akses.sesi.session.id, tindakan: "hapus_data", sasaranUserId, hasil: "berhasil" },
				waktu,
			),
		]);

		await c.env.BERKAS.delete([
			...berkas.results.map((item) => item.r2Key),
			kunciZipAkun("terkini", sasaranUserId),
			kunciZipAkun("pemeriksaan", sasaranUserId),
		]);
		await hapusBarisCsvBacalon(c.env.BERKAS, "terkini", sasaranUserId);
		await hapusBarisCsvBacalon(c.env.BERKAS, "pemeriksaan", sasaranUserId);

		return c.json({ status: "terhapus" });
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
