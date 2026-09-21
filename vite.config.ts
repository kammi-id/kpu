import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Font yang dipakai di layar pertama tiap halaman publik: Lilita One untuk
 * judul hero, Poppins 400/600 untuk isi dan navigasi. Poppins 500 dan 700
 * sengaja tidak ikut — keduanya baru muncul di bawah lipatan, dan tiap
 * pramuat bersaing dengan CSS serta JS yang sama-sama dibutuhkan lebih dulu.
 */
const FONT_PRAMUAT = [/lilita-one-latin-400-normal/, /poppins-latin-400-normal/, /poppins-latin-600-normal/];

/**
 * Nama berkas font diberi hash oleh Vite dan hanya ditemukan browser setelah
 * CSS selesai diurai, jadi tidak bisa ditulis tangan di index.html. Plugin ini
 * membaca bundel hasil build dan menyisipkan `<link rel="preload">`-nya, supaya
 * unduhan font mulai bersamaan dengan CSS, bukan menunggu CSS selesai.
 */
function pramuatFont(): Plugin {
	return {
		name: "pramuat-font",
		apply: "build",
		transformIndexHtml: {
			order: "post",
			handler(_html, ctx) {
				const berkas = Object.keys(ctx.bundle ?? {}).filter(
					(nama) => nama.endsWith(".woff2") && FONT_PRAMUAT.some((pola) => pola.test(nama)),
				);
				return berkas.map((nama) => ({
					tag: "link",
					attrs: {
						rel: "preload",
						as: "font",
						type: "font/woff2",
						href: `/${nama}`,
						// Font selalu diambil dalam mode CORS anonim, bahkan dari origin
						// yang sama. Tanpa ini pramuatnya tidak terpakai dan berkasnya
						// diunduh dua kali.
						crossorigin: "anonymous",
					},
					injectTo: "head-prepend",
				}));
			},
		},
	};
}

/**
 * Rute yang dipecah (React.lazy di App.tsx) dan modul sumbernya. Tanpa pramuat,
 * chunk rute ini baru diminta setelah bundel utama selesai diunduh dan
 * dijalankan — satu perjalanan bolak-balik penuh yang berderet, bukan paralel.
 * Audit staging mengukurnya di /peraturan: bundel utama selesai 1417 ms, chunk
 * rute baru mulai 1462 ms dan SafeMarkdown selesai 1917 ms.
 *
 * Hanya rute yang dijawab Worker (bukan langsung oleh Assets) yang bisa
 * disisipi pramuat — lihat src/worker/lib/pramuatRute.ts. Beranda tidak ada
 * di sini karena memang tidak dipecah.
 */
const MODUL_RUTE_TERPECAH: Record<string, string> = {
	"/peraturan": "src/react-app/routes/Peraturan.tsx",
	"/daftar": "src/react-app/routes/Daftar.tsx",
	"/masuk": "src/react-app/routes/Masuk.tsx",
	"/onboard": "src/react-app/routes/Onboard.tsx",
};

/**
 * Menulis dist/client/pramuat-rute.json: rute → chunk yang dibutuhkannya
 * (beserta impor statisnya, rekursif), untuk dibaca Worker saat runtime.
 *
 * Kenapa lewat berkas dan bukan konstanta build: environment Worker dibangun
 * LEBIH DULU daripada client (terlihat langsung dari urutan log `vite build`),
 * jadi nama chunk ber-hash belum ada saat kode Worker dikompilasi.
 */
function petaPramuatRute(): Plugin {
	return {
		name: "peta-pramuat-rute",
		apply: "build",
		generateBundle(_opsi, bundle) {
			if (this.environment.name !== "client") return;
			const chunk = Object.values(bundle).filter((b) => b.type === "chunk");
			const menurutNama = new Map(chunk.map((c) => [c.fileName, c]));
			// Bundel utama sudah dimuat lewat <script> di index.html; mempramuatnya
			// lagi cuma menambah baris tanpa guna.
			const entri = new Set(chunk.filter((c) => c.isEntry).map((c) => c.fileName));

			const peta: Record<string, string[]> = {};
			for (const [rute, sumber] of Object.entries(MODUL_RUTE_TERPECAH)) {
				const target = chunk.find((c) => c.facadeModuleId === path.resolve(__dirname, sumber));
				if (!target) {
					// Rute itu mungkin sudah tidak lagi di-lazy. Bukan alasan menggagalkan
					// build demi sebuah petunjuk kinerja — cukup diperingatkan.
					this.warn(`${sumber} tidak punya chunk sendiri; ${rute} dilewati dari pramuat-rute.json`);
					continue;
				}
				const hasil = new Set<string>();
				const kunjungi = (nama: string) => {
					if (entri.has(nama) || hasil.has(nama)) return;
					hasil.add(nama);
					menurutNama.get(nama)?.imports.forEach(kunjungi);
				};
				kunjungi(target.fileName);
				peta[rute] = [...hasil].map((nama) => `/${nama}`);
			}
			this.emitFile({ type: "asset", fileName: "pramuat-rute.json", source: JSON.stringify(peta) });
		},
	};
}

