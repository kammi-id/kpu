import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

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

export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare(), pramuatFont()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
});
