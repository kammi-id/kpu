import { useEffect, useState } from "react";
import { ambilTahap, type TahapApi } from "./tahap";

interface UseTahapState {
	data: TahapApi | null;
	error: boolean;
}

/**
 * Umur singgahan permintaan bersama. Tujuh komponen memanggil `useTahap()` dan
 * sampai tiga di antaranya hidup bersamaan (App + Header + rute), jadi tanpa ini
 * satu kali muat halaman menembakkan tiga `/api/tahap` — rute itu `no-store`,
 * jadi ketiganya benar-benar sampai ke jaringan. Satu menit: cukup rapat untuk
 * batas tahap yang ditulis sampai menit (mis. 23.59 WIB), cukup longgar untuk
 * menyatukan semua pemanggil dalam satu kali render.
 */
const UMUR_SINGGAHAN_MS = 60_000;

let singgahan: { promise: Promise<TahapApi>; dibuatPada: number } | null = null;

function tahapBersama(): Promise<TahapApi> {
	const sekarang = Date.now();
	if (singgahan && sekarang - singgahan.dibuatPada < UMUR_SINGGAHAN_MS) return singgahan.promise;

	// Kegagalan tidak disinggahkan: pemanggil berikutnya harus boleh mencoba lagi,
	// bukan mewarisi error selama satu menit.
	const promise = ambilTahap().catch((err) => {
		if (singgahan?.promise === promise) singgahan = null;
		throw err;
	});
	singgahan = { promise, dibuatPada: sekarang };
	return promise;
}

/** Sumber tunggal tahap di klien: selalu jam server lewat /api/tahap, tidak pernah jam perangkat. */
export function useTahap(): UseTahapState {
	const [data, setData] = useState<TahapApi | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		// Tidak ada AbortController di sini: permintaannya dipakai bersama, jadi
		// membatalkan saat satu komponen lepas akan menggugurkan yang lain juga.
		// Cukup abaikan hasilnya bila komponen ini sudah tidak terpasang.
		let terpasang = true;
		tahapBersama()
			.then((hasil) => {
				if (terpasang) setData(hasil);
			})
			.catch(() => {
				if (terpasang) setError(true);
			});
		return () => {
			terpasang = false;
		};
	}, []);

	return { data, error };
}