/**
 * Rute yang TIDAK boleh dijawab cangkang dari service worker, karena Worker
 * yang harus menjawabnya sendiri. Dua sebab berbeda, dua-duanya nyata:
 *
 * - `/onboard` adalah gerbang sisi server: Worker menjawab 404 begitu Admin
 *   bersama sudah ada, ONBOARD_TOKEN kosong, atau layanan sudah selesai
 *   (src/worker/index.ts). Cangkang dari cache akan melewati gerbang itu dan
 *   menampilkan halaman onboarding kepada siapa pun.
 * - Empat rute publik di bawahnya ditimpa <title>, description, dan og:image
 *   per halaman lewat HTMLRewriter (routes/metaHalaman.ts). Cangkang dari
 *   cache mengembalikan judul generik index.html untuk pengunjung berulang.
 *
 * Daftar ini berpasangan dengan `run_worker_first` di wrangler.json — kalau
 * satu berubah, yang lain ikut.
 */
const RUTE_HARUS_KE_WORKER = [/^\/api\//, /^\/og\//, /^\/onboard$/, /^\/(jadwal|tentang|peraturan|unduhan)$/];

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		cloudflare(),
		pramuatFont(),
		petaPramuatRute(),
		VitePWA({
			registerType: "autoUpdate",
			// Bawaannya `<script src="/registerSW.js">` biasa di <head>, yang memblokir
			// parser di setiap halaman demi sesuatu yang baru berjalan saat `load`.
			// Catatan: di luar "auto", plugin tidak lagi menyalakan skipWaiting dan
			// clientsClaim sendiri, jadi keduanya ditulis eksplisit di `workbox`.
			injectRegister: "script-defer",
			// Ikon + tautan <head> digenerate dari pwa-assets.config.ts saat build,
			// jadi tidak ada berkas ikon yang di-commit (pola yang sama dengan
			// public/og/ dan assets/generated/, dua-duanya di .gitignore).
			pwaAssets: { config: true },
			manifest: {
				id: "/",
				name: "KPU Muktamar XIV KAMMI",
				short_name: "KPU Muktamar XIV",
				description:
					"Pendaftaran Bakal Calon Ketua Umum PP KAMMI, Muktamar KAMMI XIV Ambon — jadwal, peraturan, dan berkas resmi dari Komisi Penjaringan Umum.",
				lang: "id",
				// Merah Muktamar, sama dengan --merah di index.css.
				theme_color: "#dc0a0a",
			},
			workbox: {
				// Hanya berkas ber-hash yang dipracache. PNG ilustrasi sengaja di luar
				// daftar: fallback-nya sampai 2,2 MB per berkas dan sudah kalah oleh
				// avif/webp di <picture>, jadi memasukkannya cuma memenuhi kuota
				// penyimpanan peramban tanpa pernah terpakai.
				globPatterns: ["**/*.{js,css,html,woff2}"],
				// "/index.html", bukan "/": nilai ini dicari persis di antara kunci
				// pracache, dan kuncinya adalah "index.html". Dengan "/" rutenya
				// terdaftar tapi tidak pernah menemukan cangkang, sehingga setiap rute
				// SPA selain "/" gagal saat luring — terlihat langsung saat diuji.
				navigateFallback: "/index.html",
				navigateFallbackDenylist: RUTE_HARUS_KE_WORKER,
				// Tanpa runtimeCaching: apa pun yang tidak dipracache lewat ke jaringan
				// apa adanya. Penting untuk /api/* yang Worker-nya menetapkan no-store
				// dan untuk tahap yang sensitif waktu — service worker ini mempercepat
				// muat ulang cangkang, bukan menyimpan data.
				skipWaiting: true,
				clientsClaim: true,
			},
		}),
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
});
