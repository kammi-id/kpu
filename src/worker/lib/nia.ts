import type { EnvDenganRahasia } from "./auth";

// Verifikasi NIA (spec "Logika verifikasi bersama"): satu-satunya sumber
// kebenaran dipakai ulang oleh endpoint pengecekan interaktif (tiket 03) dan
// handler pendaftaran akhir (tiket 04) — kedua tempat itu tidak boleh berbeda
// perilaku secara tidak sengaja. Urutan pengecekan SENGAJA: format → duplikat
// lokal → panggilan eksternal, supaya duplikat yang sudah diketahui tidak
// memicu panggilan API yang tidak perlu.
//
// URL dasar kammi.id adalah konstanta tetap (mengikuti pola URL siteverify
// Turnstile di src/worker/index.ts, juga tetap, bukan env var).
const KAMMI_ID_MEMBERS_URL = "https://www.kammi.id/api/v1/members";

/** Respons sukses mentah dari kammi.id — hanya field yang benar-benar dipakai. */
type AnggotaKammiId = {
	nama: string;
	jenjangKaderisasi: string;
	keadaanKader: string;
};

export type AlasanGagalVerifikasiNia =
	| "formatTidakValid"
	| "duplikatLokal"
	| "tidakDitemukan"
	| "tidakMemenuhiSyarat"
	// Jaringan gagal atau status HTTP lain dari kammi.id: generik, boleh dicoba
	// ulang, berbeda dari "tidakDitemukan"/"tidakMemenuhiSyarat" yang final.
	| "gagalUpstream";

export type HasilVerifikasiNia = { sukses: true; nama: string } | { sukses: false; alasan: AlasanGagalVerifikasiNia };

/**
 * Verifikasi satu NIA: format 11 digit → duplikat lokal (tabel "user") →
 * kecocokan + kelayakan (Anggota Biasa III aktif) lewat Sistem Keanggotaan
 * KAMMI (kammi.id). Mengembalikan nama terverifikasi persis dari kammi.id
 * (dipakai downstream untuk mengisi kolom "name"), atau alasan gagal spesifik.
 */
export async function verifikasiNia(nia: string, env: EnvDenganRahasia): Promise<HasilVerifikasiNia> {
	if (!/^[0-9]{11}$/.test(nia)) return { sukses: false, alasan: "formatTidakValid" };

	const duplikat = await env.DB.prepare(`SELECT 1 FROM "user" WHERE "nia" = ? AND "role" = 'bacalon' LIMIT 1`)
		.bind(nia)
		.first();
	if (duplikat) return { sukses: false, alasan: "duplikatLokal" };

	try {
		const response = await fetch(`${KAMMI_ID_MEMBERS_URL}/${nia}`, {
			headers: { authorization: `Bearer ${env.KAMMI_ID_TOKEN}` },
			signal: AbortSignal.timeout(10_000),
		});
		if (response.status === 404) return { sukses: false, alasan: "tidakDitemukan" };
		if (!response.ok) return { sukses: false, alasan: "gagalUpstream" };

		const anggota = (await response.json()) as AnggotaKammiId;
		if (anggota.jenjangKaderisasi !== "AB3" || anggota.keadaanKader !== "aktif") {
			return { sukses: false, alasan: "tidakMemenuhiSyarat" };
		}
		return { sukses: true, nama: anggota.nama };
	} catch {
		return { sukses: false, alasan: "gagalUpstream" };
	}
}
