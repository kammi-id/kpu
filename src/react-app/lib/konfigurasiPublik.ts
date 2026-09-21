export interface KonfigurasiPublik {
	turnstileSiteKey?: string;
	onboardTersedia?: boolean;
}

/**
 * Singgahan permintaan bersama untuk `/api/konfigurasi-publik`. Jawabannya
 * tetap selama satu kali muat halaman (site key Turnstile dan ada-tidaknya
 * Admin bersama), tapi pemanggilnya berpasangan — `/masuk` memuat Masuk.tsx
 * dan Turnstile.tsx sekaligus, `/daftar` begitu juga — sehingga tanpa ini satu
 * halaman menembakkan dua permintaan identik ke rute yang `no-store`.
 *
 * Tidak berumur seperti singgahan tahap: nilainya tidak terikat waktu, dan
 * perubahannya (Admin pertama dibuat) selalu disertai navigasi penuh.
 */
let singgahan: Promise<KonfigurasiPublik> | null = null;

export function ambilKonfigurasiPublik(): Promise<KonfigurasiPublik> {
	singgahan ??= fetch("/api/konfigurasi-publik")
		.then((response) => response.json() as Promise<KonfigurasiPublik>)
		.catch((err) => {
			// Kegagalan tidak disinggahkan — pemanggil berikutnya mencoba lagi.
			singgahan = null;
			throw err;
		});
	return singgahan;
}
