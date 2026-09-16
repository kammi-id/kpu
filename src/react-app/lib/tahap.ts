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
	status: StatusJadwal;
}

export interface TahapApi {
	sekarang: string;
	tahap: Tahap;
	bolehRegistrasi: boolean;
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
	MasaPendaftaran: "Pendaftaran dibuka sampai 26 September 2026 pukul 23.59 WIB.",
	Pemeriksaan:
		"KPU sedang memeriksa berkas. Data dan berkas hanya-baca sampai 29 September 2026 pukul 23.59 WIB.",
	MasaPerbaikan: "Lengkapi kekurangan sampai 3 Oktober 2026 pukul 23.59 WIB.",
	Terkunci: "Pendaftaran dan perubahan data telah ditutup untuk siklus ini.",
	Selesai: "Proses penjaringan telah selesai dan data telah dihapus.",
};

export async function ambilTahap(signal?: AbortSignal): Promise<TahapApi> {
	const response = await fetch("/api/tahap", { signal });
	if (!response.ok) {
		throw new Error(`Gagal memuat tahap: ${response.status}`);
	}
	return (await response.json()) as TahapApi;
}
