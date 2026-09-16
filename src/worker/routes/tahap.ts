import { Hono } from "hono";
import {
	JADWAL_SEPULUH,
	bolehRegistrasi,
	bolehUbahBacalon,
	layananAktif,
	statusJadwal,
	tahapPada,
} from "../lib/tahap";

/**
 * Satu-satunya sumber tahap untuk klien: spanduk beranda, sidebar akun, dan /jadwal
 * semuanya membaca jam server lewat rute ini, bukan jam perangkat.
 */
export function buatRuteTahap(sekarang: () => Date) {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", (c) => {
		const now = sekarang();
		const tahap = tahapPada(now);
		return c.json({
			sekarang: now.toISOString(),
			tahap,
			bolehRegistrasi: bolehRegistrasi(tahap),
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
