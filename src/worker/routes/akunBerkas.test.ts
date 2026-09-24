import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jaringan } from "../test/jaringan";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;

const MASA_PENDAFTARAN = new Date("2026-09-20T00:00:00.000Z");
const PEMERIKSAAN = new Date("2026-09-28T00:00:00.000Z");
const MASA_PERBAIKAN = new Date("2026-10-01T00:00:00.000Z");
const TERKUNCI = new Date("2026-10-12T00:00:00.000Z");
const BELUM_DIBUKA = new Date("2026-09-01T00:00:00.000Z");

function envUji(overrides: Partial<typeof RAHASIA_UJI> = {}): EnvUji {
	return { ...env, ...RAHASIA_UJI, ...overrides };
}

async function kirim(waktu: Date, path: string, init: RequestInit = {}) {
	const ctx = createExecutionContext();
	const response = await buatWorker(() => waktu).fetch(
		new Request(`https://kpu.kammi.id${path}`, init),
		envUji(),
		ctx,
	);
	await waitOnExecutionContext(ctx);
	return response;
}

function json(body: Record<string, string>) {
	return {
		method: "POST",
		headers: { "content-type": "application/json", origin: "https://kpu.kammi.id" },
		body: JSON.stringify(body),
	};
}

function turnstileSelaluLolos() {
	jaringan.use(
		http.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", () => HttpResponse.json({ success: true })),
	);
}

/** Penggerbangan NIA (tiket 04): sign-up/email sekarang memverifikasi ulang lewat kammi.id, jadi setiap registrasi uji butuh ini juga. */
function kammiIdSelaluLolos() {
	jaringan.use(
		http.get("https://www.kammi.id/api/v1/members/:nia", ({ params }) =>
			HttpResponse.json({ nia: params.nia, nama: "Bakal Calon", jenjangKaderisasi: "AB3", keadaanKader: "aktif" })),
	);
}

/**
 * Better Auth menulis `session.createdAt`/`updatedAt` dari jam sungguhan, bukan
 * dari `sekarang()` yang disuntikkan ke Worker. Uji ini banyak melompat lintas
 * tahap (hari/bulan berbeda dari hari sungguhan), jadi baris sesi harus ditulis
 * ulang ke waktu palsu yang sedang diuji — sama seperti `setelWaktuSesiAdmin` di
 * peraturan.test.ts — supaya pemeriksaan idle/absolut di `ambilSesi` konsisten
 * dengan jam palsu tersebut alih-alih jam sungguhan.
 */
async function pindahWaktuSesi(email: string, waktu: Date) {
	await env.DB.prepare(
		`UPDATE "session" SET "createdAt" = ?, "updatedAt" = ?
		 WHERE "userId" = (SELECT "id" FROM "user" WHERE "email" = ?)`,
	)
		.bind(waktu.toISOString(), waktu.toISOString(), email)
		.run();
}

let whatsappBerikutnya = 0;

/** Registrasi Bakal Calon sungguhan (seam yang sama seperti auth.test.ts) agar dua akun berbeda tersedia untuk uji kepemilikan. */
async function daftarBacalon(email: string, password = "kata-sandi-aman") {
	whatsappBerikutnya += 1;
	const whatsapp = `08123450${String(whatsappBerikutnya).padStart(4, "0")}`;
	const nia = `3020100${String(whatsappBerikutnya).padStart(4, "0")}`;
	turnstileSelaluLolos();
	kammiIdSelaluLolos();
	const response = await kirim(
		MASA_PENDAFTARAN,
		"/api/auth/sign-up/email",
		{
			...json({ name: "Bakal Calon", email, whatsapp, password, persetujuan: "true", nia }),
			headers: {
				"content-type": "application/json",
				origin: "https://kpu.kammi.id",
				"x-captcha-response": "token-turnstile-uji",
			},
		},
	);
	expect(response.status).toBe(200);
	const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
	expect(cookie).toBeTruthy();
	await pindahWaktuSesi(email, MASA_PENDAFTARAN);
	return cookie as string;
}

