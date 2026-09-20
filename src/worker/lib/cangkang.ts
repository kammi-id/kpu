/**
 * Cangkang SPA = `index.html` apa adanya. `assets.not_found_handling` bernilai
 * "none" (wrangler.json), jadi Assets tak lagi jatuh ke index.html untuk path
 * yang tak dikenal — setiap rute SPA yang lewat Worker harus memintanya
 * eksplisit lewat sini. Tujuannya: berkas `/assets/*` yang hilang menjawab 404
 * sungguhan, bukan HTML 200 yang mewarisi `Cache-Control: immutable` dari
 * public/_headers dan tersimpan setahun di peramban dan edge.
 */
export function ambilCangkang(assets: Fetcher, request: Request) {
	return assets.fetch(new Request(new URL("/", request.url), request));
}

/** Rute SPA tidak pernah berekstensi; `/api/*` dan `/assets/*` tak pernah jatuh ke cangkang. */
export function jatuhKeCangkang(method: string, pathname: string) {
	if (method !== "GET" && method !== "HEAD") return false;
	if (pathname.startsWith("/api/") || pathname.startsWith("/assets/")) return false;
	return !/\.[^/]+$/.test(pathname);
}
