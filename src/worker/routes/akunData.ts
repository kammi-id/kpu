import { Hono } from "hono";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, whatsappTernormalisasi, type EnvDenganRahasia } from "../lib/auth";
import { tanggalLahirValid, tahunLulusDm3Valid } from "../lib/profil";
import { bolehUbahBacalon, layananAktif, tahapPada } from "../lib/tahap";

type BarisAkunData = {
	name: string;
	whatsapp: string;
	email: string;
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
};

type PayloadAkunData = {
	name: string;
	whatsapp: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPd: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	instruktur: boolean | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
};

const KOLOM_TEKS_OPSIONAL = [
	"namaPanggilan",
	"tempatLahir",
	"tanggalLahir",
	"asalPw",
	"asalPd",
	"tempatLulusDm3",
	"capaianHafalan",
	"bahasaAsing",
] as const;

/** Bentuk payload mentah, belum divalidasi kontennya (tanggal, tahun, dst). */
function payloadAkunData(data: unknown): data is PayloadAkunData {
	if (!data || typeof data !== "object") return false;
	const payload = data as Record<string, unknown>;
	if (typeof payload.name !== "string" || typeof payload.whatsapp !== "string") return false;
	if (!KOLOM_TEKS_OPSIONAL.every((kunci) => payload[kunci] === null || payload[kunci] === undefined || typeof payload[kunci] === "string")) {
		return false;
	}
	if (!(payload.tahunLulusDm3 === null || payload.tahunLulusDm3 === undefined || typeof payload.tahunLulusDm3 === "number")) {
		return false;
	}
	return payload.instruktur === null || payload.instruktur === undefined || typeof payload.instruktur === "boolean";
}

/** String kosong dianggap "kosongkan kolom" (null), sesuai "semua kolom boleh kosong". */
function teksAtauNull(nilai: string | null | undefined): string | null {
	if (nilai === null || nilai === undefined) return null;
	const dipangkas = nilai.trim();
	return dipangkas === "" ? null : dipangkas;
}

/**
 * Bakal Calon: baca dan simpan Data pribadi A.1 (`/akun/data`, tiket 12).
 * Baca mengikuti baris "baca data sendiri" (tahap × kemampuan): ditolak hanya
 * pada Selesai. Simpan mengikuti `bolehUbahBacalon`: hanya Masa Pendaftaran
 * dan Masa Perbaikan. Kepemilikan implisit — `userId` selalu dari sesi.
 */
export function buatRuteAkunData(sekarang: () => Date) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const baris = await c.env.DB.prepare(
			`SELECT u."name", u."whatsapp", u."email",
			        p."namaPanggilan", p."tempatLahir", p."tanggalLahir", p."asalPw", p."asalPd",
			        p."tahunLulusDm3", p."tempatLulusDm3", p."instruktur", p."capaianHafalan", p."bahasaAsing"
			 FROM "user" u LEFT JOIN "profil" p ON p."userId" = u."id"
			 WHERE u."id" = ?`,
		)
			.bind(sesi.user.id)
			.first<BarisAkunData>();

		if (!baris) return c.json({ error: "tidak_ditemukan" }, 404);
		return c.json({
			...baris,
			instruktur: baris.instruktur === null ? null : Boolean(baris.instruktur),
		});
	});

	route.put("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);

		const waktu = sekarang();
		const tahap = tahapPada(waktu);
		if (!bolehUbahBacalon(tahap)) {
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "ubah_data", hasil: "ditolak", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				waktu,
			);
			return c.json({ error: "tahap_tertutup", tahap }, 403);
		}

		const tolak = async (error: string, status: 400) => {
			await catatAudit(
				c.env.DB,
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "ubah_data", hasil: "ditolak", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
				waktu,
			);
			return c.json({ error }, status);
		};

		const body: unknown = await c.req.json().catch(() => null);
		if (!payloadAkunData(body)) return tolak("permintaan_tidak_valid", 400);

		const name = body.name.trim();
		if (name === "") return tolak("nama_wajib", 400);

		const whatsapp = whatsappTernormalisasi(body.whatsapp);
		if (!whatsapp) return tolak("whatsapp_tidak_valid", 400);

		const tanggalLahir = teksAtauNull(body.tanggalLahir);
		if (tanggalLahir !== null && !tanggalLahirValid(tanggalLahir)) return tolak("tanggal_lahir_tidak_valid", 400);

		const tahunLulusDm3 = body.tahunLulusDm3 ?? null;
		if (tahunLulusDm3 !== null && !tahunLulusDm3Valid(tahunLulusDm3)) return tolak("tahun_lulus_tidak_valid", 400);

		try {
			await c.env.DB.prepare('UPDATE "user" SET "name" = ?, "whatsapp" = ? WHERE "id" = ?')
				.bind(name, whatsapp, sesi.user.id)
				.run();
		} catch {
			// Mis. WhatsApp sudah dipakai akun lain menabrak UNIQUE di D1, seperti
			// registrasi di index.ts: ditangkap supaya tidak pernah 500.
			return tolak("whatsapp_sudah_dipakai", 400);
		}

		try {
			await c.env.DB.prepare(
				`INSERT INTO "profil"
				   ("userId", "namaPanggilan", "tempatLahir", "tanggalLahir", "asalPw", "asalPd", "tahunLulusDm3", "tempatLulusDm3", "instruktur", "capaianHafalan", "bahasaAsing", "diubahPada")
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT("userId") DO UPDATE SET
				   "namaPanggilan" = excluded."namaPanggilan",
				   "tempatLahir" = excluded."tempatLahir",
				   "tanggalLahir" = excluded."tanggalLahir",
				   "asalPw" = excluded."asalPw",
				   "asalPd" = excluded."asalPd",
				   "tahunLulusDm3" = excluded."tahunLulusDm3",
				   "tempatLulusDm3" = excluded."tempatLulusDm3",
				   "instruktur" = excluded."instruktur",
				   "capaianHafalan" = excluded."capaianHafalan",
				   "bahasaAsing" = excluded."bahasaAsing",
				   "diubahPada" = excluded."diubahPada"`,
			)
				.bind(
					sesi.user.id,
					teksAtauNull(body.namaPanggilan),
					teksAtauNull(body.tempatLahir),
					tanggalLahir,
					teksAtauNull(body.asalPw),
					teksAtauNull(body.asalPd),
					tahunLulusDm3,
					teksAtauNull(body.tempatLulusDm3),
					body.instruktur === null || body.instruktur === undefined ? null : Number(body.instruktur),
					teksAtauNull(body.capaianHafalan),
					teksAtauNull(body.bahasaAsing),
					waktu.toISOString(),
				)
				.run();
		} catch {
			return tolak("permintaan_tidak_valid", 400);
		}

		await catatAudit(
			c.env.DB,
			{ aktor: "Bakal Calon Ketua Umum", tindakan: "ubah_data", hasil: "berhasil", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
			waktu,
		);
		return c.json({ status: "tersimpan" });
	});

	return route;
}
