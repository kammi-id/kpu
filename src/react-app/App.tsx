import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "~/react-app/components/Layout";
import { Beranda } from "~/react-app/routes/Beranda";
import { Jadwal } from "~/react-app/routes/Jadwal";
import { Tentang } from "~/react-app/routes/Tentang";
import { SegeraHadir } from "~/react-app/routes/SegeraHadir";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route index element={<Beranda />} />
					<Route path="jadwal" element={<Jadwal />} />
					<Route path="tentang" element={<Tentang />} />
					<Route path="peraturan" element={<SegeraHadir judul="Peraturan" />} />
					<Route path="unduhan" element={<SegeraHadir judul="Unduhan" />} />
					<Route path="masuk" element={<SegeraHadir judul="Masuk" />} />
					<Route path="daftar" element={<SegeraHadir judul="Daftar" />} />
					<Route path="*" element={<SegeraHadir judul="Halaman tidak ditemukan" />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
