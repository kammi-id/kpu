import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { buatWorker } from "./index";
import defaultWorker from "./index";

async function ambilTahap(sekarang: () => Date, path = "/api/tahap") {
	const worker = buatWorker(sekarang);
	const ctx = createExecutionContext();
	const response = await worker.fetch(new Request(`http://kpu.kammi.id${path}`), env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe("API tahap (seam Worker, jam disuntikkan)", () => {
	it("mengembalikan MasaPendaftaran tepat pada batas mulainya", async () => {
		const response = await ambilTahap(() => new Date("2026-09-16T17:00:00.000Z"));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.tahap).toBe("MasaPendaftaran");
		expect(body.bolehRegistrasi).toBe(true);
	});

	it("mengembalikan BelumDibuka tepat sebelum batas mulai Masa Pendaftaran", async () => {
		const response = await ambilTahap(() => new Date("2026-09-16T16:59:59.999Z"));
		const body = await response.json();
		expect(body.tahap).toBe("BelumDibuka");
		expect(body.bolehRegistrasi).toBe(false);
	});

	it("mengembalikan Selesai pada dan setelah Penghapusan Akhir, layanan tidak aktif", async () => {
		const response = await ambilTahap(() => new Date("2027-01-27T17:00:00.000Z"));
		const body = await response.json();
		expect(body.tahap).toBe("Selesai");
		expect(body.layananAktif).toBe(false);
	});

	it("menyertakan sembilan tahap jadwal terbaru dengan status", async () => {
		const response = await ambilTahap(() => new Date("2026-09-20T00:00:00.000Z"));
		const body = await response.json();
		expect(body.jadwal).toHaveLength(9);
		expect(body.jadwal[1]).toMatchObject({
			nama: "Pengambilan & Pengembalian Berkas Pendaftaran",
			rentangWib: "17–30 September 2026",
			status: "berjalan",
		});
		expect(body.jadwal.find((item: { nama: string }) => item.nama === "Debat Kandidat")).toMatchObject({ rentangWib: "17 Oktober 2026" });
	});

	it("rute tidak dikenal menjawab 404 JSON, bukan index.html", async () => {
		const response = await ambilTahap(() => new Date(), "/api/tidak-ada");
		expect(response.status).toBe(404);
	});
});

describe("ekspor default", () => {
	it("memakai jam nyata", async () => {
		const ctx = createExecutionContext();
		const before = Date.now();
		const response = await defaultWorker.fetch(
			new Request("http://kpu.kammi.id/api/tahap"),
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);
		const after = Date.now();
		const body = await response.json();
		const sekarang = new Date(body.sekarang).getTime();
		expect(sekarang).toBeGreaterThanOrEqual(before);
		expect(sekarang).toBeLessThanOrEqual(after + 1000);
	});
});

function id() {
	return crypto.randomUUID();
}

function nia() {
	return crypto.getRandomValues(new Uint32Array(1))[0].toString().padStart(11, "0").slice(-11);
}

function whatsapp() {
	return `62${crypto.getRandomValues(new Uint32Array(1))[0].toString().padStart(11, "1")}`;
}

async function sisipBacalon(overrides: Partial<Record<string, unknown>> = {}) {
	const values = {
		id: id(),
		name: "Contoh Bakal Calon",
		email: `${id()}@example.test`,
		emailVerified: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		role: "bacalon",
		whatsapp: "6281234567890",
		persetujuanVersi: "persetujuan-v1",
		persetujuanPada: new Date().toISOString(),
		nia: nia(),
		...overrides,
	};
	await env.DB.prepare(
		`INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt","role","whatsapp","persetujuanVersi","persetujuanPada","nia")
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
	)
		.bind(
			values.id,
			values.name,
			values.email,
			values.emailVerified,
			values.createdAt,
			values.updatedAt,
			values.role,
			values.whatsapp as string | null,
			values.persetujuanVersi as string | null,
			values.persetujuanPada as string | null,
			values.nia as string | null,
		)
		.run();
	return values.id as string;
}

async function sisipAdmin(overrides: Partial<Record<string, unknown>> = {}) {
	const values = {
		id: id(),
		name: "Admin bersama",
		email: `${id()}@example.test`,
		emailVerified: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		role: "admin",
		...overrides,
	};
	await env.DB.prepare(
		`INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt","role")
		 VALUES (?,?,?,?,?,?,?)`,
	)
		.bind(
			values.id,
			values.name,
			values.email,
			values.emailVerified,
			values.createdAt,
			values.updatedAt,
			values.role,
		)
		.run();
	return values.id as string;
}

describe("migrasi 0001_init: integritas dasar", () => {
	it("Bakal Calon tanpa WhatsApp ditolak", async () => {
		await expect(sisipBacalon({ whatsapp: null })).rejects.toThrow();
	});

	it("PNG di kelompok 6 ditolak", async () => {
		const userId = await sisipBacalon();
		await expect(
			env.DB.prepare(
				`INSERT INTO "berkas" ("id","userId","kelompok","r2Key","namaAsli","mime","ukuranByte","sha256","diunggahPada")
				 VALUES (?,?,6,?,?,?,?,?,?)`,
			)
				.bind(
					id(),
					userId,
					`berkas/${crypto.randomUUID()}`,
					"karya.png",
					"image/png",
					1024,
					"a".repeat(64),
					new Date().toISOString(),
				)
				.run(),
		).rejects.toThrow();
	});

	it("Admin kedua ditolak indeks unik, pertama diterima tanpa NIA", async () => {
		await expect(sisipAdmin()).resolves.toBeDefined();
		await expect(sisipAdmin()).rejects.toThrow();
	});
});

describe("migrasi 0003_migrasi_skema_nia: integritas", () => {
	it("Bakal Calon tanpa NIA ditolak", async () => {
		await expect(sisipBacalon({ nia: null })).rejects.toThrow();
	});

	it.each(["1234567890", "123456789012", "1234567890a"])(
		"NIA berformat salah ditolak (%s)",
		async (nilai) => {
			await expect(sisipBacalon({ nia: nilai })).rejects.toThrow();
		},
	);

	it("NIA duplikat ditolak", async () => {
		const nilai = nia();
		await sisipBacalon({ nia: nilai, whatsapp: whatsapp() });
		await expect(sisipBacalon({ nia: nilai, whatsapp: whatsapp() })).rejects.toThrow();
	});
});
