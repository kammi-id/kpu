import { Hono } from "hono";
import { kelompokValid, type NomorKelompok } from "../../lib/kelompok";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { ambilKelengkapan } from "../lib/kelengkapan";
import { bolehUbahBacalon, layananAktif, tahapPada } from "../lib/tahap";
import { unggahBerkas } from "../lib/unggahBerkas";

/** Spec "Kelompok berkas dan unggahan": paling banyak lima berkas per kelompok. */
const MAKS_BERKAS_PER_KELOMPOK = 5;

type BarisBerkas = {
	id: string;
	userId: string;
	r2Key: string;
	namaAsli: string;
	mime: string;
};

type BarisDaftar = {
	id: string;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
	jenisRekomendasi: string | null;
	diunggahPada: string;
};

/** `Content-Disposition: attachment` aman untuk nama berkas non-ASCII (RFC 5987/6266). */
export function headerUnduh(namaAsli: string, jenis: "attachment" | "inline" = "attachment"): string {
	const fallback = namaAsli.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
	return `${jenis}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(namaAsli)}`;
}

export type ModeBerkas = "unduh" | "pratinjau";

/**
 * Respons berkas Bakal Calon: "unduh" memaksa attachment, "pratinjau" (tiket
 * pratinjau berkas) menampilkan inline di Sheet. MIME sudah dijamin PDF/JPEG/PNG
 * oleh pemeriksaan signature saat unggah; nosniff mencegah browser menebak lain.
 * CSP `sandbox` sengaja tidak dipasang karena Chrome menolak merender PDF di bawahnya.
 */
export function responsBerkas(objek: R2ObjectBody, baris: { mime: string; namaAsli: string }, mode: ModeBerkas): Response {
	return new Response(objek.body, {
		headers: {
			"content-type": baris.mime,
			"content-disposition": headerUnduh(baris.namaAsli, mode === "pratinjau" ? "inline" : "attachment"),
			"x-content-type-options": "nosniff",
			"cache-control": "private, no-store",
		},
	});
}

function kelompokDariParam(nilai: string): NomorKelompok | null {
	const nomor = Number(nilai);
	return kelompokValid(nomor) ? nomor : null;
}

/**
 * `/api/akun/berkas`: rute Bakal Calon untuk sembilan kelompok berkas (tiket 13).
 * Urutan tetap setiap rute non-baca: sesi → peran (bacalon) → kepemilikan → tahap.
 * Unduhan (pemilik atau Admin) per spec "Kelompok berkas dan unggahan" adalah
 * pengecualian yang disengaja: lebih luas dari rute lain di sini.
 */
