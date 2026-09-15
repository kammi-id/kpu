import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GerbangLayout } from "~/react-app/components/GerbangLayout";
import { Layout } from "~/react-app/components/Layout";
import { useTahap } from "~/react-app/lib/useTahap";
import { SelesaiPage } from "~/react-app/routes/SelesaiPage";
import { Beranda } from "~/react-app/routes/Beranda";
import { Jadwal } from "~/react-app/routes/Jadwal";
import { Tentang } from "~/react-app/routes/Tentang";
import { SegeraHadir } from "~/react-app/routes/SegeraHadir";
import { Onboard } from "~/react-app/routes/Onboard";
import { Masuk } from "~/react-app/routes/Masuk";
import { AdminLayout } from "~/react-app/routes/AdminLayout";
import { AdminBeranda } from "~/react-app/routes/AdminBeranda";
import { AdminDetail } from "~/react-app/routes/AdminDetail";
import { AdminEkspor } from "~/react-app/routes/AdminEkspor";
import { AdminAudit } from "~/react-app/routes/AdminAudit";
import { AdminUnggahBerkas } from "~/react-app/routes/AdminUnggahBerkas";

import { Peraturan } from "~/react-app/routes/Peraturan";
import { Unduhan } from "~/react-app/routes/Unduhan";
import { Daftar } from "~/react-app/routes/Daftar";
import { AkunLayout } from "~/react-app/routes/AkunLayout";
import { AkunBeranda } from "~/react-app/routes/AkunBeranda";
import { AkunData } from "~/react-app/routes/AkunData";
import { AkunBerkas } from "~/react-app/routes/AkunBerkas";
import { AkunBerkasKelompok } from "~/react-app/routes/AkunBerkasKelompok";
import { AkunPengaturan } from "~/react-app/routes/AkunPengaturan";

function App() {
	// Tahap Selesai (tiket 18): satu-satunya isi seluruh situs, tanpa memandang
	// rute — Beranda dkk. tetap dirender sampai /api/tahap menjawab, karena
	// menunggu tahap sebelum render pertama akan menunda seluruh situs demi
	// jendela yang hanya berlaku setelah 25 Januari 2027.
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
				</Route>
				<Route path="akun" element={<AkunLayout />}>
					<Route index element={<AkunBeranda />} />
					<Route path="data" element={<AkunData />} />
					<Route path="pengaturan" element={<AkunPengaturan />} />
					<Route path="berkas" element={<AkunBerkas />} />
					<Route path="berkas/:no" element={<AkunBerkasKelompok />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
