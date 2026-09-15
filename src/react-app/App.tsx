import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "~/react-app/components/Layout";
import { Beranda } from "~/react-app/routes/Beranda";
import { Jadwal } from "~/react-app/routes/Jadwal";
import { Tentang } from "~/react-app/routes/Tentang";
import { SegeraHadir } from "~/react-app/routes/SegeraHadir";
import { Onboard } from "~/react-app/routes/Onboard";
import { Masuk } from "~/react-app/routes/Masuk";
import { AdminLayout } from "~/react-app/routes/AdminLayout";
import { AdminBeranda } from "~/react-app/routes/AdminBeranda";
import { AdminAudit } from "~/react-app/routes/AdminAudit";
import { AdminPeraturan } from "~/react-app/routes/AdminPeraturan";
import { Peraturan } from "~/react-app/routes/Peraturan";
import { Unduhan } from "~/react-app/routes/Unduhan";
import { Daftar } from "~/react-app/routes/Daftar";
import { AkunLayout } from "~/react-app/routes/AkunLayout";
import { AkunBeranda } from "~/react-app/routes/AkunBeranda";
import { AkunData } from "~/react-app/routes/AkunData";
import { AkunPengaturan } from "~/react-app/routes/AkunPengaturan";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route index element={<Beranda />} />
					<Route path="jadwal" element={<Jadwal />} />
					<Route path="tentang" element={<Tentang />} />
					<Route path="peraturan" element={<Peraturan />} />
					<Route path="unduhan" element={<Unduhan />} />
					<Route path="onboard" element={<Onboard />} />
					<Route path="masuk" element={<Masuk />} />
					<Route path="daftar" element={<Daftar />} />
					<Route path="*" element={<SegeraHadir judul="Halaman tidak ditemukan" />} />
				</Route>
				<Route path="admin" element={<AdminLayout />}>
					<Route index element={<AdminBeranda />} />
					<Route path="audit" element={<AdminAudit />} />
					<Route path="peraturan" element={<AdminPeraturan />} />
				</Route>
				<Route path="akun" element={<AkunLayout />}>
					<Route index element={<AkunBeranda />} />
					<Route path="data" element={<AkunData />} />
					<Route path="pengaturan" element={<AkunPengaturan />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
