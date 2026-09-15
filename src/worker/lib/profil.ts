// Modul murni: validator Data pribadi (tiket 12), tanpa akses D1. Mencerminkan
// gaya `whatsappTernormalisasi` di lib/auth.ts — mudah diuji tanpa seam Worker.

const POLA_TANGGAL_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tanggal kalender sungguhan berformat YYYY-MM-DD, mencerminkan CHECK D1
 * `date("tanggalLahir") = "tanggalLahir"`. `new Date(Date.UTC(...))`
 * menormalkan tanggal tak sah (mis. 2026-02-30 → 2026-03-02), jadi komponen
 * hasil dicocokkan ulang terhadap input untuk menolaknya.
 */
export function tanggalLahirValid(tanggal: string): boolean {
	if (!POLA_TANGGAL_ISO.test(tanggal)) return false;
	const [tahun, bulan, hari] = tanggal.split("-").map(Number);
	const tanggalDinormalisasi = new Date(Date.UTC(tahun, bulan - 1, hari));
	return (
		tanggalDinormalisasi.getUTCFullYear() === tahun &&
		tanggalDinormalisasi.getUTCMonth() === bulan - 1 &&
		tanggalDinormalisasi.getUTCDate() === hari
	);
}

/** Batas tahun lulus DM 3, mencerminkan CHECK D1 `"tahunLulusDm3" BETWEEN 1998 AND 2026`. */
export function tahunLulusDm3Valid(tahun: number): boolean {
	return Number.isInteger(tahun) && tahun >= 1998 && tahun <= 2026;
}

// eslint-disable-next-line no-control-regex -- karakter kontrol memang yang dicari, bukan kesalahan ketik.
const POLA_KARAKTER_KONTROL = /[\x00-\x1F\x7F]/;

/**
 * Field teks bebas (nama, Data pribadi) harus satu baris: tanpa karakter
 * kontrol (CR, LF, tab, dst). Nilainya berakhir sebagai kolom CSV Ekspor
 * Harian (lib/ekspor.ts), yang dikutip dengan benar tapi dipecah per baris
 * mentah oleh `hapusBarisCsvBacalon` — CR/LF di tengah nilai akan memecah
 * satu baris CSV jadi dua dan merusak baris berikutnya saat Hapus data akun
 * (tiket 17) menghapus barisnya.
 */
export function teksSatuBarisValid(teks: string): boolean {
	return !POLA_KARAKTER_KONTROL.test(teks);
}
