import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

/**
 * Ikon PWA digenerate saat build oleh vite-plugin-pwa (opsi `pwaAssets`), bukan
 * disimpan di repo — pola yang sama dengan gambar OG dan varian responsif:
 * sumbernya yang di-commit, keluarannya masuk .gitignore.
 *
 * Sumbernya sengaja tanda Muktamar XIV saja, tanpa wordmark. Logo penuh milik
 * pemilik produk memuat "MUKTAMAR KAMMI XIV", "AMBON • MALUKU", dan tanggal —
 * semuanya jadi bubur pada favicon 32px. Lihat sidecar .json di sebelah sumber.
 *
 * Preset minimal-2023 menghasilkan yang benar-benar dipakai peramban hari ini:
 * favicon.ico (64), apple-touch-icon 180, pwa-64/192/512, dan maskable 512.
 */
export default defineConfig({
	headLinkOptions: { preset: "2023" },
	preset: {
		...minimal2023Preset,
		maskable: {
			...minimal2023Preset.maskable,
			// Latar tanda transparan, jadi ikon maskable butuh bidang solid —
			// tanpa ini Android menempelkan tanda di atas hitam.
			resizeOptions: { background: "#ffffff" },
		},
		apple: {
			...minimal2023Preset.apple,
			// iOS tidak mendukung alpha pada apple-touch-icon; tanpa latar putih
			// ikonnya dirender di atas hitam.
			resizeOptions: { background: "#ffffff" },
		},
	},
	// Harus di dalam public/: generator menulis keluarannya relatif terhadap letak
	// sumber, jadi sumber di src/ akan menjatuhkan ikon ke luar dist/client dan
	// tautan <head> menunjuk berkas yang tidak pernah terbit.
	images: ["public/ikon-muktamar-xiv.png"],
});
