// Sepuluh kelompok berkas Bakal Calon: konstanta kode (tiket 02), dipakai Worker
// (batas MIME/nomor) dan React (label + ketentuan format di /akun/berkas). Kelompok
// 7 tidak "hadir" lewat satu berkas, tapi lewat ambang jenisRekomendasi — lihat
// `vKelengkapan` di migrations/0001_init.sql, satu-satunya sumber kelengkapan.

export type NomorKelompok = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type JenisRekomendasi = "A3_PW" | "A4_PD";

export interface KelompokBerkas {
	nomor: NomorKelompok;
	label: string;
	/** Ketentuan format ditampilkan apa adanya di halaman /akun/berkas/:no. */
	ketentuanFormat: string;
	/** true hanya untuk kelompok 6 (karya tulis ilmiah asli). */
	hanyaPdf: boolean;
	/** Catatan tambahan, mis. ambang hadir kelompok 7. */
	catatan?: string;
}

export const KELOMPOK_BERKAS: readonly KelompokBerkas[] = [
	{ nomor: 1, label: "Formulir A.1 yang telah ditandatangani", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 2, label: "KTA atau Sertifikat DM 3", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 3, label: "SK kepengurusan PD dan/atau PW", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 4, label: "Sertifikat atau SK Instruktur KAMMI", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 5, label: "Surat keterangan sehat jasmani dan rohani", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 6, label: "Karya tulis ilmiah asli", ketentuanFormat: "PDF saja, maksimum 20 MB.", hanyaPdf: true },
	{
		nomor: 7,
		label: "Rekomendasi A.3 dan/atau A.4",
		ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB. Setiap unggahan memilih asal: A.3 dari PW atau A.4 dari PD.",
		hanyaPdf: false,
		catatan: "Hadir dengan 2 rekomendasi A.3 dari PW, atau 3 rekomendasi A.4 dari PD. Campuran keduanya tidak dihitung.",
	},
	{ nomor: 8, label: "Komitmen hafalan A.5", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 9, label: "Pernyataan tidak sedang dijatuhi sanksi A.6", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
	{ nomor: 10, label: "Bukti transfer biaya pendaftaran", ketentuanFormat: "PDF, JPEG, atau PNG, maksimum 20 MB.", hanyaPdf: false },
] as const;

export function kelompokValid(nilai: number): nilai is NomorKelompok {
	return Number.isInteger(nilai) && nilai >= 1 && nilai <= 10;
}

export function kelompokBerkas(nomor: NomorKelompok): KelompokBerkas {
	// KELOMPOK_BERKAS terurut 1..10, jadi indeks nomor-1 selalu ada.
	return KELOMPOK_BERKAS[nomor - 1];
}

/** kelompok 6 = PDF saja, sembilan lainnya = PDF/JPEG/PNG (spec "Kelompok berkas dan unggahan"). */
export function mimeDiizinkan(nomor: NomorKelompok): readonly string[] {
	return nomor === 6 ? ["application/pdf"] : ["application/pdf", "image/jpeg", "image/png"];
}
