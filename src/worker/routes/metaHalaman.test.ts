import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { buatWorker } from "../index";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

async function kirim(path: string) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => new Date("2026-09-20T00:00:00.000Z")).fetch(
		new Request(`https://kpu.kammi.id${path}`),
		{ ...env, ...RAHASIA_UJI },
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

describe("Meta OpenGraph per halaman publik (seam Worker)", () => {
	it("beranda mempertahankan title tetapi memakai metadata hasil verifikasi", async () => {
		const response = await kirim("/");
		expect(response.status).toBe(200);
		expect(response.headers.get("etag")).toBeNull();
		expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
		const html = await response.text();
		expect(html).toContain("<title>Penjaringan Calon Ketua Umum PP KAMMI — KPU Muktamar XIV</title>");
		for (const atribut of ['property="og:title"', 'name="twitter:title"']) {
			expect(html).toContain(`${atribut} content="Hasil Verifikasi Berkas Bakal Calon Ketua Umum PP KAMMI"`);
		}
		for (const atribut of ['property="og:image"', 'name="twitter:image"']) {
			expect(html).toContain(`${atribut} content="https://kpu.kammi.id/og/hasil-verifikasi.png"`);
		}
		expect(html).toContain("Masa perbaikan 3–5 Oktober 2026");
	});

	it.each(["/masuk", "/daftar", "/admin", "/bacalon", "/tidak-ada"])("%s mempertahankan metadata default", async (path) => {
		const html = await (await kirim(path)).text();
		expect(html).toContain('property="og:title" content="Pendaftaran Bakal Calon Ketua Umum PP KAMMI — KPU Muktamar XIV"');
		expect(html).toContain('property="og:image" content="https://kpu.kammi.id/og/default.png"');
		expect(html).not.toContain("/og/hasil-verifikasi.png");
	});

	it("beranda tidak memakai 304 dari cangkang yang belum ditulis ulang", async () => {
		const etag = (await env.ASSETS.fetch("https://kpu.kammi.id/")).headers.get("etag");
		const ctx = createExecutionContext();
		const response = await buatWorker().fetch(new Request("https://kpu.kammi.id/", { headers: { "if-none-match": etag! } }), env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("/og/hasil-verifikasi.png");
	});

	it("surat pengumuman tersedia tanpa akun dan mempertahankan PDF asli", async () => {
		const response = await env.ASSETS.fetch("https://kpu.kammi.id/pengumuman/hasil-verifikasi-berkas-2026.pdf");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/pdf");
		const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
		const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
		expect(hash).toBe("99fe3e48375097ee184e33a45d45224637aafb620b27f81e7c123ce8cdbe334e");
	});
	it.each([
		["/jadwal", "Jadwal — KPU Muktamar XIV KAMMI", "https://kpu.kammi.id/og/jadwal.png"],
		["/tentang", "Tentang — KPU Muktamar XIV KAMMI", "https://kpu.kammi.id/og/tentang.png"],
		["/peraturan", "Peraturan — KPU Muktamar XIV KAMMI", "https://kpu.kammi.id/og/peraturan.png"],
		["/unduhan", "Unduhan — KPU Muktamar XIV KAMMI", "https://kpu.kammi.id/og/unduhan.png"],
	])("%s menimpa <title> dan og:image/description sesuai halaman", async (path, title, ogImage) => {
		const response = await kirim(path);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");

		const html = await response.text();
		expect(html).toContain(`<title>${title}</title>`);
		expect(html).toContain(`property="og:image" content="${ogImage}"`);
		expect(html).not.toContain("Pendaftaran Bakal Calon Ketua Umum PP KAMMI — KPU Muktamar XIV</title>");
	});

	// Rute tertutup tetap memakai default index.html; beranda kini ditulis ulang
	// secara khusus tanpa mengganti default halaman lainnya.
});