export function buatRuteAkunBerkas(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const kelengkapan = await ambilKelengkapan(c.env.DB, sesi.user.id);
		return c.json(kelengkapan);
	});

	route.get("/:kelompok", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const kelompok = kelompokDariParam(c.req.param("kelompok"));
		if (!kelompok) return c.json({ error: "kelompok_tidak_valid" }, 400);

		const daftar = await c.env.DB.prepare(
			`SELECT "id", "namaAsli", "mime", "ukuranByte", "jenisRekomendasi", "diunggahPada"
			 FROM "berkas" WHERE "userId" = ? AND "kelompok" = ? ORDER BY "diunggahPada"`,
		)
			.bind(sesi.user.id, kelompok)
			.all<BarisDaftar>();
		return c.json({ data: daftar.results });
	});

	route.post("/:kelompok", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);

		const kelompok = kelompokDariParam(c.req.param("kelompok"));
		if (!kelompok) return c.json({ error: "kelompok_tidak_valid" }, 400);

		const tahap = tahapPada(sekarang());
		if (!bolehUbahBacalon(tahap)) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "unggah_berkas", hasil: "ditolak", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				sekarang(),
			);
			return c.json({ error: "tahap_tertutup", tahap }, 403);
		}

		const hasil = await unggahBerkas(c.req.raw, c.env.BERKAS, kelompok);
		if (!hasil.ok) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "unggah_berkas", hasil: "ditolak", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				sekarang(),
			);
			return c.json({ error: hasil.error }, hasil.status as 400);
		}

		const id = crypto.randomUUID();
		const waktu = sekarang();
		let insertOk = false;
		try {
			const insert = await c.env.DB.prepare(
				`INSERT INTO "berkas" ("id", "userId", "kelompok", "jenisRekomendasi", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
				 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
				 WHERE (SELECT COUNT(*) FROM "berkas" WHERE "userId" = ? AND "kelompok" = ?) < ${MAKS_BERKAS_PER_KELOMPOK}`,
			)
				.bind(
					id,
					sesi.user.id,
					kelompok,
					hasil.meta.jenisRekomendasi,
					hasil.r2Key,
					hasil.meta.namaAsli,
					hasil.meta.mime,
					hasil.ukuranByte,
					hasil.sha256,
					waktu.toISOString(),
					sesi.user.id,
					kelompok,
				)
				.run();
			// `meta.rows_written` counts low-level storage writes (index b-tree entries
			// included), not logical rows — `meta.changes` (sqlite3_changes()) is the
			// reliable "did exactly one row get inserted" signal for this conditional
			// INSERT…SELECT…WHERE, confirmed empirically against @cloudflare/vitest-plugin's
			// local D1 simulator.
			insertOk = insert.meta.changes === 1;
		} catch {
			insertOk = false;
		}

		if (!insertOk) {
			await c.env.BERKAS.delete(hasil.r2Key).catch(() => undefined);
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "unggah_berkas", hasil: "gagal", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				waktu,
			);
			return c.json({ error: "batas_berkas_tercapai" }, 409);
		}

		await catatAudit(
			c.env.DB,
			{
				aktor: "Bakal Calon Ketua Umum",
				tindakan: "unggah_berkas",
				hasil: "berhasil",
				sesiId: sesi.session.id,
				aktorUserId: sesi.user.id,
				sasaranBerkasId: id,
			},
			waktu,
		);
		return c.json({ status: "tersimpan", id }, 201);
	});

	route.delete("/:kelompok/:id", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);

		const kelompok = kelompokDariParam(c.req.param("kelompok"));
		if (!kelompok) return c.json({ error: "tidak_ditemukan" }, 404);
		const id = c.req.param("id");

		const baris = await c.env.DB.prepare(
			'SELECT "id", "userId", "r2Key", "namaAsli", "mime" FROM "berkas" WHERE "id" = ? AND "kelompok" = ?',
		)
			.bind(id, kelompok)
			.first<BarisBerkas>();
		// 404 tanpa membedakan "tidak ada" dan "bukan pemilik": id berkas tidak boleh membocorkan eksistensi.
		if (!baris || baris.userId !== sesi.user.id) return c.json({ error: "tidak_ditemukan" }, 404);

		const tahap = tahapPada(sekarang());
		if (!bolehUbahBacalon(tahap)) {
			await catatAudit(
				c.env.DB,
				{
					aktor: "Bakal Calon Ketua Umum",
					tindakan: "hapus_berkas",
					hasil: "ditolak",
					sesiId: sesi.session.id,
					aktorUserId: sesi.user.id,
					sasaranBerkasId: id,
				},
				sekarang(),
			);
			return c.json({ error: "tahap_tertutup", tahap }, 403);
		}

		await c.env.DB.prepare('DELETE FROM "berkas" WHERE "id" = ?').bind(id).run();
		await c.env.BERKAS.delete(baris.r2Key);

		await catatAudit(
			c.env.DB,
			{
				aktor: "Bakal Calon Ketua Umum",
				tindakan: "hapus_berkas",
				hasil: "berhasil",
				sesiId: sesi.session.id,
				aktorUserId: sesi.user.id,
				sasaranBerkasId: id,
			},
			sekarang(),
		);
		return c.json({ status: "terhapus" });
	});

	// Unduh dan pratinjau berbagi aturan akses yang sama; hanya Content-Disposition yang berbeda.
	for (const mode of ["unduh", "pratinjau"] as const) route.get(`/:kelompok/:id/${mode}`, async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);
		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || (sesi.user.role !== "bacalon" && sesi.user.role !== "admin")) return c.json({ error: "tidak_berwenang" }, 401);

		const kelompok = kelompokDariParam(c.req.param("kelompok"));
		if (!kelompok) return c.json({ error: "tidak_ditemukan" }, 404);
		const id = c.req.param("id");

		const baris = await c.env.DB.prepare(
			'SELECT "id", "userId", "r2Key", "namaAsli", "mime" FROM "berkas" WHERE "id" = ? AND "kelompok" = ?',
		)
			.bind(id, kelompok)
			.first<BarisBerkas>();
		// Non-pemilik (bacalon lain) tidak boleh membedakan "id tidak ada" dari "bukan miliknya".
		if (!baris || (sesi.user.role !== "admin" && baris.userId !== sesi.user.id)) {
			return c.json({ error: "tidak_ditemukan" }, 404);
		}
		// Urutan tetap sesi → peran → kepemilikan → tahap: kepemilikan sudah diperiksa di atas.
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const objek = await c.env.BERKAS.get(baris.r2Key);
		if (!objek) return c.json({ error: "tidak_ditemukan" }, 404);

		return responsBerkas(objek, baris, mode);
	});

	return route;
}
