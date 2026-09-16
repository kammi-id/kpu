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
	ilustrasi: { dir: "illustrations", lebar: [960, 1600] },
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

		// slotVar[ekstensi][0 | 1] = nama variabel import untuk 1x / 2x.
		const slotVar = {};
		for (const [slot, w] of lebar.entries()) {
			for (const { ekstensi, opsi } of FORMAT) {
				const namaBerkas = `${nama}-${w}.${ekstensi}`;
				await sharp(sumber)
					.resize({ width: w, withoutEnlargement: true })
					.toFormat(ekstensi, opsi)
					.toFile(path.join(KELUARAN, namaBerkas));
				const namaVar = `${nama}_${ekstensi}_${slot === 0 ? "1x" : "2x"}`;
				baris.push(`import ${namaVar} from "./${namaBerkas}";`);
				(slotVar[ekstensi] ??= [])[slot] = namaVar;
			}
		}

		definisi.push(
			`export const ${nama}: GambarResponsif = {`,
			`\twidth: ${lebar[0]},`,
			`\tintrinsicWidth: ${lebarAsli},`,
			`\tintrinsicHeight: ${tinggiAsli},`,
			`\tavif: { x1: ${slotVar.avif[0]}, x2: ${slotVar.avif[1]} },`,
			`\twebp: { x1: ${slotVar.webp[0]}, x2: ${slotVar.webp[1]} },`,
			`\tpng: { x1: ${slotVar.png[0]}, x2: ${slotVar.png[1]} },`,
			`};`,
			"",
		);
		console.log(`generated/${nama}-{${lebar.join(",")}}.{avif,webp,png}`);
	}

	baris.push(
		"",
		"export type GambarResponsif = {",
		"\twidth: number;",
		"\tintrinsicWidth: number;",
		"\tintrinsicHeight: number;",
		"\tavif: { x1: string; x2: string };",
		"\twebp: { x1: string; x2: string };",
		"\tpng: { x1: string; x2: string };",
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
