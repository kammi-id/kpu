import { Hono } from "hono";

// Ilustrasi hero + foto anggota: satu-satunya gambar yang lolos lewat endpoint
// ini. Hash di tengah nama file berubah tiap build (fingerprint Vite), jadi
// pola dicocokkan per nama dasar, bukan nama persis — daftar tetap ini yang
// mencegah endpoint dipakai fetch path arbitrer (SSRF lewat ASSETS binding).
const POLA_SUMBER_DIIZINKAN = [
	/^\/assets\/agung-[\w-]+\.png$/,
	/^\/assets\/bendum-[\w-]+\.png$/,
	/^\/assets\/ketum-[\w-]+\.png$/,
	/^\/assets\/kpu-[\w-]+\.png$/,
	/^\/assets\/sekjend-[\w-]+\.png$/,
	/^\/assets\/alfiansyah-[\w-]+\.png$/,
	/^\/assets\/khaidir-[\w-]+\.png$/,
	/^\/assets\/rafika-[\w-]+\.png$/,
	/^\/assets\/robby-[\w-]+\.png$/,
	/^\/assets\/ilham-[\w-]+\.png$/,
];

// `vite dev` tidak melakukan fingerprint nama berkas (itu hanya terjadi saat
// `vite build`) — import gambar di komponen React menghasilkan path mentah
// `/src/react-app/assets/...` di dev, bukan `/assets/<nama>-<hash>.png`.
// Tanpa ini `/img` selalu 400 di `npm run dev`. `import.meta.env.DEV` statis
// false saat build produksi sehingga cabang ini dibuang oleh Vite — whitelist
// produksi (di atas) tidak melonggar.
const POLA_SUMBER_DEV = [
	/^\/src\/react-app\/assets\/illustrations\/(agung|bendum|ketum|kpu|sekjend)\.png$/,
	/^\/src\/react-app\/assets\/members\/(alfiansyah|khaidir|rafika|robby|ilham)\.png$/,
];

// Lebar tetap: membatasi jumlah unique transformation Cloudflare Images
// (ditagih per kombinasi src+parameter/bulan) supaya biayanya tetap
// terprediksi — lihat DESIGN.md/plan gambar responsif.
const LEBAR_DIIZINKAN = new Set([480, 960, 1600]);

const FORMAT_KELUARAN = {
	avif: "image/avif",
	webp: "image/webp",
	original: "image/png",
} as const;
type FormatKeluaran = keyof typeof FORMAT_KELUARAN;

function sumberDiizinkan(src: string) {
	if (import.meta.env.DEV && POLA_SUMBER_DEV.some((pola) => pola.test(src))) return true;
	return POLA_SUMBER_DIIZINKAN.some((pola) => pola.test(src));
}

function formatDiizinkan(fmt: string): fmt is FormatKeluaran {
	return fmt in FORMAT_KELUARAN;
}

/**
 * `/img?src=/assets/<nama>-<hash>.png&w=<480|960|1600>&fmt=<avif|webp|original>`
 * Resize + konversi format on-demand lewat Images binding (gratis sampai 5.000
 * unique transformation/bulan), hasilnya di-cache lewat Cache API — lihat
 * ResponsiveImage.tsx untuk pemakai di sisi klien.
 */
export function buatRuteGambar() {
	const route = new Hono<{ Bindings: Env }>();

	route.get("/", async (c) => {
		const src = c.req.query("src") ?? "";
		const w = Number(c.req.query("w"));
		const fmt = c.req.query("fmt") ?? "";

		if (!sumberDiizinkan(src) || !LEBAR_DIIZINKAN.has(w) || !formatDiizinkan(fmt)) {
			return c.text("permintaan_tidak_valid", 400);
		}

		const permintaanCache = new Request(c.req.url, { headers: { accept: "image/*" } });
		const cache = caches.default;
		const tersimpan = await cache.match(permintaanCache);
		if (tersimpan) return tersimpan;

		// `not_found_handling: "single-page-application"` (wrangler.json) membuat
		// ASSETS.fetch tidak pernah 404 — path yang tak cocok jatuh ke index.html
		// (200, text/html). Content-Type diperiksa eksplisit supaya HTML itu
		// tidak ikut disodorkan ke Images binding sebagai "gambar".
		const asli = await c.env.ASSETS.fetch(new URL(src, c.req.url));
		const tipeAsli = asli.headers.get("content-type") ?? "";
		if (!asli.ok || !asli.body || !tipeAsli.startsWith("image/")) {
			return c.text("sumber_tidak_ditemukan", 404);
		}

		const hasil = await c.env.IMAGES.input(asli.body)
			.transform({ width: w })
			.output({ format: FORMAT_KELUARAN[fmt] });

		const response = hasil.response({
			headers: { "cache-control": "public, max-age=31536000, immutable" },
		});
		c.executionCtx.waitUntil(cache.put(permintaanCache, response.clone()));
		return response;
	});

	return route;
}
