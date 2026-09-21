import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "./index";
import { jaringan } from "./test/jaringan";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
	KAMMI_ID_TOKEN: "token-kammi-id-uji",
};

const WAKTU = new Date("2026-09-20T00:00:00.000Z"); // Masa Pendaftaran
const REVALIDASI = "public, max-age=0, must-revalidate";

async function kirim(path: string, init: RequestInit = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => WAKTU).fetch(
		new Request(`https://kpu.kammi.id${path}`, init),
		{ ...env, ...RAHASIA_UJI },
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

// Berkas Vite ber-hash asli dari build (`npm run build:app` sebelum `npm test`).
async function berkasJsBerhash() {
	const html = await (await env.ASSETS.fetch("https://kpu.kammi.id/")).text();
	const path = html.match(/\/assets\/[^"]+\.js/)?.[0];
	expect(path, "index.html hasil build harus memuat /assets/*.js").toBeTruthy();
	return path as string;
}

describe("jawaban Worker: default tanpa cache", () => {
	it.each([
		["JSON API publik", "/api/tahap", 200],
		["404 API", "/api/tidak-ada", 404],
		["API tertutup tanpa sesi", "/api/akun", 401],
		["sesi Better Auth", "/api/auth/get-session", 200],
	])("%s (%s) → no-store", async (_nama, path, status) => {
		const response = await kirim(path);
		expect(response.status).toBe(status);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("berkas statis lewat Assets (public/_headers)", () => {
	it("berkas ber-hash di /assets/* immutable setahun", async () => {
		const response = await env.ASSETS.fetch(`https://kpu.kammi.id${await berkasJsBerhash()}`);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
	});

	it("gambar OG tak ber-hash: segar sehari, stale-while-revalidate seminggu, tidak immutable", async () => {
		const response = await env.ASSETS.fetch("https://kpu.kammi.id/og/default.png");
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
	});

	it("index.html tetap revalidasi tiap kali", async () => {
		const response = await env.ASSETS.fetch("https://kpu.kammi.id/");
		expect(response.headers.get("cache-control")).toBe(REVALIDASI);
		expect(response.headers.get("etag")).toBeTruthy();
	});
});

describe("cangkang SPA vs berkas hilang (assets.not_found_handling = none)", () => {
	it.each(["/masuk", "/daftar", "/akun/berkas/3", "/admin/audit"])("%s → index.html, selalu direvalidasi", async (path) => {
		const response = await kirim(path);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("cache-control")).toBe(REVALIDASI);
		expect(await response.text()).toContain('<div id="root">');
	});

	it("cangkang mendukung request bersyarat: ETag index.html asli → 304", async () => {
		// Sengaja rute SPA yang cangkangnya tidak ditulis ulang. /masuk, /daftar, dan
		// /onboard kini disisipi modulepreload (lib/pramuatRute.ts), jadi badannya
		// berbeda dari index.html dan ETag-nya dibuang — aturan yang sama dengan
		// metaHalaman.ts; lihat pramuatRute.test.ts.
		const pertama = await kirim("/bacalon/data");
		const etag = pertama.headers.get("etag");
		expect(etag).toBeTruthy();
		const kedua = await kirim("/bacalon/data", { headers: { "if-none-match": etag as string } });
		expect(kedua.status).toBe(304);
	});

	it("berkas ber-hash yang hilang → 404 sungguhan, tak pernah HTML immutable", async () => {
		const response = await kirim("/assets/index-HashLama123.js");
		expect(response.status).toBe(404);
		expect(response.headers.get("content-type")).not.toContain("text/html");
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it.each(["/logo-kammi.png", "/robots.txt", "/og/tidak-ada.png", "/assets/tanpa-ekstensi"])(
		"%s hilang → 404, bukan cangkang",
		async (path) => {
			const response = await kirim(path);
			expect(response.status).toBe(404);
			expect(response.headers.get("cache-control")).toBe("no-store");
		},
	);

	it("hanya GET/HEAD yang jatuh ke cangkang", async () => {
		expect((await kirim("/masuk", { method: "POST" })).status).toBe(404);
	});

	it("GET /onboard membuka cangkang hanya bila onboarding tersedia", async () => {
		await env.DB.prepare('DELETE FROM "user"').run();
		const response = await kirim("/onboard");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(await response.text()).toContain('<div id="root">');
	});

	it("GET /onboard tetap digerbangi (404 JSON saat token belum diset), tidak bocor cangkang", async () => {
		const ctx = createExecutionContext();
		const response = await buatWorker(() => WAKTU).fetch(
			new Request("https://kpu.kammi.id/onboard"),
			{ ...env, ...RAHASIA_UJI, ONBOARD_TOKEN: undefined },
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(response.headers.get("content-type")).toContain("application/json");
	});
});

describe("halaman meta OG (HTMLRewriter) tidak meminjam validator index.html", () => {
	it("/jadwal tanpa ETag dan tetap direvalidasi", async () => {
		const response = await kirim("/jadwal");
		expect(response.status).toBe(200);
		expect(response.headers.get("etag")).toBeNull();
		expect(response.headers.get("cache-control")).toBe(REVALIDASI);
	});

	it("If-None-Match berisi ETag index.html tidak menghasilkan 304 untuk badan yang sudah ditulis ulang", async () => {
		const etagIndex = (await env.ASSETS.fetch("https://kpu.kammi.id/")).headers.get("etag") as string;
		const response = await kirim("/jadwal", { headers: { "if-none-match": etagIndex } });
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("<title>Jadwal — KPU Muktamar XIV KAMMI</title>");
	});
});

describe("GET /api/struktur: hanya jawaban sukses yang boleh di-cache peramban", () => {
	const URL_STRUKTUR = "https://www.kammi.id/api/v1/struktur";

	it("sukses → public, max-age=3600", async () => {
		jaringan.use(http.get(URL_STRUKTUR, () => HttpResponse.json([{ id: "pw-1", nama: "PW KAMMI Aceh", slug: "aceh", jenis: "pw" }])));
		const response = await kirim("/api/struktur?jenis=pw");
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
	});

	it.each([
		["upstream gagal", "?jenis=pw", 502],
		["jenis tidak valid", "?jenis=pk", 400],
	])("%s → no-store", async (_nama, query, status) => {
		jaringan.use(http.get(URL_STRUKTUR, () => new HttpResponse(null, { status: 500 })));
		const response = await kirim(`/api/struktur${query}`);
		expect(response.status).toBe(status);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("GET /api/berkas-publik/:id: revalidasi dengan ETag R2", () => {
	const ISI = new TextEncoder().encode("%PDF-1.4 isi uji");
	let id: string;

	beforeEach(async () => {
		id = crypto.randomUUID();
		const r2Key = `publik/${crypto.randomUUID()}`;
		await env.BERKAS.put(r2Key, ISI, { httpMetadata: { contentType: "application/pdf" } });
		await env.DB.prepare('DELETE FROM "berkasPublik"').run();
		await env.DB.prepare(
			`INSERT INTO "berkasPublik" ("id","kategori","judul","urutan","r2Key","namaAsli","mime","ukuranByte","diunggahPada")
			 VALUES (?,?,?,?,?,?,?,?,?)`,
		)
			.bind(id, "formulir", "Formulir A.1", 1, r2Key, "formulir-a1.pdf", "application/pdf", ISI.byteLength, WAKTU.toISOString())
			.run();
	});

	it("200 membawa ETag dan no-cache (bukan max-age)", async () => {
		const response = await kirim(`/api/berkas-publik/${id}`);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-cache");
		expect(response.headers.get("etag")).toBeTruthy();
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(ISI);
	});

	it("If-None-Match cocok → 304 tanpa badan, ETag tetap ada", async () => {
		const etag = (await kirim(`/api/berkas-publik/${id}`)).headers.get("etag") as string;
		const response = await kirim(`/api/berkas-publik/${id}`, { headers: { "if-none-match": etag } });
		expect(response.status).toBe(304);
		expect(response.headers.get("etag")).toBe(etag);
		expect(await response.text()).toBe("");
	});

	it("If-None-Match usang → 200 penuh", async () => {
		const response = await kirim(`/api/berkas-publik/${id}`, { headers: { "if-none-match": '"usang"' } });
		expect(response.status).toBe(200);
	});

	it("gerbang tahap tetap berlaku walau peramban punya salinan bersyarat", async () => {
		const etag = (await kirim(`/api/berkas-publik/${id}`)).headers.get("etag") as string;
		const ctx = createExecutionContext();
		const response = await buatWorker(() => new Date("2027-01-27T17:00:00.000Z")).fetch(
			new Request(`https://kpu.kammi.id/api/berkas-publik/${id}`, { headers: { "if-none-match": etag } }),
			{ ...env, ...RAHASIA_UJI },
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(403);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});
