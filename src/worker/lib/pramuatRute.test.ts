import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { buatWorker } from "../index";

// Suite ini membaca dist/client lewat binding ASSETS sungguhan, termasuk
// pramuat-rute.json hasil plugin peta-pramuat-rute — CI menjalankan build
// sebelum tes (lihat .github/workflows/ci.yml), sama seperti metaHalaman.test.ts.

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

async function kirim(path: string, headers?: HeadersInit) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => new Date("2026-09-20T00:00:00.000Z")).fetch(
		new Request(`https://kpu.kammi.id${path}`, { headers }),
		{ ...env, ...RAHASIA_UJI },
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

const pramuatDi = (html: string) => [...html.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">/g)].map((m) => m[1]);

let peta: Record<string, string[]>;

// Migrasi D1 sudah diterapkan oleh setupFiles (src/worker/test/apply-migrations.ts).
beforeAll(async () => {
	const respons = await env.ASSETS.fetch(new Request("https://kpu.kammi.id/pramuat-rute.json"));
	expect(respons.ok, "dist/client/pramuat-rute.json harus ada — jalankan build sebelum tes").toBe(true);
	peta = await respons.json();
});

describe("Pramuat chunk rute yang dipecah", () => {
	it("peta build mencakup rute terpecah dan tidak memuat bundel utama", () => {
		expect(Object.keys(peta).sort()).toEqual(["/daftar", "/masuk", "/onboard", "/peraturan"]);
		for (const hrefs of Object.values(peta)) {
			expect(hrefs.length).toBeGreaterThan(0);
			for (const href of hrefs) {
				expect(href).toMatch(/^\/assets\/[\w.-]+\.js$/);
				// Bundel utama sudah ada di <script> index.html.
				expect(href).not.toMatch(/^\/assets\/index-/);
			}
		}
		// Alasan pertama fitur ini ada: SafeMarkdown ikut dipramuat di /peraturan.
		expect(peta["/peraturan"].some((href) => href.includes("SafeMarkdown"))).toBe(true);
	});

	it.each(["/daftar", "/masuk"])("%s (lewat cangkang Worker) memuat pramuat sesuai peta", async (path) => {
		const response = await kirim(path);
		expect(response.status).toBe(200);
		expect(pramuatDi(await response.text())).toEqual(peta[path]);
	});

	it("/onboard yang terbuka memuat pramuat sesuai peta", async () => {
		// Belum ada Admin bersama di DB uji, ONBOARD_TOKEN terisi, dan tanggal uji
		// berada di masa layanan aktif — jadi gerbangnya terbuka.
		const response = await kirim("/onboard");
		expect(response.status).toBe(200);
		expect(pramuatDi(await response.text())).toEqual(peta["/onboard"]);
	});

	it("/peraturan mendapat pramuat DAN tetap mendapat meta per halaman", async () => {
		const html = await (await kirim("/peraturan")).text();
		expect(pramuatDi(html)).toEqual(peta["/peraturan"]);
		expect(html).toContain("<title>Peraturan — KPU Muktamar XIV KAMMI</title>");
	});

	it.each(["/jadwal", "/tentang", "/unduhan"])("%s tidak dipecah, jadi tanpa pramuat", async (path) => {
		const html = await (await kirim(path)).text();
		expect(pramuatDi(html)).toEqual([]);
	});

	it("rute SPA tanpa entri di peta tidak disentuh — ETag index.html tetap ada", async () => {
		const response = await kirim("/bacalon/data");
		expect(response.status).toBe(200);
		expect(response.headers.get("etag")).toBeTruthy();
		expect(pramuatDi(await response.text())).toEqual([]);
	});

	it("rute yang disisipi tidak membawa ETag index.html dan tidak menjawab 304", async () => {
		// Kalau validator index.html ikut, peramban yang menyimpan badan tanpa
		// pramuat akan dijawab 304 dan terus memakai badan lama itu.
		const pertama = await kirim("/daftar");
		expect(pertama.headers.get("etag")).toBeNull();

		const etagIndex = (await kirim("/bacalon/data")).headers.get("etag")!;
		const ulang = await kirim("/daftar", { "if-none-match": etagIndex });
		expect(ulang.status).toBe(200);
		expect(pramuatDi(await ulang.text())).toEqual(peta["/daftar"]);
	});
});
