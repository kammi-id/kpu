import { Hono } from "hono";
import {
	JADWAL_SEPULUH,
	bolehRegistrasi,
	bolehUbahBacalon,
	layananAktif,
	statusJadwal,
	tahapPada,
} from "../lib/tahap";
import { pendaftaranDitutupManual } from "../lib/pengaturan";

/**
 * Satu-satunya sumber tahap untuk klien: spanduk beranda, sidebar akun, dan /jadwal
 * semuanya membaca jam server lewat rute ini, bukan jam perangkat. `bolehRegistrasi`
 * juga memperhitungkan Penutupan Pendaftaran Manual (lihat CONTEXT.md) — klien
 * membedakan sebabnya lewat `pendaftaranDitutupManual`, bukan menghitung ulang.
 */
export function buatRuteTahap(sekarang: () => Date) {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", async (c) => {
		const now = sekarang();
		const tahap = tahapPada(now);
		// Hanya relevan sebagai "sebab" saat tahap sendiri sebenarnya mengizinkan
		// registrasi — kalau tidak, klien tetap menampilkan alasan tahap (mis. Pemeriksaan).
		const ditutupManual = bolehRegistrasi(tahap) && (await pendaftaranDitutupManual(c.env.DB));
		return c.json({
			sekarang: now.toISOString(),
			tahap,
			bolehRegistrasi: bolehRegistrasi(tahap) && !ditutupManual,
			pendaftaranDitutupManual: ditutupManual,
			bolehUbahBacalon: bolehUbahBacalon(tahap),
			layananAktif: layananAktif(tahap),
			jadwal: JADWAL_SEPULUH.map((item) => ({
				nama: item.nama,
				rentangWib: item.rentangWib,
				status: statusJadwal(item, now),
			})),
		});
	});

	return route;
}
