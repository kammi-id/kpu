import { mimeDiizinkan, type JenisRekomendasi, type NomorKelompok } from "../../lib/kelompok";

// Kontrak unggah berkas Bakal Calon (spec "Kelompok berkas dan unggahan"): body
// mentah, `Content-Length` wajib, metadata (namaAsli, dan untuk kelompok 7
// jenisRekomendasi) lewat query string — sama seperti unggahPublik.ts. BEDA
// penting: unggahPublik.ts sengaja membuffer penuh (lihat komentar peringatan di
// sana); modul ini TIDAK BOLEH meniru itu. Di sini body di-stream ke R2 sambil
// SHA-256 dihitung sambil-jalan lewat `crypto.DigestStream` (primitif Workers
// non-standar, dikonfirmasi dari developers.cloudflare.com/workers/runtime-apis/web-crypto/:
// `new crypto.DigestStream("SHA-256")` adalah WritableStream, isi
// `digestStream.digest` (Promise<ArrayBuffer>) dan `digestStream.bytesWritten`
// setelah stream selesai dipipe). Hanya beberapa byte pertama yang diintip
// (bukan seluruh berkas) untuk memeriksa signature sebelum stream penuh
// dialirkan ke R2.put + digest. `R2Bucket.put()` menolak ReadableStream tanpa
// panjang diketahui (dikonfirmasi lewat error runtime workerd yang eksplisit
// menyebut ini) — stream rekonstruksi kita tidak membawa panjang, jadi
// dibungkus lewat `FixedLengthStream` (Workers-specific) dengan Content-Length
// yang sudah tervalidasi sebelum diserahkan ke R2.put.

export const MAKS_UKURAN_BERKAS = 20 * 1024 * 1024;

const SIGNATURE = {
	"application/pdf": { ekstensi: ["pdf"], bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
	"image/jpeg": { ekstensi: ["jpg", "jpeg"], bytes: [0xff, 0xd8, 0xff] },
	"image/png": { ekstensi: ["png"], bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
} as const;

type MimeBerkas = keyof typeof SIGNATURE;

const PANJANG_SIGNATURE_MAKS = Math.max(...Object.values(SIGNATURE).map((item) => item.bytes.length));

export type MetaUnggahBerkas = {
	namaAsli: string;
	mime: MimeBerkas;
	jenisRekomendasi: JenisRekomendasi | null;
};

export type HasilUnggahBerkas =
	| { ok: true; r2Key: string; meta: MetaUnggahBerkas; ukuranByte: number; sha256: string }
	| { ok: false; status: number; error: string };

function mimeValid(nilai: string | null): nilai is MimeBerkas {
	return nilai === "application/pdf" || nilai === "image/jpeg" || nilai === "image/png";
}

function contentLengthValid(headers: Headers): number | null {
	const mentah = headers.get("content-length");
	if (!mentah) return null;
	const nilai = Number(mentah);
	if (!Number.isInteger(nilai) || nilai <= 0 || nilai > MAKS_UKURAN_BERKAS) return null;
	return nilai;
}

function ekstensiCocok(namaAsli: string, mime: MimeBerkas): boolean {
	const ekstensi = namaAsli.toLowerCase().split(".").pop();
	return Boolean(ekstensi) && (SIGNATURE[mime].ekstensi as readonly string[]).includes(ekstensi as string);
}

function signatureCocok(bytes: Uint8Array, mime: MimeBerkas): boolean {
	const signature = SIGNATURE[mime].bytes;
	if (bytes.length < signature.length) return false;
	return signature.every((byte, index) => bytes[index] === byte);
}

function bacaMeta(url: URL, headers: Headers, kelompok: NomorKelompok): MetaUnggahBerkas | null {
	const namaAsli = url.searchParams.get("namaAsli")?.trim();
	const mime = headers.get("content-type")?.split(";", 1)[0] ?? null;
	const jenisRekomendasiMentah = url.searchParams.get("jenisRekomendasi");

	if (!namaAsli || !mimeValid(mime)) return null;
	if (!mimeDiizinkan(kelompok).includes(mime)) return null;

	if (kelompok === 7) {
		if (jenisRekomendasiMentah !== "A3_PW" && jenisRekomendasiMentah !== "A4_PD") return null;
		return { namaAsli, mime, jenisRekomendasi: jenisRekomendasiMentah };
	}
	if (jenisRekomendasiMentah !== null) return null; // dilarang di luar kelompok 7
	return { namaAsli, mime, jenisRekomendasi: null };
}

/**
 * Mengintip `minByte` byte pertama sebuah stream tanpa membuang sisanya: hasilnya
 * `awal` (byte yang sudah dibaca, untuk cek signature) dan `penuh`, stream baru
 * yang mengalirkan `awal` lebih dulu lalu melanjutkan pembacaan reader asli — jadi
 * isi stream tetap utuh untuk di-tee ke R2.put + digest, tanpa pernah membuffer
 * lebih dari `minByte` byte sekaligus di titik ini.
 */
function pisahkanAwal(readable: ReadableStream<Uint8Array>, minByte: number): {
	awal: Promise<Uint8Array>;
	penuh: ReadableStream<Uint8Array>;
} {
	const reader = readable.getReader();
	let resolveAwal: (nilai: Uint8Array) => void;
	const awal = new Promise<Uint8Array>((resolve) => {
		resolveAwal = resolve;
	});

	const penuh = new ReadableStream<Uint8Array>({
		async start(controller) {
			const potongan: Uint8Array[] = [];
			let total = 0;
			while (total < minByte) {
				const { done, value } = await reader.read();
				if (done) break;
				potongan.push(value);
				total += value.byteLength;
			}
			const gabung = new Uint8Array(total);
			let offset = 0;
			for (const bagian of potongan) {
				gabung.set(bagian, offset);
				offset += bagian.byteLength;
			}
			resolveAwal(gabung);
			if (gabung.byteLength) controller.enqueue(gabung);
		},
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				controller.close();
				return;
			}
			controller.enqueue(value);
		},
		cancel(reason) {
			return reader.cancel(reason);
		},
	});

	return { awal, penuh };
}

