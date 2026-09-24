import { Hono } from "hono";
import { catatAudit } from "../lib/audit";
import { ambilSesi, buatAuth, rahasiaTersedia, whatsappTernormalisasi, type EnvDenganRahasia } from "../lib/auth";
import { base64Dari, ekstraksiA1 as ekstraksiA1Asli, type MimeBerkasA1 } from "../lib/ekstraksiA1";
import { tanggalLahirValid, tahunLulusDm3Valid, teksSatuBarisValid } from "../lib/profil";
import { ambilStruktur } from "../lib/struktur";
import { cocokkanStruktur } from "../lib/strukturCocok";
import { bolehUbahBacalon, layananAktif, tahapPada } from "../lib/tahap";

type BarisAkunData = {
	name: string;
	whatsapp: string;
	email: string;
	nia: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPwId: string | null;
	asalPd: string | null;
	asalPdId: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	tempatLulusDm3Id: string | null;
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
	asalPwId: string | null;
	asalPd: string | null;
	asalPdId: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	tempatLulusDm3Id: string | null;
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

/** Kolom Id struktur (tiket 22): opsional, string bila dipilih dari combobox, null bila kosong/manual. */
const KOLOM_ID_STRUKTUR = ["asalPwId", "asalPdId", "tempatLulusDm3Id"] as const;

/** Bentuk payload mentah, belum divalidasi kontennya (tanggal, tahun, dst). */
function payloadAkunData(data: unknown): data is PayloadAkunData {
	if (!data || typeof data !== "object") return false;
	const payload = data as Record<string, unknown>;
	if (typeof payload.name !== "string" || typeof payload.whatsapp !== "string") return false;
	if (!KOLOM_TEKS_OPSIONAL.every((kunci) => payload[kunci] === null || payload[kunci] === undefined || typeof payload[kunci] === "string")) {
		return false;
	}
	if (!KOLOM_ID_STRUKTUR.every((kunci) => payload[kunci] === null || payload[kunci] === undefined || typeof payload[kunci] === "string")) {
		return false;
	}
	return payload.tahunLulusDm3 === null || payload.tahunLulusDm3 === undefined || typeof payload.tahunLulusDm3 === "number";
}

/** String kosong dianggap "kosongkan kolom" (null), sesuai "semua kolom boleh kosong". */
function teksAtauNull(nilai: string | null | undefined): string | null {
	if (nilai === null || nilai === undefined) return null;
	const dipangkas = nilai.trim();
	return dipangkas === "" ? null : dipangkas;
}

type MedanStruktur = { label: string | null; id: string | null; manual: 0 | 1 };

/**
 * Triple (label, id, manual) untuk Asal PW/Asal PD/Tempat lulus AB 3 (tiket
 * 22) — dipusatkan di sini alih-alih dihitung tiga kali terpisah di PUT.
 */
function medanStruktur(labelMentah: string | null | undefined, idMentah: string | null | undefined): MedanStruktur {
	const label = teksAtauNull(labelMentah);
	const id = label === null ? null : teksAtauNull(idMentah);
	return { label, id, manual: label !== null && id === null ? 1 : 0 };
}

/** Hasil pencocokan struktur (lib/strukturCocok.ts) ke bentuk `{id,label}` respons isi-otomatis, atau null bila tidak cocok. */
function strukturCocokJson(cocok: { id: string; nama: string } | null): { id: string; label: string } | null {
	return cocok ? { id: cocok.id, label: cocok.nama } : null;
}

/**
 * Bakal Calon: baca dan simpan Data pribadi A.1 (`/akun/data`, tiket 12).
 * Baca mengikuti baris "baca data sendiri" (tahap × kemampuan): ditolak hanya
 * pada Selesai. Simpan mengikuti `bolehUbahBacalon`: hanya Masa Pendaftaran
 * dan Masa Perbaikan. Kepemilikan implisit — `userId` selalu dari sesi.
 */
export function buatRuteAkunData(sekarang: () => Date, ekstraksiA1: typeof ekstraksiA1Asli = ekstraksiA1Asli) {
	const route = new Hono<{ Bindings: EnvDenganRahasia }>();

	route.get("/", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		const baris = await c.env.DB.prepare(
			`SELECT u."name", u."whatsapp", u."email", u."nia",
			        p."namaPanggilan", p."tempatLahir", p."tanggalLahir", p."asalPw", p."asalPwId", p."asalPd", p."asalPdId",
			        p."tahunLulusDm3", p."tempatLulusDm3", p."tempatLulusDm3Id", p."capaianHafalan", p."bahasaAsing"
			 FROM "user" u LEFT JOIN "profil" p ON p."userId" = u."id"
			 WHERE u."id" = ?`,
		)
			.bind(sesi.user.id)
			.first<BarisAkunData>();

		if (!baris) return c.json({ error: "tidak_ditemukan" }, 404);
		return c.json(baris);
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

		// Tiket 20: Nama lengkap terkonfirmasi lewat Verifikasi NIA saat
		// registrasi, jadi tidak lagi field yang dapat diubah Bakal Calon —
		// permintaan yang menyertakan name berbeda dari nilai tersimpan ditolak
		// (bukan diabaikan diam-diam, berbeda dari perlakuan "email" di bawah).
		// `SesiAutentikasi.user` (lib/auth.ts) hanya membawa id dan role, jadi
		// nama tersimpan dibaca terpisah alih-alih dari sesi.
		const namaTersimpan = await c.env.DB.prepare('SELECT "name" FROM "user" WHERE "id" = ?')
			.bind(sesi.user.id)
			.first<{ name: string }>();
		if (body.name.trim() !== namaTersimpan?.name) return tolak("nama_tidak_dapat_diubah", 400);

		const whatsapp = whatsappTernormalisasi(body.whatsapp);
		if (!whatsapp) return tolak("whatsapp_tidak_valid", 400);

		const tanggalLahir = teksAtauNull(body.tanggalLahir);
		if (tanggalLahir !== null && !tanggalLahirValid(tanggalLahir)) return tolak("tanggal_lahir_tidak_valid", 400);

		const tahunLulusDm3 = body.tahunLulusDm3 ?? null;
		if (tahunLulusDm3 !== null && !tahunLulusDm3Valid(tahunLulusDm3, waktu)) return tolak("tahun_lulus_tidak_valid", 400);

		// Kolom teks bebas lain juga berakhir di CSV Ekspor Harian (kecuali
		// tanggalLahir, sudah dibatasi angka-dan-tanda-hubung oleh POLA_TANGGAL_ISO
		// di atas) — sama seperti name, tidak boleh memuat karakter kontrol.
		for (const kolom of KOLOM_TEKS_OPSIONAL) {
			if (kolom === "tanggalLahir") continue;
			const nilai = teksAtauNull(body[kolom]);
			if (nilai !== null && !teksSatuBarisValid(nilai)) return tolak(`${kolom}_tidak_valid`, 400);
		}

		// Tiket 22: kolom Id struktur (combobox) hanya berarti bersamaan dengan
		// labelnya — memilih dari combobox mengisi keduanya, mengetik manual atau
		// mengosongkan mengisi Id null. Bukan diverifikasi ulang ke kammi.id di
		// sini (sudah dipilih dari daftar upstream saat combobox diisi); Id yang
		// tanpa label yang menyertainya dianggap tidak berlaku (dipaksa null)
		// alih-alih ditolak keras, supaya klien yang membersihkan label tidak
		// harus ingat membersihkan Id secara terpisah.
		const asalPw = medanStruktur(body.asalPw, body.asalPwId);
		const asalPd = medanStruktur(body.asalPd, body.asalPdId);
		const tempatLulusDm3 = medanStruktur(body.tempatLulusDm3, body.tempatLulusDm3Id);

		// Satu `DB.batch` (transaksi implisit D1): user + profil menjadi satu simpan
		// atomik, bukan dua tulis terpisah yang bisa timpang bila salah satunya gagal.
		try {
			await c.env.DB.batch([
				c.env.DB.prepare('UPDATE "user" SET "whatsapp" = ? WHERE "id" = ?')
					.bind(whatsapp, sesi.user.id),
				c.env.DB.prepare(
					`INSERT INTO "profil"
					   ("userId", "namaPanggilan", "tempatLahir", "tanggalLahir", "asalPw", "asalPwId", "asalPwManual", "asalPd", "asalPdId", "asalPdManual", "tahunLulusDm3", "tempatLulusDm3", "tempatLulusDm3Id", "tempatLulusDm3Manual", "capaianHafalan", "bahasaAsing", "diubahPada")
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					 ON CONFLICT("userId") DO UPDATE SET
					   "namaPanggilan" = excluded."namaPanggilan",
					   "tempatLahir" = excluded."tempatLahir",
					   "tanggalLahir" = excluded."tanggalLahir",
					   "asalPw" = excluded."asalPw",
					   "asalPwId" = excluded."asalPwId",
					   "asalPwManual" = excluded."asalPwManual",
					   "asalPd" = excluded."asalPd",
					   "asalPdId" = excluded."asalPdId",
					   "asalPdManual" = excluded."asalPdManual",
					   "tahunLulusDm3" = excluded."tahunLulusDm3",
					   "tempatLulusDm3" = excluded."tempatLulusDm3",
					   "tempatLulusDm3Id" = excluded."tempatLulusDm3Id",
					   "tempatLulusDm3Manual" = excluded."tempatLulusDm3Manual",
					   "capaianHafalan" = excluded."capaianHafalan",
					   "bahasaAsing" = excluded."bahasaAsing",
					   "diubahPada" = excluded."diubahPada"`,
				)
					.bind(
						sesi.user.id,
						teksAtauNull(body.namaPanggilan),
						teksAtauNull(body.tempatLahir),
						tanggalLahir,
						asalPw.label,
						asalPw.id,
						asalPw.manual,
						asalPd.label,
						asalPd.id,
						asalPd.manual,
						tahunLulusDm3,
						tempatLulusDm3.label,
						tempatLulusDm3.id,
						tempatLulusDm3.manual,
						teksAtauNull(body.capaianHafalan),
						teksAtauNull(body.bahasaAsing),
						waktu.toISOString(),
					),
			]);
		} catch {
			// WhatsApp sudah dipakai akun lain menabrak UNIQUE di D1, seperti
			// registrasi di index.ts. Dibedakan dari galat lain lewat query terpisah
			// supaya pesannya tetap jelas walau batch tidak membawa detail galat.
			const dipakai = await c.env.DB.prepare('SELECT 1 FROM "user" WHERE "whatsapp" = ? AND "id" != ?')
				.bind(whatsapp, sesi.user.id)
				.first();
			return tolak(dipakai ? "whatsapp_sudah_dipakai" : "permintaan_tidak_valid", 400);
		}

		await catatAudit(
			c.env.DB,
			{ aktor: "Bakal Calon Ketua Umum", tindakan: "ubah_data", hasil: "berhasil", sesiId: sesi.session.id, aktorUserId: sesi.user.id },
			waktu,
		);
		return c.json({ status: "tersimpan" });
	});

	// Isi otomatis dari Formulir A.1 (tiket 23): TIDAK menulis ke "profil" —
	// hanya membaca berkas kelompok 1 + memanggil model visi dan mengembalikan
	// field yang terbaca. `PUT /` di atas tetap satu-satunya jalan menulis;
	// tinjau-dan-konfirmasi terjadi di klien saat pengguna menekan Simpan
	// setelah melihat hasil isi-otomatis. Gerbang di sini mengikuti pola baca
	// (`layananAktif`, sama seperti `GET /`), bukan `bolehUbahBacalon` — rute
	// ini sendiri tidak pernah menulis, dan tombolnya sudah berada di dalam
	// fieldset yang dinonaktifkan React saat formulir hanya-baca.
	route.post("/isi-otomatis", async (c) => {
		if (!rahasiaTersedia(c.env)) return c.json({ error: "layanan_tidak_tersedia" }, 503);

		const sesi = await ambilSesi(buatAuth(c.env), c.env, c.req.raw.headers, sekarang());
		if (!sesi || sesi.user.role !== "bacalon") return c.json({ error: "tidak_berwenang" }, 401);
		if (!layananAktif(tahapPada(sekarang()))) return c.json({ error: "layanan_selesai" }, 403);

		// Berkas terbaru bila kelompok 1 diunggah ulang (paling banyak 5 per
		// kelompok, lib/unggahBerkas.ts) — sama seperti k1 pada "vKelengkapan",
		// kehadirannya cukup satu berkas kelompok 1 mana pun.
		const berkas = await c.env.DB.prepare(
			`SELECT "r2Key", "mime" FROM "berkas" WHERE "userId" = ? AND "kelompok" = 1 ORDER BY "diunggahPada" DESC LIMIT 1`,
		)
			.bind(sesi.user.id)
			.first<{ r2Key: string; mime: string }>();
		if (!berkas) return c.json({ error: "berkas_a1_tidak_ada" }, 400);

		const objek = await c.env.BERKAS.get(berkas.r2Key);
		if (!objek) return c.json({ error: "berkas_tidak_terbaca" }, 502);

		const bytesBase64 = base64Dari(await objek.arrayBuffer());
		const hasil = await ekstraksiA1(c.env.AI, { bytesBase64, mime: berkas.mime as MimeBerkasA1 }, sekarang());
		if (!hasil.sukses) return c.json({ error: "ekstraksi_gagal" }, 502);

		// Pencocokan struktur (tiket 21): Asal PD hanya dicoba bila Asal PW
		// cocok — endpoint struktur mewajibkan `ancestor` untuk jenis=pd
		// (routes/struktur.ts), jadi tanpa PW yang cocok tidak ada ancestor untuk
		// membatasi daftar PD. Tanpa kecocokan, kolom terkait dibiarkan kosong
		// (null) — TIDAK PERNAH diisi paksa dengan teks mentah hasil ekstraksi.
		const daftarPw = await ambilStruktur("pw", undefined, c.env);
		const opsiPw = daftarPw.sukses ? daftarPw.data : [];
		const asalPwCocok = hasil.data.asalPw ? cocokkanStruktur(hasil.data.asalPw, opsiPw) : null;
		const tempatLulusDm3Cocok = hasil.data.tempatLulusDm3 ? cocokkanStruktur(hasil.data.tempatLulusDm3, opsiPw) : null;

		let asalPdCocok = null;
		if (hasil.data.asalPd && asalPwCocok) {
			const daftarPd = await ambilStruktur("pd", asalPwCocok.id, c.env);
			if (daftarPd.sukses) asalPdCocok = cocokkanStruktur(hasil.data.asalPd, daftarPd.data);
		}

		return c.json({
			namaPanggilan: hasil.data.namaPanggilan,
			tempatLahir: hasil.data.tempatLahir,
			tanggalLahir: hasil.data.tanggalLahir,
			asalPw: strukturCocokJson(asalPwCocok),
			asalPd: strukturCocokJson(asalPdCocok),
			tahunLulusDm3: hasil.data.tahunLulusDm3,
			tempatLulusDm3: strukturCocokJson(tempatLulusDm3Cocok),
			capaianHafalan: hasil.data.capaianHafalan,
			bahasaAsing: hasil.data.bahasaAsing,
		});
	});

	return route;
}
