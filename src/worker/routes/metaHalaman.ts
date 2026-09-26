import { Hono } from "hono";
import { ambilCangkang } from "../lib/cangkang";
import { hrefPramuat, PenyisipPramuat } from "../lib/pramuatRute";

type KontenMeta = { title: string; description: string; ogImage: string };

// Beranda dan seluruh rute tertutup (masuk/daftar/onboard/admin/bacalon) + 404
// memakai default di index.html apa adanya (og:image = /og/default.png) —
// tak perlu didaftarkan di sini. Hanya 4 rute publik lain yang perlu OG
// berbeda per halaman; lihat plan gambar+OG untuk alasan pembagian ini.
const KONTEN_META_HALAMAN: Record<string, KontenMeta> = {
	"/jadwal": {
		title: "Jadwal — KPU Muktamar XIV KAMMI",
		description: "Jadwal tahapan terbaru penjaringan Bakal Calon Ketua Umum PP KAMMI, seluruhnya dalam WIB.",
		ogImage: "https://kpu.kammi.id/og/jadwal.png",
	},
	"/tentang": {
		title: "Tentang — KPU Muktamar XIV KAMMI",
		description: "Profil Komisi Penjaringan Umum Muktamar KAMMI XIV dan lima anggotanya.",
		ogImage: "https://kpu.kammi.id/og/tentang.png",
	},
	"/peraturan": {
		title: "Peraturan — KPU Muktamar XIV KAMMI",
		description: "Ringkasan PKPU dan dokumen lengkap peraturan penjaringan Bakal Calon Ketua Umum PP KAMMI.",
		ogImage: "https://kpu.kammi.id/og/peraturan.png",
	},
	"/unduhan": {
		title: "Unduhan — KPU Muktamar XIV KAMMI",
		description: "Formulir A.1 sampai A.6 untuk kelengkapan berkas Bakal Calon Ketua Umum PP KAMMI.",
		ogImage: "https://kpu.kammi.id/og/unduhan.png",
	},
};

class GantiIsiTeks implements HTMLRewriterElementContentHandlers {
	constructor(private readonly teks: string) {}
	element(element: Element) {
		element.setInnerContent(this.teks);
	}
}

class GantiAtribut implements HTMLRewriterElementContentHandlers {
	constructor(
		private readonly nama: string,
		private readonly nilai: string,
	) {}
	element(element: Element) {
		element.setAttribute(this.nama, this.nilai);
	}
}

async function halamanDenganMeta(request: Request, assets: Fetcher, konten: KontenMeta) {
	// Badan hasil rewrite berbeda dari index.html per halaman, jadi validator
	// index.html (ETag / If-None-Match) tidak boleh ikut: kalau tidak, halaman yang
	// pernah di-cache peramban dijawab 304 selamanya, walau meta di Worker berubah
	// sementara index.html tetap sama. Halaman kecil, jadi selalu 200 penuh.
	const permintaan = new Headers(request.headers);
	permintaan.delete("if-none-match");
	permintaan.delete("if-modified-since");
	const asli = await ambilCangkang(assets, new Request(request, { headers: permintaan }));
	if (!asli.ok) return asli;

	const url = new URL(request.url).toString();
	// Kosong untuk rute yang tidak dipecah (/jadwal, /tentang, /unduhan); handler
	// tetap dipasang karena tanpa href ia tidak menambahkan apa pun.
	const hrefs = await hrefPramuat(assets, request);
	const hasil = new HTMLRewriter()
		.on("head", new PenyisipPramuat(hrefs))
		.on("title", new GantiIsiTeks(konten.title))
		.on('meta[name="description"]', new GantiAtribut("content", konten.description))
		.on('meta[property="og:title"]', new GantiAtribut("content", konten.title))
		.on('meta[property="og:description"]', new GantiAtribut("content", konten.description))
		.on('meta[property="og:image"]', new GantiAtribut("content", konten.ogImage))
		.on('meta[property="og:url"]', new GantiAtribut("content", url))
		.on('meta[name="twitter:title"]', new GantiAtribut("content", konten.title))
		.on('meta[name="twitter:description"]', new GantiAtribut("content", konten.description))
		.on('meta[name="twitter:image"]', new GantiAtribut("content", konten.ogImage))
		.transform(asli);

	const headers = new Headers(hasil.headers);
	headers.set("cache-control", "public, max-age=0, must-revalidate");
	headers.delete("etag");
	return new Response(hasil.body, { status: hasil.status, headers });
}

/** Menimpa `<title>`/OG/Twitter meta index.html per halaman publik — lihat plan gambar+OG. */
export function buatRuteMetaHalaman() {
	const route = new Hono<{ Bindings: Env }>();
	for (const [path, konten] of Object.entries(KONTEN_META_HALAMAN)) {
		route.get(path, (c) => halamanDenganMeta(c.req.raw, c.env.ASSETS, konten));
	}
	return route;
}
