export type Tahap =
	| "BelumDibuka"
	| "MasaPendaftaran"
	| "Pemeriksaan"
	| "MasaPerbaikan"
	| "Terkunci"
	| "Selesai";

export type StatusJadwal = "selesai" | "berjalan" | "terjadwal";

export interface JadwalItemApi {
	nama: string;
	rentangWib: string;
	keterangan: string;
	status: StatusJadwal;
}

export interface TahapApi {
	sekarang: string;
	tahap: Tahap;
	bolehRegistrasi: boolean;
	/** Penutupan Pendaftaran Manual (lihat CONTEXT.md): true hanya bila itu sebab sebenarnya `bolehRegistrasi` bernilai false. */
	pendaftaranDitutupManual: boolean;
	bolehUbahBacalon: boolean;
	layananAktif: boolean;
	jadwal: JadwalItemApi[];
}

export const LABEL_TAHAP: Record<Tahap, string> = {
	BelumDibuka: "Belum dibuka",
	MasaPendaftaran: "Masa Pendaftaran",
	Pemeriksaan: "Pemeriksaan",
	MasaPerbaikan: "Masa Perbaikan",
	Terkunci: "Terkunci",
	Selesai: "Selesai",
};

export const PENJELASAN_TAHAP: Record<Tahap, string> = {
	BelumDibuka:
		"Pendaftaran belum dibuka. Masa Pendaftaran mulai 17 September 2026 pukul 00.00 WIB.",
	MasaPendaftaran: "Pendaftaran diperpanjang sampai 30 September 2026 pukul 23.59 WIB.",
	Pemeriksaan:
		"KPU sedang memeriksa berkas. Data dan berkas hanya-baca sampai 2 Oktober 2026 pukul 23.59 WIB.",
	MasaPerbaikan: "Lengkapi kekurangan sampai 5 Oktober 2026 pukul 23.59 WIB.",
	Terkunci: "Pendaftaran dan perubahan data telah ditutup untuk siklus ini.",
	Selesai: "Proses penjaringan telah selesai dan data telah dihapus.",
};

/** Tanda pembaruan berhenti saat Masa Pendaftaran yang diperpanjang berakhir. */
export function tampilkanBadgePembaruan(sekarang?: string): boolean {
	return Boolean(sekarang && new Date(sekarang).getTime() < Date.UTC(2026, 8, 30, 17));
}

/** Alasan tampil saat pendaftaran ditutup: Penutupan Pendaftaran Manual mengalahkan penjelasan tahap. */
export function alasanPendaftaranTertutup(data: TahapApi): string {
	if (data.pendaftaranDitutupManual) return "Pendaftaran sedang ditutup sementara oleh Admin.";
	return PENJELASAN_TAHAP[data.tahap];
}

export async function ambilTahap(signal?: AbortSignal): Promise<TahapApi> {
	const response = await fetch("/api/tahap", { signal });
	if (!response.ok) {
		throw new Error(`Gagal memuat tahap: ${response.status}`);
	}
	return (await response.json()) as TahapApi;
}
