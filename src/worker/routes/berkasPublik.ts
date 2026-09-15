import { Hono } from "hono";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, type EnvDenganRahasia } from "../lib/auth";
import { layananAktif, tahapPada } from "../lib/tahap";
import { validasiUnggahPublik } from "../lib/unggahPublik";

type BarisUnduh = { r2Key: string; namaAsli: string; mime: string };

/** `Content-Disposition: attachment` aman untuk nama berkas non-ASCII (RFC 5987/6266). */
function headerUnduh(namaAsli: string): string {
	const fallback = namaAsli.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
	return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(namaAsli)}`;
}

/**
 * Publik: unduh satu Berkas Publik tanpa sesi. 404 bila baris D1 atau objek R2
 * tidak ada (mis. objek yatim setelah kegagalan yang tak tertangani).
 */
export function buatRuteUnduhBerkasPublik() {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/:id", async (c) => {
		const baris = await c.env.DB.prepare('SELECT "r2Key", "namaAsli", "mime" FROM "berkasPublik" WHERE "id" = ?')
			.bind(c.req.param("id"))
			.first<BarisUnduh>();
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

/** Admin: unggah dan hapus Berkas Publik (PDF/DOCX ≤ 20 MiB, kontrak body mentah). */
export function buatRuteAdminBerkasPublik(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.post("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "admin") return c.json({ error: "tidak_berwenang" }, 401);

		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		const validasi = await validasiUnggahPublik(c.req.raw);
		if (!validasi.ok) return c.json({ error: validasi.error }, validasi.status as 400);

		const r2Key = `publik/${crypto.randomUUID()}`;
		const id = crypto.randomUUID();
		await c.env.BERKAS.put(r2Key, validasi.bytes, { httpMetadata: { contentType: validasi.meta.mime } });

		try {
			await c.env.DB.prepare(
				`INSERT INTO "berkasPublik" ("id", "kategori", "judul", "urutan", "r2Key", "namaAsli", "mime", "ukuranByte", "diunggahPada")
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					id,
					validasi.meta.kategori,
					validasi.meta.judul,
					validasi.meta.urutan,
					r2Key,
					validasi.meta.namaAsli,
					validasi.meta.mime,
					validasi.bytes.byteLength,
					sekarang().toISOString(),
				)
				.run();
		} catch {
			await c.env.BERKAS.delete(r2Key);
			await catatAudit(
				c.env.DB,
				{
					aktor: "Admin bersama",
					tindakan: "unggah_berkas_publik",
					hasil: "gagal",
					sesiId: sesi.session.id,
					aktorUserId: sesi.user.id,
				},
				sekarang(),
			);
			return c.json({ error: "permintaan_tidak_valid" }, 400);
		}

		await catatAudit(
			c.env.DB,
			{
				aktor: "Admin bersama",
					tindakan: "unggah_berkas_publik",
					hasil: "berhasil",
					sesiId: sesi.session.id,
					aktorUserId: sesi.user.id,
					sasaranBerkasId: id,
			},
			sekarang(),
		);

		return c.json({ status: "tersimpan" }, 201);
	});

	route.delete("/:id", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "admin") return c.json({ error: "tidak_berwenang" }, 401);

		const tahap = tahapPada(sekarang());
		if (!layananAktif(tahap)) return c.json({ error: "tahap_tertutup", tahap }, 403);

		const id = c.req.param("id");
		const baris = await c.env.DB.prepare('SELECT "r2Key" FROM "berkasPublik" WHERE "id" = ?')
			.bind(id)
			.first<{ r2Key: string }>();
		if (!baris) return c.json({ error: "tidak_ditemukan" }, 404);

		await c.env.DB.prepare('DELETE FROM "berkasPublik" WHERE "id" = ?').bind(id).run();
		await c.env.BERKAS.delete(baris.r2Key);

		await catatAudit(
			c.env.DB,
			{
				aktor: "Admin bersama",
				tindakan: "hapus_berkas_publik",
				hasil: "berhasil",
				sesiId: sesi.session.id,
				aktorUserId: sesi.user.id,
				sasaranBerkasId: id,
			},
			sekarang(),
		);

		return c.json({ status: "terhapus" });
	});

	return route;
}
