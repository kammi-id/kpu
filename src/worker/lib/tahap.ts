// Modul murni: tahap operasional turun dari jam server, tidak pernah dari D1.
// Kalender dan batas berasal dari tiket 02 (dasar) dan tiket 06 (amandemen, tahap Selesai).

export type Tahap =
	| "BelumDibuka"
	| "MasaPendaftaran"
	| "Pemeriksaan"
	| "MasaPerbaikan"
	| "Terkunci"
	| "Selesai";

// Batas tahap: instan UTC. WIB = UTC+7 tanpa DST. Setiap batas inklusif di awal, eksklusif di akhir.
const MULAI_MASA_PENDAFTARAN = Date.UTC(2026, 8, 16, 17, 0, 0); // 17 Sep 2026 00.00 WIB
const MULAI_PEMERIKSAAN = Date.UTC(2026, 9, 4, 17, 0, 0); // 5 Okt 2026 00.00 WIB
const MULAI_MASA_PERBAIKAN = Date.UTC(2026, 9, 7, 17, 0, 0); // 8 Okt 2026 00.00 WIB
const MULAI_TERKUNCI = Date.UTC(2026, 9, 11, 17, 0, 0); // 12 Okt 2026 00.00 WIB
const MULAI_SELESAI = Date.UTC(2027, 0, 24, 17, 0, 0); // 25 Jan 2027 00.00 WIB

export function tahapPada(sekarang: Date): Tahap {
	const t = sekarang.getTime();
	if (t >= MULAI_SELESAI) return "Selesai";
	if (t >= MULAI_TERKUNCI) return "Terkunci";
	if (t >= MULAI_MASA_PERBAIKAN) return "MasaPerbaikan";
	if (t >= MULAI_PEMERIKSAAN) return "Pemeriksaan";
	if (t >= MULAI_MASA_PENDAFTARAN) return "MasaPendaftaran";
	return "BelumDibuka";
}

/** Hanya Masa Pendaftaran mengizinkan pembuatan akun baru. */
export function bolehRegistrasi(tahap: Tahap): boolean {
	return tahap === "MasaPendaftaran";
}

/** Masa Pendaftaran dan Masa Perbaikan mengizinkan Bakal Calon mengubah data dan berkas. */
export function bolehUbahBacalon(tahap: Tahap): boolean {
	return tahap === "MasaPendaftaran" || tahap === "MasaPerbaikan";
}

/** Semua tahap selain Selesai masih melayani login, baca, dan fungsi Admin. */
export function layananAktif(tahap: Tahap): boolean {
	return tahap !== "Selesai";
}

export interface JadwalItem {
	nama: string;
	rentangWib: string;
	mulai: number;
	/** null berarti tidak berakhir (Forum Muktamar seterusnya). */
	akhirEksklusif: number | null;
}

/** Sepuluh tahap resmi tiket 02, konstanta kode. Perubahan jadwal berarti deploy ulang. */
export const JADWAL_SEPULUH: readonly JadwalItem[] = [
	{
		nama: "Pengumuman dan sosialisasi",
		rentangWib: "13–16 September 2026",
		mulai: Date.UTC(2026, 8, 12, 17, 0, 0),
		akhirEksklusif: MULAI_MASA_PENDAFTARAN,
	},
	{
		nama: "Pengambilan dan pengembalian berkas",
		rentangWib: "17 September–4 Oktober 2026",
		mulai: MULAI_MASA_PENDAFTARAN,
		akhirEksklusif: MULAI_PEMERIKSAAN,
	},
	{
		nama: "Verifikasi administrasi dan uji kualifikasi",
		rentangWib: "5–7 Oktober 2026",
		mulai: MULAI_PEMERIKSAAN,
		akhirEksklusif: MULAI_MASA_PERBAIKAN,
	},
	{
		nama: "Perbaikan kelengkapan",
		rentangWib: "8–11 Oktober 2026",
		mulai: MULAI_MASA_PERBAIKAN,
		akhirEksklusif: MULAI_TERKUNCI,
	},
	{
		nama: "Penetapan",
		rentangWib: "12 Oktober 2026",
		mulai: MULAI_TERKUNCI,
		akhirEksklusif: Date.UTC(2026, 9, 12, 17, 0, 0),
	},
	{
		nama: "Visi-misi dan kampanye",
		rentangWib: "13–18 Oktober 2026",
		mulai: Date.UTC(2026, 9, 12, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 18, 17, 0, 0),
	},
	{
		nama: "Debat I",
		rentangWib: "19 Oktober 2026",
		mulai: Date.UTC(2026, 9, 18, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 19, 17, 0, 0),
	},
	{
		nama: "Debat II",
		rentangWib: "23 Oktober 2026",
		mulai: Date.UTC(2026, 9, 22, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 23, 17, 0, 0),
	},
	{
		nama: "Masa tenang",
		rentangWib: "25–26 Oktober 2026",
		mulai: Date.UTC(2026, 9, 24, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 26, 17, 0, 0),
	},
	{
		nama: "Forum Muktamar",
		rentangWib: "mulai 27 Oktober 2026",
		mulai: Date.UTC(2026, 9, 26, 17, 0, 0),
		akhirEksklusif: null,
	},
] as const;

export type StatusJadwal = "selesai" | "berjalan" | "terjadwal";

export function statusJadwal(item: JadwalItem, sekarang: Date): StatusJadwal {
	const t = sekarang.getTime();
	if (t < item.mulai) return "terjadwal";
	if (item.akhirEksklusif !== null && t >= item.akhirEksklusif) return "selesai";
	return "berjalan";
}
