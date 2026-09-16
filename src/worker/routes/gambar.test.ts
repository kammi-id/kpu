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

describe("GET /img (whitelist ketat, seam Worker)", () => {
	it("menolak src di luar daftar ilustrasi/anggota yang diizinkan", async () => {
		const response = await kirim("/img?src=/assets/../../secret.png&w=960&fmt=avif");
		expect(response.status).toBe(400);
	});

	it("menolak lebar di luar daftar tetap", async () => {
		const response = await kirim("/img?src=/assets/ketum-abc123.png&w=999&fmt=avif");
		expect(response.status).toBe(400);
	});

	it("menolak format di luar avif/webp/original", async () => {
		const response = await kirim("/img?src=/assets/ketum-abc123.png&w=960&fmt=jpeg");
		expect(response.status).toBe(400);
	});

	it("meloloskan src berpola benar ke ASSETS (404 kalau berkasnya tak ada, bukan 400)", async () => {
		const response = await kirim("/img?src=/assets/ketum-tidak-ada.png&w=960&fmt=avif");
		expect(response.status).toBe(404);
	});
});
