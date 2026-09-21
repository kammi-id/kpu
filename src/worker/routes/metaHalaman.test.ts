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

	// Beranda ("/") dan rute tertutup (masuk/daftar/onboard/admin/bacalon) sengaja
	// TIDAK didaftarkan di buatRuteMetaHalaman(), jadi memakai OG default
	// index.html. Beranda disajikan Assets langsung; rute tertutup lain mendarat
	// di cangkang Worker lewat not_found_handling "none" (lihat cache.test.ts dan
	// pramuatRute.test.ts), tapi tanpa penimpaan meta.
});
