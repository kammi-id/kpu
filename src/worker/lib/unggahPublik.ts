// Kontrak unggah Berkas Publik (spec "Kelompok berkas dan unggahan"): body permintaan
// adalah byte berkas mentah, bukan multipart/form-data, dengan `Content-Length` wajib
// sama dengan ukuran berkas. Metadata (judul, kategori, urutan, namaAsli, mime) berjalan
// lewat query string, bukan body. Kontrak yang sama nanti dipakai unggahan berkas Bakal
// Calon (tiket 13) — helper ini sengaja tetap sesempit ruang lingkup tiket 11.

export const MAKS_UKURAN_BERKAS_PUBLIK = 20 * 1024 * 1024;

const MIME_DIIZINKAN = {
	"application/pdf": {
		ekstensi: "pdf",
		signature: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
	},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
		ekstensi: "docx",
		signature: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04
	},
} as const;

export type MimeBerkasPublik = keyof typeof MIME_DIIZINKAN;

export type KategoriBerkasPublik = "peraturan" | "formulir";

export type MetaBerkasPublik = {
	judul: string;
	kategori: KategoriBerkasPublik;
	urutan: number;
	namaAsli: string;
	mime: MimeBerkasPublik;
};

export type HasilValidasiUnggah =
	| { ok: true; bytes: Uint8Array; meta: MetaBerkasPublik }
	| { ok: false; status: number; error: string };

function mimeValid(nilai: string | null): nilai is MimeBerkasPublik {
	return nilai === "application/pdf" || nilai === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function bacaMeta(url: URL, headers: Headers): MetaBerkasPublik | null {
	const judul = url.searchParams.get("judul")?.trim();
	const kategori = url.searchParams.get("kategori");
	const namaAsli = url.searchParams.get("namaAsli")?.trim();
	const mime = headers.get("content-type")?.split(";", 1)[0] ?? null;
	const urutanMentah = url.searchParams.get("urutan");

	if (!judul || !namaAsli) return null;
	if (kategori !== "peraturan" && kategori !== "formulir") return null;
	if (!mimeValid(mime)) return null;

	const urutan = Number(urutanMentah);
	if (!Number.isInteger(urutan) || urutan < 0) return null;

	return { judul, kategori, urutan, namaAsli, mime };
}

function ekstensiCocok(namaAsli: string, mime: MimeBerkasPublik): boolean {
	const ekstensi = namaAsli.toLowerCase().split(".").pop();
	return ekstensi === MIME_DIIZINKAN[mime].ekstensi;
}

function signatureCocok(bytes: Uint8Array, mime: MimeBerkasPublik): boolean {
	const signature = MIME_DIIZINKAN[mime].signature;
	if (bytes.length < signature.length) return false;
	return signature.every((byte, index) => bytes[index] === byte);
}

function contentLengthValid(headers: Headers): number | null {
	const mentah = headers.get("content-length");
	if (!mentah) return null;
	const nilai = Number(mentah);
	if (!Number.isInteger(nilai) || nilai <= 0 || nilai > MAKS_UKURAN_BERKAS_PUBLIK) return null;
	return nilai;
}

/**
 * Validasi urutan unggah Berkas Publik: `Content-Length` lebih dulu (tolak sebelum
 * menyentuh R2), lalu metadata, ekstensi, dan signature byte awal berkas.
 */
export async function validasiUnggahPublik(request: Request): Promise<HasilValidasiUnggah> {
	const contentLength = contentLengthValid(request.headers);
	if (contentLength === null) return { ok: false, status: 400, error: "content_length_tidak_valid" };

	const meta = bacaMeta(new URL(request.url), request.headers);
	if (!meta) return { ok: false, status: 400, error: "metadata_tidak_valid" };

	if (!ekstensiCocok(meta.namaAsli, meta.mime)) {
		return { ok: false, status: 400, error: "ekstensi_tidak_cocok" };
	}

	// Dibuffer penuh dengan sengaja: Berkas Publik tidak butuh SHA-256 (tak ada
	// kolom itu di `berkasPublik`) dan dibatasi 20 MiB, jauh di bawah batas
	// memori Worker. Tiket 13 (unggahan Bakal Calon) BUTUH digest sambil-jalan
	// per spec "Kelompok berkas dan unggahan" — jangan salin pola ini untuk itu.
	const bytes = new Uint8Array(await request.arrayBuffer());
	if (bytes.byteLength !== contentLength) {
		return { ok: false, status: 400, error: "ukuran_tidak_cocok" };
	}
	if (!signatureCocok(bytes, meta.mime)) {
		return { ok: false, status: 400, error: "signature_tidak_cocok" };
	}

	return { ok: true, bytes, meta };
}
