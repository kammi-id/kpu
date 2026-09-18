import type { StrukturKammiId } from "./struktur";

// Pencocokan lokasi hasil ekstraksi A.1 (tiket 23) terhadap daftar struktur
// kammi.id (tiket 21): normalisasi huruf besar/kecil, spasi berulang, dan
// awalan umum ("PW"/"Pengurus Wilayah"/"PD"/"Pengurus Daerah") lalu
// dibandingkan persis — bukan pencocokan jarak-edit, spec hanya meminta
// normalisasi dasar (issues/23, poin 3).
const AWALAN = [/^pengurus\s+wilayah\s+/, /^pengurus\s+daerah\s+/, /^pw\s+/, /^pd\s+/];

function normalisasi(teks: string): string {
	let hasil = teks.trim().toLowerCase().replace(/\s+/g, " ");
	for (const awalan of AWALAN) hasil = hasil.replace(awalan, "");
	return hasil.trim();
}

/** `null` bila tidak ada satu pun entri `daftar` yang cocok setelah normalisasi. */
export function cocokkanStruktur(teks: string, daftar: readonly StrukturKammiId[]): StrukturKammiId | null {
	const target = normalisasi(teks);
	if (!target) return null;
	return daftar.find((entri) => normalisasi(entri.nama) === target) ?? null;
}
