import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jaringan } from "../test/jaringan";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	KAMMI_ID_TOKEN: "token-kammi-id-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;
const WAKTU = new Date("2026-09-20T00:00:00.000Z");

function envUji(overrides: Partial<typeof RAHASIA_UJI> = {}): EnvUji {
	return { ...env, ...RAHASIA_UJI, ...overrides };
}

async function kirim(query: string, overrides: Partial<typeof RAHASIA_UJI> = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => WAKTU).fetch(
		new Request(`https://kpu.kammi.id/api/struktur${query}`),
		envUji(overrides),
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

const URL_STRUKTUR = "https://www.kammi.id/api/v1/struktur";

const DAFTAR_PW = [
	{ id: "pw-1", nama: "PW KAMMI Jawa Barat", slug: "jabar", jenis: "pw" },
	{ id: "pw-2", nama: "PW KAMMI Jawa Tengah", slug: "jateng", jenis: "pw" },
];

function upstreamMembalas(handler: (url: URL, authorization: string | null) => Response) {
	jaringan.use(
		http.get(URL_STRUKTUR, ({ request }) => handler(new URL(request.url), request.headers.get("authorization"))),
	);
}

describe("GET /api/struktur (tiket 21, seam Worker)", () => {
	it("menolak jenis yang tidak dikenal, termasuk saat kosong", async () => {
		const kosong = await kirim("");
		expect(kosong.status).toBe(400);
		expect(await kosong.json()).toMatchObject({ error: "jenis_tidak_valid" });

		const salah = await kirim("?jenis=pk");
		expect(salah.status).toBe(400);
		expect(await salah.json()).toMatchObject({ error: "jenis_tidak_valid" });
	});

	it("mewajibkan ancestor ketika jenis=pd", async () => {
		const response = await kirim("?jenis=pd");
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: "ancestor_wajib" });
	});

	it("jenis=pw tidak mewajibkan ancestor dan meneruskan hasil upstream apa adanya", async () => {
		upstreamMembalas(() => HttpResponse.json(DAFTAR_PW));

		const response = await kirim("?jenis=pw");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(DAFTAR_PW);
	});

	it("menyisipkan Authorization Bearer dari KAMMI_ID_TOKEN dan meneruskan jenis serta ancestor sebagai query upstream, tanpa membocorkan token ke klien", async () => {
		let queryDilihat: URLSearchParams | undefined;
		let authDilihat: string | null = null;
		upstreamMembalas((url, authorization) => {
			queryDilihat = url.searchParams;
			authDilihat = authorization;
			return HttpResponse.json([{ id: "pd-1", nama: "PD KAMMI Jakarta Selatan", slug: "jaksel", jenis: "pd" }]);
		});

		const response = await kirim("?jenis=pd&ancestor=pw-1");

		expect(response.status).toBe(200);
		expect(authDilihat).toBe(`Bearer ${RAHASIA_UJI.KAMMI_ID_TOKEN}`);
		expect(queryDilihat?.get("jenis")).toBe("pd");
		expect(queryDilihat?.get("ancestor")).toBe("pw-1");

		const teksResponsMentah = JSON.stringify(await response.clone().json());
		expect(teksResponsMentah).not.toContain(RAHASIA_UJI.KAMMI_ID_TOKEN);
		expect(response.headers.get("authorization")).toBeNull();
	});

	it("kegagalan upstream kammi.id menghasilkan 502 tanpa membocorkan detail internal", async () => {
		upstreamMembalas(() => new HttpResponse(null, { status: 500 }));

		const response = await kirim("?jenis=pw");

		expect(response.status).toBe(502);
		expect(await response.json()).toMatchObject({ error: "struktur_gagal_upstream" });
	});

	it("menutup endpoint bila KAMMI_ID_TOKEN tidak tersedia", async () => {
		const response = await kirim("?jenis=pw", { KAMMI_ID_TOKEN: undefined });
		expect(response.status).toBe(503);
	});
});
