// Generate varian avif/webp/png (1x + 2x) dari ilustrasi + foto anggota saat
// build/dev — lihat plan gambar responsif. Dulu varian ini dibuat on-demand
// lewat Images binding (Worker route `/img`), tapi tiap deploy mengganti hash
// nama berkas Vite, dan Cache API Worker itu per-colo (bukan global) — jadi
// tiap deploy membuat semua transformasi jadi cache-miss di semua colo, dan
// pengunjung pertama tiap colo menanggung transform ~0.4–1 detik/gambar
// (diukur langsung di produksi). Karena sumbernya cuma 10 berkas tetap
// (bukan unggahan pengguna), digenerate di build time jadi berkas statis
// biasa: tidak pernah cache-miss, tidak butuh binding Images sama sekali.
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const AKAR = path.dirname(fileURLToPath(import.meta.url));
const ASET = path.join(AKAR, "..", "src", "react-app", "assets");
const KELUARAN = path.join(ASET, "generated");

// Lebar 1x/2x per kategori — ilustrasi dipakai ResponsiveImage width=960,
// anggota width=480 (lihat pemakainya di routes/*.tsx). `withoutEnlargement`
// di bawah mencegah upscale kalau berkas sumber lebih sempit dari lebar 2x
// (mis. bendum.png 1024px vs target 1600px) yang cuma bikin buram, bukan
// tambah detail asli.
const KATEGORI = {
	// 480 ada di tangga ilustrasi karena hero dikunci lewat tinggi (`h-[46vh]`,
	// lihat KELAS_ILUSTRASI_HERO): di ponsel lebar tampilnya hanya ~300px CSS,
	// jadi 960 pun sudah kelewat besar. Tanpa anak tangga ini Lighthouse
	// mencatat ~40KB terbuang hanya untuk ilustrasi Beranda.
	ilustrasi: { dir: "illustrations", lebar: [480, 960, 1600] },
	anggota: { dir: "members", lebar: [480, 960] },
};

const GAMBAR = [
	{ nama: "ketum", kategori: "ilustrasi" },
	{ nama: "sekjend", kategori: "ilustrasi" },
	{ nama: "bendum", kategori: "ilustrasi" },
	{ nama: "agung", kategori: "ilustrasi" },
	{ nama: "kpu", kategori: "ilustrasi" },
	{ nama: "khaidir", kategori: "anggota" },
	{ nama: "alfiansyah", kategori: "anggota" },
	{ nama: "robby", kategori: "anggota" },
	{ nama: "rafika", kategori: "anggota" },
	{ nama: "ilham", kategori: "anggota" },
];

const FORMAT = [
	{ ekstensi: "avif", opsi: { quality: 55 } },
	{ ekstensi: "webp", opsi: { quality: 75 } },
	// PNG: fallback `<img src>` untuk browser tanpa dukungan avif/webp, dan
	// satu-satunya format yang mempertahankan alpha channel yang dipakai
	// filter drop-shadow foto anggota di Tentang.tsx — tidak bisa diganti JPEG.
	{ ekstensi: "png", opsi: { compressionLevel: 9 } },
];

async function main() {
	mkdirSync(KELUARAN, { recursive: true });
	for (const berkas of readdirSync(KELUARAN)) unlinkSync(path.join(KELUARAN, berkas));

	const baris = ["// Digenerate oleh scripts/buatGambarResponsif.mjs — jangan diedit manual.", ""];
	const definisi = [];

	for (const { nama, kategori } of GAMBAR) {
		const { dir, lebar } = KATEGORI[kategori];
		const sumber = path.join(ASET, dir, `${nama}.png`);
		const { width: lebarAsli, height: tinggiAsli } = await sharp(sumber).metadata();

		// `withoutEnlargement` memangkas target yang lebih lebar dari sumbernya,
		// jadi lebar *nyata* berkaslah yang dicatat — itu yang dipakai sebagai
		// deskriptor `w` di srcSet, dan deskriptor yang bohong membuat browser
		// salah pilih varian. Target yang jatuh ke lebar sama (mis. sumber 1024
		// untuk target 960 dan 1600) hanya disimpan sekali.
		const lebarNyata = [...new Set(lebar.map((w) => Math.min(w, lebarAsli)))].sort((a, b) => a - b);

		// varian[ekstensi] = daftar { namaVar, lebar } urut dari yang terkecil.
		const varian = {};
		for (const w of lebarNyata) {
			for (const { ekstensi, opsi } of FORMAT) {
				const namaBerkas = `${nama}-${w}.${ekstensi}`;
				await sharp(sumber)
					.resize({ width: w, withoutEnlargement: true })
					.toFormat(ekstensi, opsi)
					.toFile(path.join(KELUARAN, namaBerkas));
				const namaVar = `${nama}_${ekstensi}_${w}`;
				baris.push(`import ${namaVar} from "./${namaBerkas}";`);
				(varian[ekstensi] ??= []).push({ namaVar, lebar: w });
			}
		}

		const daftar = (ekstensi) =>
			`[${varian[ekstensi].map(({ namaVar, lebar: w }) => `{ url: ${namaVar}, lebar: ${w} }`).join(", ")}]`;

		definisi.push(
			`export const ${nama}: GambarResponsif = {`,
			`\twidth: ${lebar[0]},`,
			`\tintrinsicWidth: ${lebarAsli},`,
			`\tintrinsicHeight: ${tinggiAsli},`,
			`\tavif: ${daftar("avif")},`,
			`\twebp: ${daftar("webp")},`,
			`\tpng: ${daftar("png")},`,
			`};`,
			"",
		);
		console.log(`generated/${nama}-{${lebarNyata.join(",")}}.{avif,webp,png}`);
	}

	baris.push(
		"",
		"export type VarianGambar = { url: string; lebar: number };",
		"",
		"export type GambarResponsif = {",
		"\t/** Lebar tata letak acuan, dipakai sebagai atribut `width` <img>. */",
		"\twidth: number;",
		"\tintrinsicWidth: number;",
		"\tintrinsicHeight: number;",
		"\t/** Urut dari lebar terkecil; `lebar` adalah lebar nyata berkas (deskriptor `w`). */",
		"\tavif: VarianGambar[];",
		"\twebp: VarianGambar[];",
		"\tpng: VarianGambar[];",
		"};",
		"",
		...definisi,
	);

	writeFileSync(path.join(KELUARAN, "index.ts"), baris.join("\n"));
	console.log("generated/index.ts ditulis");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