function hex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validasi + unggah streaming satu berkas Bakal Calon ke `berkas/<UUIDv4>`.
 * Urutan mengikuti spec: Content-Length → metadata/kelompok → ekstensi →
 * signature (dari byte awal yang diintip, bukan buffer penuh) → R2.put yang
 * di-tee bersamaan dengan `crypto.DigestStream` untuk SHA-256. Kegagalan pada
 * tahap mana pun setelah R2.put membersihkan objek R2 sebelum menjawab gagal —
 * caller (rute) tetap bertanggung jawab menghapus objek R2 bila INSERT D1
 * sesudahnya gagal, karena itu terjadi di luar fungsi ini.
 */
export async function unggahBerkas(
	request: Request,
	bucket: R2Bucket,
	kelompok: NomorKelompok,
): Promise<HasilUnggahBerkas> {
	const contentLength = contentLengthValid(request.headers);
	if (contentLength === null) return { ok: false, status: 400, error: "content_length_tidak_valid" };

	const meta = bacaMeta(new URL(request.url), request.headers, kelompok);
	if (!meta) return { ok: false, status: 400, error: "metadata_tidak_valid" };

	if (!ekstensiCocok(meta.namaAsli, meta.mime)) {
		return { ok: false, status: 400, error: "ekstensi_tidak_cocok" };
	}

	if (!request.body) return { ok: false, status: 400, error: "berkas_kosong" };

	const { awal, penuh } = pisahkanAwal(request.body, PANJANG_SIGNATURE_MAKS);
	if (!signatureCocok(await awal, meta.mime)) {
		await penuh.cancel().catch(() => undefined);
		return { ok: false, status: 400, error: "signature_tidak_cocok" };
	}

	const [cabangR2, cabangDigest] = penuh.tee();
	const digestStream = new crypto.DigestStream("SHA-256");
	const r2Key = `berkas/${crypto.randomUUID()}`;

	// R2Bucket.put() menolak ReadableStream tanpa panjang diketahui (error runtime:
	// "Provided readable stream must have a known length (request/response body or
	// readable half of FixedLengthStream)"). Stream rekonstruksi kita (byte awal +
	// sisa reader) tidak membawa panjang, jadi dibungkus lewat FixedLengthStream
	// dengan Content-Length yang sudah tervalidasi — R2 membaca dari sisi
	// `readable`-nya, yang MEMANG membawa panjang diketahui.
	const panjangTetap = new FixedLengthStream(contentLength);
	const tulisKeFixedLength = cabangR2.pipeTo(panjangTetap.writable);

	let ukuranByte: number;
	let sha256Buffer: ArrayBuffer;
	try {
		await Promise.all([
			bucket.put(r2Key, panjangTetap.readable, { httpMetadata: { contentType: meta.mime } }),
			cabangDigest.pipeTo(digestStream),
			tulisKeFixedLength,
		]);
		ukuranByte = Number(digestStream.bytesWritten);
		sha256Buffer = await digestStream.digest;
	} catch {
		await bucket.delete(r2Key).catch(() => undefined);
		return { ok: false, status: 400, error: "unggah_gagal" };
	}

	if (ukuranByte !== contentLength) {
		await bucket.delete(r2Key).catch(() => undefined);
		return { ok: false, status: 400, error: "ukuran_tidak_cocok" };
	}

	return { ok: true, r2Key, meta, ukuranByte, sha256: hex(sha256Buffer) };
}
