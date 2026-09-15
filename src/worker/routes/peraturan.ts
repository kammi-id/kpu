import { Hono } from "hono";
import { layananAktif, tahapPada } from "../lib/tahap";

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

/** Teks `/peraturan` dibundel statik di klien; API ini hanya menyediakan salinan unduhannya. */
export function buatRutePeraturanPublik(sekarang: () => Date) {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", async (c) => {
		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		const berkasPublik = await daftarBerkasPublik(c.env.DB, "peraturan");
		return c.json({ berkasPublik });
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
