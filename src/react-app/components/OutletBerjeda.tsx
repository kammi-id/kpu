import { Suspense } from "react";
import { Outlet } from "react-router-dom";

/**
 * Jeda pemuatan potongan rute. Sengaja kosong, bukan pemintal: potongannya
 * kecil dan rangka halamannya sudah tergambar di sekelilingnya, jadi pemintal
 * sekejap justru terbaca sebagai kedipan.
 */
export function JedaRute() {
	return <div className="min-h-[50vh]" aria-busy="true" />;
}

/**
 * `<Outlet>` dengan batas Suspense-nya sendiri, untuk layout yang anak rutenya
 * di-lazy (App.tsx). Batasnya harus di sini, bukan hanya di atas `<Routes>`:
 * batas teratas menggantikan seluruh pohon, termasuk Header dan Footer, jadi
 * pada muat pertama /peraturan tidak ada apa pun yang tergambar sampai chunk
 * rutenya tiba.
 */
export function OutletBerjeda() {
	return (
		<Suspense fallback={<JedaRute />}>
			<Outlet />
		</Suspense>
	);
}
