// Generate 5 gambar OpenGraph (1200x630) saat build — lihat plan gambar+OG.
// Tidak di-commit (public/og/ ada di .gitignore): selalu dibangun ulang dari
// template + ilustrasi di src/react-app/assets, jadi selalu sinkron dengan
// judul halaman yang sebenarnya (lihat KONTEN_META_HALAMAN di
// src/worker/routes/metaHalaman.ts dan judul di PublicPageHero/Beranda).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const AKAR = path.dirname(fileURLToPath(import.meta.url));
const ASET = path.join(AKAR, "..", "src", "react-app", "assets");
const KELUARAN = path.join(AKAR, "..", "public", "og");

const MERAH = "#dc0a0a";
const MARUN = "#8a0b10";

// satori mensyaratkan `display: flex/contents/none` eksplisit di setiap
// <div> (termasuk yang cuma berisi satu simpul teks) — di-default di sini
// supaya style di kartuOg() tak perlu mengulanginya tiap elemen.
function h(type, props, ...children) {
	const style = type === "div" ? { display: "flex", ...props.style } : props.style;
	return { type, props: { ...props, style, children: children.flat() } };
}

function dataUri(relatifKeAset, mime = "image/png") {
	const bytes = readFileSync(path.join(ASET, relatifKeAset));
	return `data:${mime};base64,${bytes.toString("base64")}`;
}

function font(namaBerkas, nama, weight) {
	return { name: nama, data: readFileSync(path.join(AKAR, "..", "node_modules", "@fontsource", namaBerkas)), weight, style: "normal" };
}

const FONTS = [
	font("lilita-one/files/lilita-one-latin-400-normal.woff", "Lilita One", 400),
	font("poppins/files/poppins-latin-400-normal.woff", "Poppins", 400),
	font("poppins/files/poppins-latin-700-normal.woff", "Poppins", 700),
];

// Logo Muktamar XIV (mark + wordmark) — sama seperti dipakai Header.tsx di
// navbar. PNG, bukan .webp asli: satori gagal decode alpha channel WebP kedua
// berkas ini (hasil render blank/transparan penuh) — lihat provenance PNG-nya.
const LOGO_PUTIH = dataUri("brand/muktamar-xiv-lockup-putih-og.png");
const LOGO_WARNA = dataUri("brand/muktamar-xiv-lockup-warna-og.png");
const NAVY = "#06244c";

/**
 * Baris logo + "Komisi Penjaringan Umum / Muktamar KAMMI XIV". `warna="putih"`
 * (dipakai di atas bidang merah kartuHero) memakai logo+teks putih seperti
 * Header.tsx; `warna="navy"` (dipakai kartuTentang, hero-nya putih tanpa
 * bidang merah) memakai logo berwarna + teks navy supaya tetap terbaca.
 */
function headerRow(warna = "putih") {
	const putih = warna === "putih";
	return h(
		"div",
		{ style: { alignItems: "center", gap: "14px" } },
		h("img", { src: putih ? LOGO_PUTIH : LOGO_WARNA, style: { width: "50px", height: "52px", objectFit: "contain" } }),
		h(
			"div",
			{
				style: {
					flexDirection: "column",
					fontFamily: "Poppins",
					fontWeight: 600,
					fontSize: "20px",
					lineHeight: 1.25,
					color: putih ? "#ffffff" : NAVY,
				},
			},
			h("div", {}, "Komisi Penjaringan Umum"),
			h("div", {}, "Muktamar KAMMI XIV"),
		),
	);
}

/** `object-fit: contain` dihitung manual (bukan diserahkan ke satori) supaya
 * ilustrasi kartuHero persis pas di kotak: tinggi dibatasi maksimum, lebar
 * ikut rasio asli, tanpa sisa ruang yang membuatnya tak mepet border bawah. */
function ukuranKontain(lebarAsli, tinggiAsli, maksLebar, maksTinggi) {
	const rasio = lebarAsli / tinggiAsli;
	let lebar = maksLebar;
	let tinggi = lebar / rasio;
	if (tinggi > maksTinggi) {
		tinggi = maksTinggi;
		lebar = tinggi * rasio;
	}
	return { lebar: Math.round(lebar), tinggi: Math.round(tinggi) };
}

/**
 * Halaman merah dengan ilustrasi menumpang di kanan (Beranda + PublicPageHero:
 * Jadwal/Peraturan/Unduhan) — meniru KELAS_JUDUL_HERO persis: uppercase, dua
 * lapis text-shadow marun. `subjudul` dibiarkan kosong untuk 3 halaman itu
 * karena hero aslinya (PublicPageHero.tsx) memang tak punya baris subjudul —
 * cuma Beranda yang punya "Muktamar KAMMI XIV Ambon".
 */
// 90% tinggi kartu (630px) — ilustrasi kartuHero tak pernah lebih tinggi dari
// ini, dan selalu mepet border bawah (bottom: 0), bukan mengambang di tengah.
const TINGGI_MAKS_ILUSTRASI = Math.round(630 * 0.9);
const LEBAR_MAKS_ILUSTRASI = 560;

