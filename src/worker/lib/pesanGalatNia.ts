import type { AlasanGagalVerifikasiNia } from "./nia";

/**
 * Pemetaan satu-satunya dari alasan gagal `verifikasiNia` ke status HTTP dan
 * kode galat — dipakai bersama oleh endpoint Cek NIA (tiket 03) dan
 * penggerbangan pendaftaran akhir (tiket 04), supaya klien menerima kode
 * yang sama untuk alasan gagal yang sama di kedua tempat.
 */
const PESAN_GALAT_NIA: Record<AlasanGagalVerifikasiNia, { status: 400 | 403 | 404 | 409 | 502; error: string }> = {
	formatTidakValid: { status: 400, error: "nia_format_tidak_valid" },
	duplikatLokal: { status: 409, error: "nia_sudah_terdaftar" },
	tidakDitemukan: { status: 404, error: "nia_tidak_ditemukan" },
	tidakMemenuhiSyarat: { status: 403, error: "nia_tidak_memenuhi_syarat" },
	gagalUpstream: { status: 502, error: "nia_gagal_upstream" },
};

export function pesanGalatVerifikasiNia(alasan: AlasanGagalVerifikasiNia) {
	return PESAN_GALAT_NIA[alasan];
}
