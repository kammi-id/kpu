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
