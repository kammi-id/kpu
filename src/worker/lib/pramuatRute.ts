import { ambilCangkang } from "./cangkang";

/**
 * Menyisipkan `<link rel="modulepreload">` untuk chunk rute yang dipecah
 * (React.lazy di App.tsx), supaya diunduh bersamaan dengan bundel utama alih-
 * alih menunggu bundel utama selesai dijalankan dulu. Petanya dihasilkan saat
 * build client (plugin peta-pramuat-rute di vite.config.ts) dan dibaca di sini
 * saat runtime, karena Worker dibangun sebelum client — nama chunk ber-hash
 * belum ada saat kode ini dikompilasi.
 *
 * Kalau petanya tidak ada atau gagal dibaca, semua fungsi di sini jatuh ke
 * perilaku lama (cangkang apa adanya). Pramuat hanya mempercepat; ketiadaannya
 * tidak pernah boleh merusak halaman.
 */

type PetaPramuat = Record<string, string[]>;

// Peta dibaca dari berkas build sendiri, tapi disisipkan sebagai HTML mentah,
// jadi dibatasi ke bentuk nama yang memang dihasilkan Vite.
const HREF_SAH = /^\/assets\/[\w.-]+\.js$/;

// Singgahan per isolate. Isinya identik untuk semua permintaan di satu versi
// deploy (isolate tidak melintasi versi), jadi aman dipakai bersama. Kegagalan
// sengaja tidak disinggahkan — permintaan berikutnya mencoba lagi.
let petaSinggahan: PetaPramuat | undefined;

async function ambilPeta(assets: Fetcher, urlPermintaan: string): Promise<PetaPramuat> {
	if (petaSinggahan) return petaSinggahan;
	try {
		const respons = await assets.fetch(new Request(new URL("/pramuat-rute.json", urlPermintaan)));
		if (!respons.ok) return {};
		petaSinggahan = (await respons.json()) as PetaPramuat;
		return petaSinggahan;
	} catch {
		return {};
	}
}

/** Daftar href chunk yang perlu dipramuat untuk path permintaan ini; kosong bila tidak ada. */
export async function hrefPramuat(assets: Fetcher, request: Request): Promise<string[]> {
	const peta = await ambilPeta(assets, request.url);
	return (peta[new URL(request.url).pathname] ?? []).filter((href) => HREF_SAH.test(href));
}

/** Handler HTMLRewriter untuk `<head>`: menambahkan satu `modulepreload` per href. */
export class PenyisipPramuat implements HTMLRewriterElementContentHandlers {
	constructor(private readonly hrefs: string[]) {}
	element(head: Element) {
		// `crossorigin` menyamai <script type="module" crossorigin> yang dipasang
		// Vite di index.html. Mode kredensial yang beda membuat peramban tidak
		// memakai hasil pramuat dan mengunduh chunk itu dua kali.
		for (const href of this.hrefs) head.append(`<link rel="modulepreload" crossorigin href="${href}">`, { html: true });
	}
}

/**
 * Cangkang SPA dengan pramuat chunk rute. Rute tanpa entri di peta mendapat
 * `ambilCangkang` apa adanya — termasuk ETag dan jawaban 304-nya — jadi
 * perubahan ini tidak menyentuh rute lain sama sekali.
 */
export async function cangkangDenganPramuat(assets: Fetcher, request: Request): Promise<Response> {
	const hrefs = await hrefPramuat(assets, request);
	if (hrefs.length === 0) return ambilCangkang(assets, request);

	// Sama seperti metaHalaman.ts: badan hasil rewrite berbeda dari index.html,
	// jadi validator index.html tidak boleh ikut. Kalau ikut, peramban yang
	// menyimpan versi lama dijawab 304 dan terus memakai badan tanpa pramuat.
	const permintaan = new Headers(request.headers);
	permintaan.delete("if-none-match");
	permintaan.delete("if-modified-since");
	const asli = await ambilCangkang(assets, new Request(request, { headers: permintaan }));
	if (!asli.ok) return asli;

	const hasil = new HTMLRewriter().on("head", new PenyisipPramuat(hrefs)).transform(asli);
	const headers = new Headers(hasil.headers);
	headers.delete("etag");
	return new Response(hasil.body, { status: hasil.status, headers });
}
