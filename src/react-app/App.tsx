import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GerbangLayout } from "~/react-app/components/GerbangLayout";
import { Layout } from "~/react-app/components/Layout";
import { useTahap } from "~/react-app/lib/useTahap";
import { Beranda } from "~/react-app/routes/Beranda";
import { Jadwal } from "~/react-app/routes/Jadwal";
import { Tentang } from "~/react-app/routes/Tentang";
import { Unduhan } from "~/react-app/routes/Unduhan";
import { SegeraHadir } from "~/react-app/routes/SegeraHadir";
import { SelesaiPage } from "~/react-app/routes/SelesaiPage";

// Rute publik di atas dimuat langsung: itu yang dituju pengunjung dari mesin
// pencari, jadi memecahnya cuma menambah satu perjalanan bolak-balik sebelum
// hal pertama tergambar.
//
// Sisanya di bawah dipecah. Semua rute akun dan admin berada di balik login —
// tidak ada pengunjung publik yang memuatnya — sementara Peraturan dan Daftar
// menarik react-markdown + remark-gfm yang sendirian berukuran ratusan kilobyte.
// Sebelum ini semuanya satu berkas 734 kB (236 kB gzip), dan karena halaman ini
// dirender di klien dengan `<div id="root">` kosong, tidak ada apa pun yang
// tergambar sampai berkas itu selesai diunduh dan dijalankan.
const Peraturan = lazy(() => import("~/react-app/routes/Peraturan").then((m) => ({ default: m.Peraturan })));
const Onboard = lazy(() => import("~/react-app/routes/Onboard").then((m) => ({ default: m.Onboard })));
const Masuk = lazy(() => import("~/react-app/routes/Masuk").then((m) => ({ default: m.Masuk })));
const Daftar = lazy(() => import("~/react-app/routes/Daftar").then((m) => ({ default: m.Daftar })));
const AdminLayout = lazy(() => import("~/react-app/routes/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminBeranda = lazy(() => import("~/react-app/routes/AdminBeranda").then((m) => ({ default: m.AdminBeranda })));
const AdminDetail = lazy(() => import("~/react-app/routes/AdminDetail").then((m) => ({ default: m.AdminDetail })));
const AdminEkspor = lazy(() => import("~/react-app/routes/AdminEkspor").then((m) => ({ default: m.AdminEkspor })));
const AdminAudit = lazy(() => import("~/react-app/routes/AdminAudit").then((m) => ({ default: m.AdminAudit })));
const AdminUnggahBerkas = lazy(() =>
	import("~/react-app/routes/AdminUnggahBerkas").then((m) => ({ default: m.AdminUnggahBerkas })),
);
const AdminPengaturan = lazy(() =>
	import("~/react-app/routes/AdminPengaturan").then((m) => ({ default: m.AdminPengaturan })),
);
const BacalonLayout = lazy(() => import("~/react-app/routes/BacalonLayout").then((m) => ({ default: m.BacalonLayout })));
const AkunBeranda = lazy(() => import("~/react-app/routes/AkunBeranda").then((m) => ({ default: m.AkunBeranda })));
const AkunData = lazy(() => import("~/react-app/routes/AkunData").then((m) => ({ default: m.AkunData })));
const AkunBerkas = lazy(() => import("~/react-app/routes/AkunBerkas").then((m) => ({ default: m.AkunBerkas })));
const AkunBerkasKelompok = lazy(() =>
	import("~/react-app/routes/AkunBerkasKelompok").then((m) => ({ default: m.AkunBerkasKelompok })),
);
const AkunPengaturan = lazy(() =>
	import("~/react-app/routes/AkunPengaturan").then((m) => ({ default: m.AkunPengaturan })),
);

/**
 * Jeda pemuatan potongan rute. Sengaja kosong, bukan pemintal: potongannya
 * kecil dan rangka halaman (Header/Footer atau gerbang) sudah tergambar di
 * sekelilingnya, jadi pemintal sekejap justru terbaca sebagai kedipan.
 */
const JEDA_RUTE = <div className="min-h-[50vh]" aria-busy="true" />;

function App() {
	// Tahap Selesai (tiket 18): satu-satunya isi seluruh situs, tanpa memandang
	// rute — Beranda dkk. tetap dirender sampai /api/tahap menjawab, karena
	// menunggu tahap sebelum render pertama akan menunda seluruh situs demi
	// jendela yang hanya berlaku setelah 28 Januari 2027.
	const { data: tahap } = useTahap();
	if (tahap?.tahap === "Selesai") {
		return (
			<BrowserRouter>
				<SelesaiPage />
			</BrowserRouter>
		);
	}

	return (
		<BrowserRouter>
			<Suspense fallback={JEDA_RUTE}>
				<Routes>
					<Route element={<Layout />}>
						<Route index element={<Beranda />} />
						<Route path="jadwal" element={<Jadwal />} />
						<Route path="tentang" element={<Tentang />} />
						<Route path="peraturan" element={<Peraturan />} />
						<Route path="unduhan" element={<Unduhan />} />
						<Route path="*" element={<SegeraHadir judul="Halaman tidak ditemukan" />} />
					</Route>
					<Route element={<GerbangLayout />}>
						<Route path="onboard" element={<Onboard />} />
						<Route path="masuk" element={<Masuk />} />
						<Route path="daftar" element={<Daftar />} />
					</Route>
					<Route path="admin" element={<AdminLayout />}>
						<Route index element={<AdminBeranda />} />
						<Route path=":id" element={<AdminDetail />} />
						<Route path="unggah-berkas" element={<AdminUnggahBerkas />} />
						<Route path="ekspor" element={<AdminEkspor />} />
						<Route path="audit" element={<AdminAudit />} />
						<Route path="pengaturan" element={<AdminPengaturan />} />
					</Route>
					<Route path="bacalon" element={<BacalonLayout />}>
						<Route index element={<AkunBeranda />} />
						<Route path="data" element={<AkunData />} />
						<Route path="pengaturan" element={<AkunPengaturan />} />
						<Route path="berkas" element={<AkunBerkas />} />
						<Route path="berkas/:no" element={<AkunBerkasKelompok />} />
					</Route>
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}

export default App;