const DATA_ADMIN = {
	token: RAHASIA_UJI.ONBOARD_TOKEN,
	name: "Admin bersama",
	email: "admin@example.test",
	password: "kata-sandi-admin",
};

async function sesiAdmin() {
	await kirim(MASA_PENDAFTARAN, "/onboard", json(DATA_ADMIN));
	const response = await kirim(
		MASA_PENDAFTARAN,
		"/api/auth/sign-in/email",
		json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }),
	);
	expect(response.status).toBe(200);
	await pindahWaktuSesi(DATA_ADMIN.email, MASA_PENDAFTARAN);
	return response.headers.get("set-cookie")?.split(";", 1)[0] as string;
}

const SIGNATURE_VALID: Record<string, number[]> = {
	"application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
	"image/jpeg": [0xff, 0xd8, 0xff],
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function bytesValid(mime: string, ukuran = 32): Uint8Array {
	const signature = SIGNATURE_VALID[mime];
	const bytes = new Uint8Array(Math.max(ukuran, signature.length));
	bytes.set(signature, 0);
	return bytes;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unggah(
	cookie: string,
	kelompok: number,
	opts: { namaAsli?: string; mime?: string; jenisRekomendasi?: string } = {},
	bytes: Uint8Array = bytesValid(opts.mime ?? "application/pdf"),
	contentLength = String(bytes.byteLength),
	waktu = MASA_PENDAFTARAN,
) {
	const { namaAsli = "dokumen.pdf", mime = "application/pdf", jenisRekomendasi } = opts;
	const query = new URLSearchParams({ namaAsli });
	if (jenisRekomendasi) query.set("jenisRekomendasi", jenisRekomendasi);
	const headers: Record<string, string> = { cookie, "content-type": mime };
	if (contentLength !== "") headers["content-length"] = contentLength;
	return kirim(waktu, `/api/akun/berkas/${kelompok}?${query}`, { method: "POST", headers, body: bytes });
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "berkas"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("unggah berkas: format dan validasi (acceptance 14, 15)", () => {
	it("kelompok 6 hanya menerima PDF, menolak JPEG/PNG", async () => {
		const cookie = await daftarBacalon("k6@example.test");
		expect((await unggah(cookie, 6, { mime: "application/pdf", namaAsli: "kti.pdf" })).status).toBe(201);
		expect((await unggah(cookie, 6, { mime: "image/jpeg", namaAsli: "kti.jpg" })).status).toBe(400);
		expect((await unggah(cookie, 6, { mime: "image/png", namaAsli: "kti.png" })).status).toBe(400);
	});

	it("sembilan kelompok lain menerima PDF, JPEG, dan PNG", async () => {
		const cookie = await daftarBacalon("sembilan@example.test");
		for (const kelompok of [1, 2, 3, 4, 5, 8, 9, 10]) {
			expect((await unggah(cookie, kelompok, { mime: "application/pdf", namaAsli: `berkas${kelompok}.pdf` })).status).toBe(201);
		}
		expect((await unggah(cookie, 1, { mime: "image/jpeg", namaAsli: "b.jpg" })).status).toBe(201);
		expect((await unggah(cookie, 2, { mime: "image/png", namaAsli: "b.png" })).status).toBe(201);
	});

	it("menolak berkas > 20 MiB dan berkas tanpa Content-Length", async () => {
		const cookie = await daftarBacalon("besar@example.test");
		const terlaluBesar = String(20 * 1024 * 1024 + 1);
		expect((await unggah(cookie, 1, {}, bytesValid("application/pdf"), terlaluBesar)).status).toBe(400);
		expect((await unggah(cookie, 1, {}, bytesValid("application/pdf"), "")).status).toBe(400);
		expect((await unggah(cookie, 1, {}, bytesValid("application/pdf"), "0")).status).toBe(400);
	});

	it("menolak ekstensi/MIME yang tidak cocok dengan signature, termasuk DOCX, ZIP, dan file mirip executable", async () => {
		const cookie = await daftarBacalon("tolak@example.test");
		// MIME diklaim PDF tapi ekstensi berkas .docx: ditolak sebelum menyentuh isi.
		expect((await unggah(cookie, 1, { namaAsli: "dokumen.docx" })).status).toBe(400);
		// Content-Type di luar tiga MIME yang dikenal (mis. DOCX/ZIP asli): metadata tidak valid.
		expect(
			(
				await unggah(
					cookie,
					1,
					{ mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", namaAsli: "dokumen.docx" },
					new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
				)
			).status,
		).toBe(400);
		// Diklaim PDF dengan namaAsli .pdf tapi isi sebenarnya ZIP (PK\x03\x04): signature tidak cocok.
		expect((await unggah(cookie, 1, { namaAsli: "dokumen.pdf" }, new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]))).status).toBe(400);
		// Diklaim PDF tapi isi sebenarnya berawalan MZ (executable Windows): signature tidak cocok.
		expect((await unggah(cookie, 1, { namaAsli: "dokumen.pdf" }, new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).status).toBe(400);
	});

	it("berkas keenam dalam satu kelompok ditolak (batas lima)", async () => {
		const cookie = await daftarBacalon("batas@example.test");
		for (let index = 0; index < 5; index += 1) {
			expect((await unggah(cookie, 2, { namaAsli: `b${index}.pdf` })).status).toBe(201);
		}
		const keenam = await unggah(cookie, 2, { namaAsli: "b5.pdf" });
		expect(keenam.status).toBe(409);
		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "berkas" WHERE "kelompok" = 2').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(5);
	});
});

describe("R2 dan integritas (acceptance terkait sha256/r2Key)", () => {
	it("berkas.sha256 sama dengan SHA-256 isi objek R2, dan kunci R2 tidak memuat identitas/kelompok/ekstensi", async () => {
		const cookie = await daftarBacalon("integritas@example.test");
		const bytes = bytesValid("application/pdf", 128);
		const response = await unggah(cookie, 3, { namaAsli: "rahasia-identitas.pdf" }, bytes);
		expect(response.status).toBe(201);
		const { id } = await response.json<{ id: string }>();

		const baris = await env.DB.prepare('SELECT "r2Key", "sha256" FROM "berkas" WHERE "id" = ?')
			.bind(id)
			.first<{ r2Key: string; sha256: string }>();
		expect(baris?.sha256).toBe(await sha256Hex(bytes));
		expect(baris?.r2Key).toMatch(/^berkas\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(baris?.r2Key).not.toContain("rahasia-identitas");
		expect(baris?.r2Key).not.toContain("integritas@example.test");
		expect(baris?.r2Key).not.toContain(".pdf");

		const objek = await env.BERKAS.get(baris?.r2Key as string);
		const isi = new Uint8Array(await objek?.arrayBuffer() as ArrayBuffer);
		expect(isi).toEqual(bytes);
	});

	it("kegagalan INSERT, termasuk batas lima, tidak meninggalkan objek R2 yatim", async () => {
		const cookie = await daftarBacalon("yatim@example.test");
		for (let index = 0; index < 5; index += 1) await unggah(cookie, 4, { namaAsli: `p${index}.pdf` });

		const sebelum = new Set((await env.BERKAS.list({ prefix: "berkas/" })).objects.map((object) => object.key));
		const gagal = await unggah(cookie, 4, { namaAsli: "keenam.pdf" });
		expect(gagal.status).toBe(409);
		const sesudah = new Set((await env.BERKAS.list({ prefix: "berkas/" })).objects.map((object) => object.key));
		expect(sesudah).toEqual(sebelum);
	});

	it("kegagalan INSERT karena galat D1 lain juga membersihkan objek R2", async () => {
		const cookie = await daftarBacalon("trigger@example.test");
		const sebelum = new Set((await env.BERKAS.list({ prefix: "berkas/" })).objects.map((object) => object.key));
		await env.DB.exec(`CREATE TRIGGER "berkas_gagal" BEFORE INSERT ON "berkas" BEGIN SELECT RAISE(FAIL, 'uji'); END`);
		try {
			expect((await unggah(cookie, 1, { namaAsli: "gagal.pdf" })).status).toBe(409);
		} finally {
			await env.DB.exec('DROP TRIGGER "berkas_gagal"');
		}
		const sesudah = new Set((await env.BERKAS.list({ prefix: "berkas/" })).objects.map((object) => object.key));
		expect(sesudah).toEqual(sebelum);
	});
});

describe("kelompok 7: jenisRekomendasi dan ambang hadir (acceptance 13)", () => {
	it("menolak unggahan kelompok 7 tanpa jenisRekomendasi, dan menolak jenisRekomendasi di kelompok lain", async () => {
		const cookie = await daftarBacalon("k7@example.test");
		expect((await unggah(cookie, 7, { namaAsli: "a3.pdf" })).status).toBe(400);
		expect((await unggah(cookie, 1, { namaAsli: "a.pdf", jenisRekomendasi: "A3_PW" })).status).toBe(400);
		expect((await unggah(cookie, 7, { namaAsli: "a3.pdf", jenisRekomendasi: "A3_PW" })).status).toBe(201);
	});

	it("hadir dengan 2 A3_PW atau 3 A4_PD, tapi campuran 1 A3_PW + 2 A4_PD belum hadir", async () => {
		const dua_a3 = await daftarBacalon("dua-a3@example.test");
		await unggah(dua_a3, 7, { namaAsli: "a.pdf", jenisRekomendasi: "A3_PW" });
		await unggah(dua_a3, 7, { namaAsli: "b.pdf", jenisRekomendasi: "A3_PW" });
		const kelengkapanDuaA3 = await (await kirim(MASA_PENDAFTARAN, "/api/akun/berkas", { headers: { cookie: dua_a3 } })).json<{ k7: number }>();
		expect(kelengkapanDuaA3.k7).toBe(1);

		const tiga_a4 = await daftarBacalon("tiga-a4@example.test");
		await unggah(tiga_a4, 7, { namaAsli: "a.pdf", jenisRekomendasi: "A4_PD" });
		await unggah(tiga_a4, 7, { namaAsli: "b.pdf", jenisRekomendasi: "A4_PD" });
		await unggah(tiga_a4, 7, { namaAsli: "c.pdf", jenisRekomendasi: "A4_PD" });
		const kelengkapanTigaA4 = await (await kirim(MASA_PENDAFTARAN, "/api/akun/berkas", { headers: { cookie: tiga_a4 } })).json<{ k7: number }>();
		expect(kelengkapanTigaA4.k7).toBe(1);

		const campuran = await daftarBacalon("campuran@example.test");
		await unggah(campuran, 7, { namaAsli: "a.pdf", jenisRekomendasi: "A3_PW" });
		await unggah(campuran, 7, { namaAsli: "b.pdf", jenisRekomendasi: "A4_PD" });
		await unggah(campuran, 7, { namaAsli: "c.pdf", jenisRekomendasi: "A4_PD" });
		const kelengkapanCampuran = await (await kirim(MASA_PENDAFTARAN, "/api/akun/berkas", { headers: { cookie: campuran } })).json<{ k7: number }>();
		expect(kelengkapanCampuran.k7).toBe(0);
	});
});

describe("Status Kelengkapan Berkas: sumber tunggal vKelengkapan (acceptance 12)", () => {
	it("x/10 dan label sama antara /api/akun dan /api/akun/berkas", async () => {
		const cookie = await daftarBacalon("konsisten@example.test");
		await unggah(cookie, 1, { namaAsli: "a.pdf" });
		await unggah(cookie, 2, { namaAsli: "b.pdf" });

		const akun = await (await kirim(MASA_PENDAFTARAN, "/api/akun", { headers: { cookie } })).json<{ jumlahHadir: number; lengkap: boolean }>();
		const berkas = await (await kirim(MASA_PENDAFTARAN, "/api/akun/berkas", { headers: { cookie } })).json<{ jumlahHadir: number; lengkap: number }>();
		expect(akun.jumlahHadir).toBe(2);
		expect(berkas.jumlahHadir).toBe(2);
		expect(akun.lengkap).toBe(Boolean(berkas.lengkap));
		expect(akun.lengkap).toBe(false);
	});
});

describe("Tahap × kemampuan: unggah dan hapus (acceptance 16, 17)", () => {
	it("ditolak pada Belum dibuka, Pemeriksaan, Terkunci, dan Selesai; diterima pada Masa Pendaftaran dan Masa Perbaikan", async () => {
		const email = "tahap@example.test";
		const cookie = await daftarBacalon(email);

		for (const waktu of [BELUM_DIBUKA, PEMERIKSAAN, TERKUNCI]) {
			await pindahWaktuSesi(email, waktu);
			const response = await unggah(cookie, 1, { namaAsli: `x-${waktu.toISOString()}.pdf` }, undefined, undefined, waktu);
			expect(response.status).toBe(403);
			const body = await response.json<{ error: string; tahap: string }>();
			expect(body.error).toBe("tahap_tertutup");
			expect(body.tahap).toBeTruthy();
		}

		await pindahWaktuSesi(email, MASA_PENDAFTARAN);
		expect((await unggah(cookie, 1, { namaAsli: "pendaftaran.pdf" }, undefined, undefined, MASA_PENDAFTARAN)).status).toBe(201);
		await pindahWaktuSesi(email, MASA_PERBAIKAN);
		expect((await unggah(cookie, 1, { namaAsli: "perbaikan.pdf" }, undefined, undefined, MASA_PERBAIKAN)).status).toBe(201);
	});

	it("hapus ditolak di luar jendela ubah dan diterima di dalamnya", async () => {
		const email = "hapus-tahap@example.test";
		const cookie = await daftarBacalon(email);
		const unggahan = await unggah(cookie, 1, { namaAsli: "a.pdf" });
		const { id } = await unggahan.json<{ id: string }>();

		await pindahWaktuSesi(email, TERKUNCI);
		const ditolak = await kirim(TERKUNCI, `/api/akun/berkas/1/${id}`, { method: "DELETE", headers: { cookie } });
		expect(ditolak.status).toBe(403);
		expect(await env.DB.prepare('SELECT 1 FROM "berkas" WHERE "id" = ?').bind(id).first()).toBeTruthy();

		await pindahWaktuSesi(email, MASA_PERBAIKAN);
		const diterima = await kirim(MASA_PERBAIKAN, `/api/akun/berkas/1/${id}`, { method: "DELETE", headers: { cookie } });
		expect(diterima.status).toBe(200);
	});
});

describe("unduh dan hapus: kepemilikan (acceptance 22)", () => {
	it("unduhan sendiri memakai attachment + nosniff dan Content-Type dari D1", async () => {
		const cookie = await daftarBacalon("unduh@example.test");
		const bytes = bytesValid("application/pdf");
		const unggahan = await unggah(cookie, 1, { namaAsli: "a.pdf" }, bytes);
		const { id } = await unggahan.json<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}/unduh`, { headers: { cookie } });
		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toContain("attachment");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("content-type")).toBe("application/pdf");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	});

	it("Bakal Calon lain ditolak 404 walau mengetahui id berkas (unduh dan hapus)", async () => {
		const pemilik = await daftarBacalon("pemilik@example.test");
		const lain = await daftarBacalon("lain@example.test");
		const unggahan = await unggah(pemilik, 1, { namaAsli: "a.pdf" });
		const { id } = await unggahan.json<{ id: string }>();

		const unduhLain = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}/unduh`, { headers: { cookie: lain } });
		expect(unduhLain.status).toBe(404);
		const hapusLain = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}`, { method: "DELETE", headers: { cookie: lain } });
		expect(hapusLain.status).toBe(404);
		expect(await env.DB.prepare('SELECT 1 FROM "berkas" WHERE "id" = ?').bind(id).first()).toBeTruthy();
	});

	it("Admin boleh mengunduh berkas Bakal Calon manapun", async () => {
		const pemilik = await daftarBacalon("pemilik-admin@example.test");
		const unggahan = await unggah(pemilik, 1, { namaAsli: "a.pdf" });
		const { id } = await unggahan.json<{ id: string }>();
		const admin = await sesiAdmin();

		const response = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}/unduh`, { headers: { cookie: admin } });
		expect(response.status).toBe(200);
	});

	it("menghapus baris D1 lalu objek R2, dan mencatat audit hapus_berkas tanpa nama berkas", async () => {
		const cookie = await daftarBacalon("hapus@example.test");
		const unggahan = await unggah(cookie, 1, { namaAsli: "rahasia.pdf" });
		const { id } = await unggahan.json<{ id: string }>();
		const baris = await env.DB.prepare('SELECT "r2Key" FROM "berkas" WHERE "id" = ?').bind(id).first<{ r2Key: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}`, { method: "DELETE", headers: { cookie } });
		expect(response.status).toBe(200);
		expect(await env.DB.prepare('SELECT 1 FROM "berkas" WHERE "id" = ?').bind(id).first()).toBeNull();
		expect(await env.BERKAS.get(baris?.r2Key as string)).toBeNull();

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil", "sasaranBerkasId" FROM "audit" WHERE "tindakan" = ?')
			.bind("hapus_berkas")
			.first<{ aktor: string; tindakan: string; hasil: string; sasaranBerkasId: string }>();
		expect(audit).toEqual({ aktor: "Bakal Calon Ketua Umum", tindakan: "hapus_berkas", hasil: "berhasil", sasaranBerkasId: id });
	});
});

describe("pratinjau berkas: inline, aturan akses sama dengan unduh", () => {
	it("pratinjau sendiri memakai inline + nosniff + no-store dan Content-Type dari D1", async () => {
		const cookie = await daftarBacalon("pratinjau@example.test");
		const bytes = bytesValid("application/pdf");
		const unggahan = await unggah(cookie, 1, { namaAsli: "a.pdf" }, bytes);
		const { id } = await unggahan.json<{ id: string }>();

		const response = await kirim(MASA_PENDAFTARAN, `/api/akun/berkas/1/${id}/pratinjau`, { headers: { cookie } });
		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toMatch(/^inline;/);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("content-type")).toBe("application/pdf");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	});

	it("tanpa sesi 401, Bakal Calon lain 404, Admin 200, dan 403 setelah layanan selesai", async () => {
		const pemilik = await daftarBacalon("pratinjau-pemilik@example.test");
		const lain = await daftarBacalon("pratinjau-lain@example.test");
		const unggahan = await unggah(pemilik, 1, { namaAsli: "a.pdf" });
		const { id } = await unggahan.json<{ id: string }>();
		const admin = await sesiAdmin();
		const url = `/api/akun/berkas/1/${id}/pratinjau`;

		expect((await kirim(MASA_PENDAFTARAN, url)).status).toBe(401);
		expect((await kirim(MASA_PENDAFTARAN, url, { headers: { cookie: lain } })).status).toBe(404);
		expect((await kirim(MASA_PENDAFTARAN, url, { headers: { cookie: admin } })).status).toBe(200);

		const selesai = new Date("2027-01-29T00:00:00.000Z");
		await pindahWaktuSesi("pratinjau-pemilik@example.test", selesai);
		expect((await kirim(selesai, url, { headers: { cookie: pemilik } })).status).toBe(403);
	});
});

describe("Audit unggah_berkas tanpa nama berkas", () => {
	it("mencatat berhasil dan ditolak tanpa menyimpan nama berkas di audit", async () => {
		const cookie = await daftarBacalon("audit-unggah@example.test");
		await unggah(cookie, 1, { namaAsli: "nama-rahasia-pemohon.pdf" });
		await unggah(cookie, 6, { namaAsli: "b.jpg", mime: "image/jpeg" }); // ditolak: kelompok 6 PDF saja

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit" WHERE "tindakan" = ? ORDER BY "hasil"')
			.bind("unggah_berkas")
			.all<{ aktor: string; tindakan: string; hasil: string }>();
		expect(audit.results).toEqual(
			expect.arrayContaining([
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "unggah_berkas", hasil: "berhasil" },
				{ aktor: "Bakal Calon Ketua Umum", tindakan: "unggah_berkas", hasil: "ditolak" },
			]),
		);
		for (const kolom of Object.values(audit.results)) {
			expect(JSON.stringify(kolom)).not.toContain("nama-rahasia-pemohon");
		}
	});
});
