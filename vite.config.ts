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
		enforce: "post",
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
		VitePWA({
			registerType: "autoUpdate",
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
				start_url: "/",
				scope: "/",
				display: "standalone",
				// Merah Muktamar, sama dengan --merah di index.css.
				theme_color: "#dc0a0a",
				background_color: "#ffffff",
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
				cleanupOutdatedCaches: true,
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
