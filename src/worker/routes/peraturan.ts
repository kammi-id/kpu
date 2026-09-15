import { Hono } from "hono";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { layananAktif, tahapPada } from "../lib/tahap";

const MAKS_KARAKTER_MARKDOWN = 400_000;

type BarisBerkasPublik = {
	id: string;
	judul: string;
	urutan: number;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
};

async function daftarBerkasPublik(db: D1Database, kategori: "peraturan" | "formulir") {
	const hasil = await db
		.prepare(
			`SELECT "id", "judul", "urutan", "namaAsli", "mime", "ukuranByte"
			 FROM "berkasPublik" WHERE "kategori" = ? ORDER BY "urutan"`,
		)
		.bind(kategori)
		.all<BarisBerkasPublik>();
	return hasil.results;
}

/**
 * Publik: `/peraturan` = Markdown mentah (disk render aman di klien lewat SafeMarkdown)
 * ditambah Berkas Publik kategori "peraturan". Baris kosong dijawab sebagai
 * `isiMarkdown: null` supaya klien menampilkan "Menyusul". Ditolak pada tahap
 * Selesai (tiket 18): klien menampilkan pesan selesai saja di seluruh rute publik.
 */
export function buatRutePeraturanPublik(sekarang: () => Date) {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", async (c) => {
		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		const baris = await c.env.DB.prepare('SELECT "isiMarkdown" FROM "peraturan" WHERE "id" = 1').first<{
			isiMarkdown: string;
		}>();
		const berkasPublik = await daftarBerkasPublik(c.env.DB, "peraturan");
		return c.json({ isiMarkdown: baris?.isiMarkdown ?? null, berkasPublik });
	});

	return route;
}

/** Publik: `/unduhan` = Berkas Publik kategori "formulir" (Formulir A.1–A.6), menurut urutan. Ditolak pada tahap Selesai (tiket 18). */
export function buatRuteUnduhan(sekarang: () => Date) {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", async (c) => {
		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		return c.json({ berkasPublik: await daftarBerkasPublik(c.env.DB, "formulir") });
	});

	return route;
}

/**
 * Admin: simpan Peraturan sebagai Markdown mentah, menimpa `id = 1` tanpa riwayat.
 * Disimpan dan dijawab apa adanya sebagai teks — keamanan datang dari klien yang
 * selalu memakai SafeMarkdown, bukan dari sanitisasi di sini.
 */
export function buatRuteAdminPeraturan(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.put("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "admin") return c.json({ error: "tidak_berwenang" }, 401);

		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		const isiMarkdown = await c.req.text();
		if (isiMarkdown.length > MAKS_KARAKTER_MARKDOWN) {
			return c.json({ error: "markdown_terlalu_panjang" }, 413);
		}

		const waktu = sekarang().toISOString();
		await c.env.DB.prepare(
			`INSERT INTO "peraturan" ("id", "isiMarkdown", "diubahPada") VALUES (1, ?, ?)
			 ON CONFLICT("id") DO UPDATE SET "isiMarkdown" = excluded."isiMarkdown", "diubahPada" = excluded."diubahPada"`,
		)
			.bind(isiMarkdown, waktu)
			.run();

		await catatAudit(
			c.env.DB,
			{
				aktor: "Admin bersama",
				tindakan: "ubah_peraturan",
				hasil: "berhasil",
				sesiId: sesi.session.id,
				aktorUserId: sesi.user.id,
			},
			sekarang(),
		);

		return c.json({ status: "tersimpan" });
	});

	return route;
}
