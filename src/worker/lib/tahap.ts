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
const MULAI_PEMERIKSAAN = Date.UTC(2026, 8, 30, 17, 0, 0); // 1 Okt 2026 00.00 WIB
const MULAI_MASA_PERBAIKAN = Date.UTC(2026, 9, 2, 17, 0, 0); // 3 Okt 2026 00.00 WIB
const MULAI_TERKUNCI = Date.UTC(2026, 9, 5, 17, 0, 0); // 6 Okt 2026 00.00 WIB
const MULAI_SELESAI = Date.UTC(2027, 0, 27, 17, 0, 0); // 28 Jan 2027 00.00 WIB

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
	/** Kolom "Keterangan" Lampiran I PKPU 01/2026 (mis. tema debat). */
	keterangan: string;
	mulai: number;
	/** null berarti tidak berakhir (Forum Muktamar seterusnya). */
	akhirEksklusif: number | null;
}

/** Jadwal pengumuman September 2026. Perubahan jadwal berarti deploy ulang. */
export const JADWAL_TAHAPAN: readonly JadwalItem[] = [
	{
		nama: "Pengumuman & Sosialisasi",
		rentangWib: "13–16 September 2026",
		keterangan: "Sosialisasi berkas ke seluruh PW/PD KAMMI",
		mulai: Date.UTC(2026, 8, 12, 17, 0, 0),
		akhirEksklusif: MULAI_MASA_PENDAFTARAN,
	},
	{
		nama: "Pengambilan & Pengembalian Berkas Pendaftaran",
		rentangWib: "17–30 September 2026",
		keterangan: "Penyerahan berkas dan biaya pendaftaran Rp3.000.000,-",
		mulai: MULAI_MASA_PENDAFTARAN,
		akhirEksklusif: MULAI_PEMERIKSAAN,
	},
	{
		nama: "Verifikasi Berkas Administrasi & Uji Kualifikasi",
		rentangWib: "1–2 Oktober 2026",
		keterangan: "Verifikasi oleh KPU",
		mulai: MULAI_PEMERIKSAAN,
		akhirEksklusif: MULAI_MASA_PERBAIKAN,
	},
	{
		nama: "Masa Perbaikan & Pemenuhan Berkas",
		rentangWib: "3–5 Oktober 2026",
		keterangan: "Masa sanggah dan perbaikan kelengkapan berkas",
		mulai: MULAI_MASA_PERBAIKAN,
		akhirEksklusif: MULAI_TERKUNCI,
	},
	{
		nama: "Penetapan & Pengumuman Calon Ketua Umum Tetap",
		rentangWib: "6 Oktober 2026",
		keterangan: "Penetapan resmi oleh KPU",
		mulai: MULAI_TERKUNCI,
		akhirEksklusif: Date.UTC(2026, 9, 6, 17, 0, 0),
	},
	{
		nama: "Penyampaian Visi-Misi & Kampanye",
		rentangWib: "6–27 Oktober 2026",
		keterangan: "Sosialisasi gagasan kandidat",
		mulai: MULAI_TERKUNCI,
		akhirEksklusif: Date.UTC(2026, 9, 27, 17, 0, 0),
	},
	{
		nama: "Debat Kandidat",
		rentangWib: "17 Oktober 2026",
		keterangan: "Debat Calon Ketua Umum",
		mulai: Date.UTC(2026, 9, 16, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 17, 17, 0, 0),
	},
	{
		nama: "Masa Tenang Pemilihan",
		rentangWib: "28–29 Oktober 2026",
		keterangan: "Penghentian seluruh kegiatan kampanye",
		mulai: Date.UTC(2026, 9, 27, 17, 0, 0),
		akhirEksklusif: Date.UTC(2026, 9, 29, 17, 0, 0),
	},
	{
		nama: "Forum Muktamar KAMMI",
		rentangWib: "30 Oktober 2026 – selesai",
		keterangan: "Musyawarah dan pemilihan Ketua Umum PP KAMMI",
		mulai: Date.UTC(2026, 9, 29, 17, 0, 0),
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
