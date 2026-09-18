import { catatAudit } from "./audit";
import { tahapPada } from "./tahap";

const UKURAN_BAGIAN_MULTIPART = 5 * 1024 * 1024;
const encoder = new TextEncoder();

/** Dua varian ekspor yang tersedia untuk diunduh (tiket 16): satu berjalan tiap hari, satu snapshot sekali. */
export type KategoriEkspor = "terkini" | "pemeriksaan";

/** Kunci R2 bersama antara penulis (buatEksporHarian) dan pembaca (rute unduhan Admin), satu sumber kebenaran. */
export function kunciCsvBacalon(kategori: KategoriEkspor) {
	return `ekspor/${kategori}/bacalon.csv`;
}

export function kunciZipAkun(kategori: KategoriEkspor, userId: string) {
	return `ekspor/${kategori}/${userId}.zip`;
}

type BacalonEkspor = {
	id: string;
	name: string;
	email: string;
	whatsapp: string;
	nia: string;
	dibuatPada: string;
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

type BerkasEkspor = {
	id: string;
	r2Key: string;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
	sha256: string;
	kelompok: number;
	jenisRekomendasi: string | null;
};

type EntriZip = { nama: Uint8Array; crc: number; ukuran: number; offset: number };

const tabelCrc = (() => {
	const tabel = new Uint32Array(256);
	for (let i = 0; i < 256; i += 1) {
		let nilai = i;
		for (let bit = 0; bit < 8; bit += 1) nilai = nilai & 1 ? (nilai >>> 1) ^ 0xedb88320 : nilai >>> 1;
		tabel[i] = nilai >>> 0;
	}
	return tabel;
})();

function crc32(bytes: Uint8Array, awal = 0xffffffff) {
	let nilai = awal;
	for (const byte of bytes) nilai = tabelCrc[(nilai ^ byte) & 0xff] ^ (nilai >>> 8);
	return nilai >>> 0;
}

function bagian(...angka: number[]) {
	const bytes = new Uint8Array(angka.length * 2);
	const view = new DataView(bytes.buffer);
	angka.forEach((nilai, i) => view.setUint16(i * 2, nilai, true));
	return bytes;
}

function kata(...angka: number[]) {
	const bytes = new Uint8Array(angka.length * 4);
	const view = new DataView(bytes.buffer);
	angka.forEach((nilai, i) => view.setUint32(i * 4, nilai >>> 0, true));
	return bytes;
}

function gabung(...bagianBytes: Uint8Array[]) {
	const hasil = new Uint8Array(bagianBytes.reduce((jumlah, bytes) => jumlah + bytes.byteLength, 0));
	let offset = 0;
	for (const bytes of bagianBytes) {
		hasil.set(bytes, offset);
		offset += bytes.byteLength;
	}
	return hasil;
}

function csv(nilai: string | number | null) {
	let teks = nilai === null ? "" : String(nilai);
	// Formula injection (OWASP CSV Injection): awalan =+-@ atau tab dieksekusi sebagai
	// formula oleh Excel/Sheets saat Admin membuka CSV ini. Bakal Calon mengendalikan
	// penuh field ini lewat PUT /api/akun/data dan pendaftaran.
	if (/^[=+\-@\t]/.test(teks)) teks = `'${teks}`;
	return /[",\r\n]/.test(teks) ? `"${teks.replaceAll('"', '""')}"` : teks;
}

function namaAman(nama: string) {
	return nama.replaceAll(/[\\/\0]/g, "_");
}

/** Penulis ZIP store yang mengirim bagian minimal 5 MiB ke R2 sambil menghasilkan ZIP. */
class UnggahMultipart {
	private bagian = new Uint8Array(0);
	private urutan = 1;
	private terunggah: R2UploadedPart[] = [];

	constructor(private readonly unggahan: R2MultipartUpload) {}

	async tulis(bytes: Uint8Array) {
		let sisa = bytes;
		while (sisa.byteLength) {
			const ruang = UKURAN_BAGIAN_MULTIPART - this.bagian.byteLength;
			const ambil = Math.min(ruang, sisa.byteLength);
			this.bagian = gabung(this.bagian, sisa.subarray(0, ambil));
			sisa = sisa.subarray(ambil);
			if (this.bagian.byteLength === UKURAN_BAGIAN_MULTIPART) await this.kirimBagian();
		}
	}

	private async kirimBagian() {
		this.terunggah.push(await this.unggahan.uploadPart(this.urutan, this.bagian));
		this.urutan += 1;
		this.bagian = new Uint8Array(0);
	}

	async selesai() {
		if (this.bagian.byteLength) await this.kirimBagian();
		return this.unggahan.complete(this.terunggah);
	}

	async batalkan() {
		await this.unggahan.abort();
	}
}

class ZipStore {
	private readonly entri: EntriZip[] = [];
	private offset = 0;

	constructor(private readonly keluaran: UnggahMultipart, private readonly waktu: Date) {}

	private async tulis(bytes: Uint8Array) {
		this.offset += bytes.byteLength;
		await this.keluaran.tulis(bytes);
	}

	private waktuDos() {
		const tahun = Math.max(this.waktu.getUTCFullYear(), 1980);
		return {
			tanggal: ((tahun - 1980) << 9) | ((this.waktu.getUTCMonth() + 1) << 5) | this.waktu.getUTCDate(),
			jam: (this.waktu.getUTCHours() << 11) | (this.waktu.getUTCMinutes() << 5) | Math.floor(this.waktu.getUTCSeconds() / 2),
		};
	}

	async tambahBytes(nama: string, bytes: Uint8Array) {
		await this.tambah(nama, [bytes]);
	}

	async tambahStream(nama: string, stream: ReadableStream<Uint8Array>) {
		const pembaca = stream.getReader();
		async function* chunks() {
			try {
				while (true) {
					const berikutnya = await pembaca.read();
					if (berikutnya.done) return;
					yield berikutnya.value;
				}
			} finally {
				pembaca.releaseLock();
			}
		}
		await this.tambah(nama, chunks());
	}

	private async tambah(namaTeks: string, chunks: Iterable<Uint8Array> | AsyncIterable<Uint8Array>) {
		const nama = encoder.encode(namaTeks);
		const posisi = this.offset;
		const waktu = this.waktuDos();
		// Bit 3: CRC dan ukuran mengikuti data sebagai data descriptor, sehingga isi berkas
		// tidak perlu dibuffer sebelum dialirkan.
		await this.tulis(gabung(kata(0x04034b50), bagian(20, 0x08, 0, waktu.jam, waktu.tanggal), kata(0, 0, 0), bagian(nama.byteLength, 0), nama));
		let crc = 0xffffffff;
		let ukuran = 0;
		for await (const bytes of chunks) {
			crc = crc32(bytes, crc);
			ukuran += bytes.byteLength;
			await this.tulis(bytes);
		}
		crc = (~crc) >>> 0;
		await this.tulis(gabung(kata(0x08074b50, crc, ukuran, ukuran)));
		this.entri.push({ nama, crc, ukuran, offset: posisi });
	}

	async selesai() {
		const awalDirektori = this.offset;
		const waktu = this.waktuDos();
		for (const entri of this.entri) {
			await this.tulis(gabung(
				kata(0x02014b50), bagian(20, 20, 0x08, 0, waktu.jam, waktu.tanggal), kata(entri.crc, entri.ukuran, entri.ukuran),
				bagian(entri.nama.byteLength, 0, 0, 0, 0), kata(0, entri.offset), entri.nama,
			));
		}
		const ukuranDirektori = this.offset - awalDirektori;
		await this.tulis(gabung(kata(0x06054b50), bagian(0, 0, this.entri.length, this.entri.length), kata(ukuranDirektori, awalDirektori), bagian(0)));
	}
}

// Minta ditutup = spec "Permintaan Penutupan Akun": banned=1 DAN banReason='penutupan_akun'
// bersamaan (tiket 17). Dipakai di sini dan di routes/adminBacalon.ts (tabel dan detail Admin) —
// satu sumber supaya definisinya tidak diam-diam menyimpang antara CSV dan API Admin.
export const KOLOM_MINTA_DITUTUP = `CASE WHEN u."banned" = 1 AND u."banReason" = 'penutupan_akun' THEN 1 ELSE 0 END AS "mintaDitutup"`;

async function daftarBacalon(db: D1Database) {
	return (await db.prepare(
		`SELECT u."id", u."name", u."email", u."whatsapp", u."nia", u."createdAt" AS "dibuatPada", p."namaPanggilan", p."tempatLahir", p."tanggalLahir", p."asalPw", p."asalPd",
		        p."tahunLulusDm3", p."tempatLulusDm3", p."instruktur", p."capaianHafalan", p."bahasaAsing", v."jumlahHadir", v."lengkap",
		        ${KOLOM_MINTA_DITUTUP}
		 FROM "user" u JOIN "vKelengkapan" v ON v."userId" = u."id" LEFT JOIN "profil" p ON p."userId" = u."id"
		 WHERE u."role" = 'bacalon' ORDER BY u."createdAt", u."id"`,
	).all<BacalonEkspor>()).results;
}

const KOLOM_BACALON = ["id", "nama", "email", "whatsapp", "nia", "dibuatPada", "namaPanggilan", "tempatLahir", "tanggalLahir", "asalPw", "asalPd", "tahunLulusDm3", "tempatLulusDm3", "instruktur", "capaianHafalan", "bahasaAsing", "jumlahHadir", "lengkap", "Minta ditutup"] as const;

function nilaiKolomBacalon(item: BacalonEkspor, kolom: (typeof KOLOM_BACALON)[number]): string | number | null {
	if (kolom === "nama") return item.name;
	if (kolom === "Minta ditutup") return item.mintaDitutup ? "ya" : "tidak";
	return item[kolom];
}

function csvBacalon(daftar: BacalonEkspor[]) {
	return encoder.encode([KOLOM_BACALON.join(","), ...daftar.map((item) => KOLOM_BACALON.map((kolom) => csv(nilaiKolomBacalon(item, kolom))).join(","))].join("\r\n") + "\r\n");
}

async function berkasBacalon(db: D1Database, userId: string) {
	return (await db.prepare(
		`SELECT "id", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "kelompok", "jenisRekomendasi"
		 FROM "berkas" WHERE "userId" = ? ORDER BY "kelompok", "diunggahPada", "id"`,
	).bind(userId).all<BerkasEkspor>()).results;
}

async function tulisZip(bucket: R2Bucket, bacalon: BacalonEkspor, berkas: BerkasEkspor[], waktu: Date) {
	const unggahan = await bucket.createMultipartUpload(kunciZipAkun("terkini", bacalon.id), { httpMetadata: { contentType: "application/zip" } });
	const multipart = new UnggahMultipart(unggahan);
	try {
		const zip = new ZipStore(multipart, waktu);
		await zip.tambahBytes("data.json", encoder.encode(JSON.stringify({
			id: bacalon.id, name: bacalon.name, email: bacalon.email, whatsapp: bacalon.whatsapp, dibuatPada: bacalon.dibuatPada,
			profil: {
				namaPanggilan: bacalon.namaPanggilan, tempatLahir: bacalon.tempatLahir, tanggalLahir: bacalon.tanggalLahir, asalPw: bacalon.asalPw, asalPd: bacalon.asalPd,
				tahunLulusDm3: bacalon.tahunLulusDm3, tempatLulusDm3: bacalon.tempatLulusDm3, instruktur: Boolean(bacalon.instruktur), capaianHafalan: bacalon.capaianHafalan, bahasaAsing: bacalon.bahasaAsing,
			},
			statusKelengkapanBerkas: { jumlahHadir: bacalon.jumlahHadir, lengkap: Boolean(bacalon.lengkap) }, mintaDitutup: Boolean(bacalon.mintaDitutup),
		})));
		for (const item of berkas) {
			const objek = await bucket.get(item.r2Key);
			if (!objek) throw new Error(`Berkas ekspor tidak ditemukan: ${item.id}`);
			await zip.tambahStream(`berkas/${item.id}-${namaAman(item.namaAsli)}`, objek.body);
		}
		await zip.tambahBytes("manifest.json", encoder.encode(JSON.stringify({
			berkas: berkas.map((item) => ({ id: item.id, nama: `berkas/${item.id}-${namaAman(item.namaAsli)}`, sha256: item.sha256, mime: item.mime, ukuranByte: item.ukuranByte, kelompok: item.kelompok, jenisRekomendasi: item.jenisRekomendasi })),
		})));
		await zip.selesai();
		await multipart.selesai();
	} catch (error) {
		await multipart.batalkan().catch(() => undefined);
		throw error;
	}
}

/**
 * Menghapus baris satu akun dari CSV Bacalon yang sudah ada tanpa menyusun ulang
 * seluruh isi (tiket 17: Hapus data akun) — CSV Pemeriksaan adalah snapshot yang
 * tak bisa dibangun ulang dari D1 terkini. Aman memakai kecocokan prefix baris
 * karena kolom pertama selalu UUID `id`, yang tidak pernah butuh dikutip oleh `csv()`.
 */
export async function hapusBarisCsvBacalon(bucket: R2Bucket, kategori: KategoriEkspor, userId: string) {
	const kunci = kunciCsvBacalon(kategori);
	const objek = await bucket.get(kunci);
	if (!objek) return;
	const baris = (await objek.text()).split("\r\n");
	const disaring = baris.filter((satu) => !satu.startsWith(`${userId},`));
	if (disaring.length === baris.length) return;
	await bucket.put(kunci, disaring.join("\r\n"), { httpMetadata: objek.httpMetadata });
}

async function hapusTerkiniUsang(bucket: R2Bucket, dipertahankan: Set<string>) {
	let cursor: string | undefined;
	do {
		const halaman = await bucket.list({ prefix: "ekspor/terkini/", cursor });
		const hapus = halaman.objects.filter((objek) => !dipertahankan.has(objek.key)).map((objek) => objek.key);
		if (hapus.length) await bucket.delete(hapus);
		cursor = halaman.truncated ? halaman.cursor : undefined;
	} while (cursor);
}

function tanggalWib(waktu: Date) {
	const wib = new Date(waktu.getTime() + 7 * 60 * 60_000);
	return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
}

async function salinSnapshot(bucket: R2Bucket, kunci: string) {
	if (await bucket.head(kunci.replace("ekspor/terkini/", "ekspor/pemeriksaan/"))) return;
	const asal = await bucket.get(kunci);
	if (!asal) throw new Error(`Ekspor terkini tidak ditemukan: ${kunci}`);
	await bucket.put(kunci.replace("ekspor/terkini/", "ekspor/pemeriksaan/"), asal.body, { httpMetadata: asal.httpMetadata });
}

/** Membuat ulang Ekspor Harian; waktu selalu diberikan controller.scheduledTime. */
export async function buatEksporHarian(env: Env, waktu: Date) {
	if (tahapPada(waktu) === "Selesai") {
		// Tahap Selesai: Penghapusan Akhir, lihat tiket 18. Ekspor Harian tidak berjalan lagi.
		return;
	}
	try {
		const daftar = await daftarBacalon(env.DB);
		const dipertahankan = new Set([kunciCsvBacalon("terkini")]);
		await env.BERKAS.put(kunciCsvBacalon("terkini"), csvBacalon(daftar), { httpMetadata: { contentType: "text/csv; charset=utf-8" } });
		for (const bacalon of daftar) {
			await tulisZip(env.BERKAS, bacalon, await berkasBacalon(env.DB, bacalon.id), waktu);
			dipertahankan.add(kunciZipAkun("terkini", bacalon.id));
		}
		await hapusTerkiniUsang(env.BERKAS, dipertahankan);
		if (tanggalWib(waktu) === "2026-09-27" && !(await env.BERKAS.head(kunciCsvBacalon("pemeriksaan")))) {
			for (const kunci of dipertahankan) await salinSnapshot(env.BERKAS, kunci);
		}
		await catatAudit(env.DB, { aktor: "Sistem", tindakan: "ekspor_harian", hasil: "berhasil" }, waktu);
	} catch {
		await catatAudit(env.DB, { aktor: "Sistem", tindakan: "ekspor_harian", hasil: "gagal" }, waktu);
	}
}