function kartuHero({ judul, subjudul, ilustrasi, ilustrasiW, ilustrasiH }) {
	const { lebar, tinggi } = ukuranKontain(ilustrasiW, ilustrasiH, LEBAR_MAKS_ILUSTRASI, TINGGI_MAKS_ILUSTRASI);
	const kolom = [
		headerRow("putih"),
		h(
			"div",
			{
				style: {
					fontFamily: "Lilita One",
					fontWeight: 400,
					fontSize: "72px",
					lineHeight: 0.98,
					textTransform: "uppercase",
					color: "#ffffff",
					textShadow: `3px 3px 0 ${MARUN}, 6px 6px 0 ${MARUN}`,
					marginTop: "36px",
				},
			},
			judul,
		),
	];
	if (subjudul) {
		kolom.push(
			h("div", { style: { fontFamily: "Poppins", fontWeight: 700, fontSize: "26px", color: "#ffffff", marginTop: "20px" } }, subjudul),
		);
	}

	return h(
		"div",
		{ style: { width: "1200px", height: "630px", backgroundColor: MERAH, fontFamily: "Poppins", position: "relative", overflow: "hidden" } },
		h("div", { style: { flexDirection: "column", justifyContent: "center", padding: "64px 48px", width: "700px", height: "100%" } }, ...kolom),
		h("img", {
			src: dataUri(`illustrations/${ilustrasi}`),
			style: { position: "absolute", right: "20px", bottom: "0", width: `${lebar}px`, height: `${tinggi}px` },
		}),
	);
}

/**
 * Tentang.tsx: satu-satunya halaman publik dengan hero PUTIH, judul+subjudul
 * di tengah, ilustrasi di BAWAH teks (bukan di samping) — dan TANPA bidang
 * merah sama sekali (beda dari kartuHero). Bar atas cuma logo (tanpa teks),
 * ditengahkan — bukan headerRow(): itu dipakai kartuHero yang perlu teks
 * "Komisi Penjaringan Umum" karena tak punya elemen judul-navy terpisah.
 * Ilustrasi memakai flex:1 + height:100% (bukan angka piksel tetap) supaya
 * satori sendiri yang menghitung ruang sisa dan mengisinya penuh, mepet
 * border bawah, alih-alih ukuran kecil sembarang yang menyisakan spasi kosong.
 */
function kartuTentang({ judul, subjudul, ilustrasi }) {
	return h(
		"div",
		{ style: { flexDirection: "column", width: "1200px", height: "630px", backgroundColor: "#ffffff", fontFamily: "Poppins", overflow: "hidden" } },
		h(
			"div",
			{ style: { justifyContent: "center", padding: "28px 48px 0" } },
			h("img", { src: LOGO_WARNA, style: { width: "58px", height: "60px", objectFit: "contain" } }),
		),
		h(
			"div",
			{ style: { flexDirection: "column", alignItems: "center", flex: "1", width: "100%", padding: "16px 48px 0", textAlign: "center" } },
			h(
				"div",
				{
					style: {
						fontFamily: "Lilita One",
						fontWeight: 400,
						fontSize: "58px",
						lineHeight: 1,
						textTransform: "uppercase",
						color: NAVY,
						textShadow: `2px 2px 0 ${MARUN}, 4px 4px 0 ${MARUN}`,
					},
				},
				judul,
			),
			h(
				"div",
				{
					style: {
						fontFamily: "Poppins",
						fontWeight: 700,
						fontSize: "22px",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						color: MERAH,
						marginTop: "14px",
					},
				},
				subjudul,
			),
			h(
				"div",
				{
					style: {
						flexDirection: "column",
						flex: "1",
						width: "100%",
						alignItems: "center",
						justifyContent: "flex-end",
						marginTop: "12px",
					},
				},
				h("img", { src: dataUri(`illustrations/${ilustrasi}`), style: { height: "100%", objectFit: "contain" } }),
			),
		),
	);
}

// Dimensi asli tiap ilustrasi (lihat sips -g pixelWidth -g pixelHeight) —
// dipakai ukuranKontain() supaya kartuHero tahu rasio aslinya tanpa menebak.
const HALAMAN = [
	{ berkas: "default", template: kartuHero, judul: "Pendaftaran Bakal Calon Ketua Umum PP KAMMI", subjudul: "Muktamar KAMMI XIV Ambon", ilustrasi: "ketum.png", ilustrasiW: 1122, ilustrasiH: 1402 },
	{ berkas: "jadwal", template: kartuHero, judul: "Timeline Resmi KPU", ilustrasi: "bendum.png", ilustrasiW: 1024, ilustrasiH: 1481 },
	{ berkas: "tentang", template: kartuTentang, judul: "Komisi Penjaringan Umum", subjudul: "Muktamar KAMMI XIV 2026", ilustrasi: "kpu.png" },
	{ berkas: "peraturan", template: kartuHero, judul: "Peraturan KPU", ilustrasi: "sekjend.png", ilustrasiW: 1089, ilustrasiH: 924 },
	{ berkas: "unduhan", template: kartuHero, judul: "Berkas Kelengkapan", ilustrasi: "agung.png", ilustrasiW: 1122, ilustrasiH: 1402 },
];

async function main() {
	mkdirSync(KELUARAN, { recursive: true });
	for (const halaman of HALAMAN) {
		const svg = await satori(halaman.template(halaman), { width: 1200, height: 630, fonts: FONTS });
		const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
		writeFileSync(path.join(KELUARAN, `${halaman.berkas}.png`), png);
		console.log(`og/${halaman.berkas}.png dibuat`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
