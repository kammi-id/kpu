import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;

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

const WAKTU_UJI = new Date("2026-09-20T00:00:00.000Z"); // Masa Pendaftaran
const DATA_ADMIN = {
	token: RAHASIA_UJI.ONBOARD_TOKEN,
	name: "Admin bersama",
	email: "admin@example.test",
	password: "kata-sandi-admin",
};
async function sesiAdmin() {
	await kirim(WAKTU_UJI, "/onboard", json(DATA_ADMIN));
	const response = await kirim(
		WAKTU_UJI,
		"/api/auth/sign-in/email",
		json({ email: DATA_ADMIN.email, password: DATA_ADMIN.password }),
	);
	expect(response.status).toBe(200);
	const user = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?')
		.bind(DATA_ADMIN.email)
		.first<{ id: string }>();
	await env.DB.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ? WHERE "userId" = ?')
		.bind(WAKTU_UJI.toISOString(), WAKTU_UJI.toISOString(), user?.id)
		.run();
	return response.headers.get("set-cookie")?.split(";", 1)[0] as string;
}

async function setelWaktuSesiAdmin(waktu: Date) {
	await env.DB.prepare(
		`UPDATE "session" SET "createdAt" = ?, "updatedAt" = ?
		 WHERE "userId" = (SELECT "id" FROM "user" WHERE "email" = ?)`,
	)
		.bind(waktu.toISOString(), waktu.toISOString(), DATA_ADMIN.email)
		.run();
}

/**
 * Tiket 10 akan memiliki jalur registrasi lengkap. Untuk batas otorisasi tiket
 * ini, ubah Admin uji yang sudah memiliki sesi menjadi Bakal Calon yang lolos
 * constraint D1, lalu amati rute Worker seperti klien sungguhan.
 */
async function sesiBacalon() {
	const cookie = await sesiAdmin();
	await env.DB.prepare(
		`UPDATE "user" SET "role" = 'bacalon', "whatsapp" = ?, "persetujuanVersi" = ?, "persetujuanPada" = ?
		 WHERE "email" = ?`,
	)
		.bind("6281234567890", "persetujuan-v1", WAKTU_UJI.toISOString(), DATA_ADMIN.email)
		.run();
	return cookie;
}

async function simpanPeraturan(cookie: string, markdown: string, waktu = WAKTU_UJI) {
	return kirim(waktu, "/api/admin/peraturan", {
		method: "PUT",
		headers: { cookie, "content-type": "text/markdown" },
		body: markdown,
	});
}

async function sisipBerkasPublik(overrides: Partial<Record<string, unknown>> = {}) {
	const values = {
		id: crypto.randomUUID(),
		kategori: "formulir",
		judul: "Formulir A.1",
		urutan: 1,
		r2Key: `publik/${crypto.randomUUID()}`,
		namaAsli: "formulir-a1.pdf",
		mime: "application/pdf",
		ukuranByte: 1024,
		diunggahPada: new Date().toISOString(),
		...overrides,
	};
	await env.DB.prepare(
		`INSERT INTO "berkasPublik" ("id","kategori","judul","urutan","r2Key","namaAsli","mime","ukuranByte","diunggahPada")
		 VALUES (?,?,?,?,?,?,?,?,?)`,
	)
		.bind(
			values.id,
			values.kategori,
			values.judul,
			values.urutan,
			values.r2Key,
			values.namaAsli,
			values.mime,
			values.ukuranByte,
			values.diunggahPada,
		)
		.run();
	return values.id as string;
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "user"'),
		env.DB.prepare('DELETE FROM "peraturan"'),
		env.DB.prepare('DELETE FROM "berkasPublik"'),
	]);
});

describe("GET /api/peraturan dan /api/unduhan (publik, seam Worker)", () => {
	it("mengembalikan bentuk kosong (Menyusul) ketika belum ada Peraturan maupun Berkas Publik", async () => {
		const response = await kirim(WAKTU_UJI, "/api/peraturan");
		expect(response.status).toBe(200);
		const body = await response.json<{ isiMarkdown: string | null; berkasPublik: unknown[] }>();
		expect(body.isiMarkdown).toBeNull();
		expect(body.berkasPublik).toEqual([]);
	});

	it("/api/peraturan hanya menampilkan Berkas Publik kategori peraturan", async () => {
		await sisipBerkasPublik({ kategori: "peraturan", judul: "PKPU", urutan: 1 });
		await sisipBerkasPublik({ kategori: "formulir", judul: "Formulir A.1", urutan: 1 });
		const body = await (await kirim(WAKTU_UJI, "/api/peraturan")).json<{ berkasPublik: Array<{ judul: string }> }>();
		expect(body.berkasPublik).toHaveLength(1);
		expect(body.berkasPublik[0].judul).toBe("PKPU");
	});

	it("acceptance 5: /api/unduhan hanya menampilkan kategori formulir, terurut menurut urutan", async () => {
		await sisipBerkasPublik({ kategori: "peraturan", judul: "PKPU", urutan: 1 });
		await sisipBerkasPublik({ kategori: "formulir", judul: "Formulir A.2", urutan: 2 });
		await sisipBerkasPublik({ kategori: "formulir", judul: "Formulir A.1", urutan: 1 });
		const body = await (await kirim(WAKTU_UJI, "/api/unduhan")).json<{ berkasPublik: Array<{ judul: string }> }>();
		expect(body.berkasPublik.map((item) => item.judul)).toEqual(["Formulir A.1", "Formulir A.2"]);
	});

	it("tiket 18: ditolak dengan kode tahap pada Selesai", async () => {
		const selesai = new Date("2027-01-24T17:00:00.000Z");
		const peraturan = await kirim(selesai, "/api/peraturan");
		expect(peraturan.status).toBe(403);
		expect(await peraturan.json()).toEqual({ error: "tahap_tertutup", tahap: "Selesai" });

		const unduhan = await kirim(selesai, "/api/unduhan");
		expect(unduhan.status).toBe(403);
		expect(await unduhan.json()).toEqual({ error: "tahap_tertutup", tahap: "Selesai" });
	});
});

describe("PUT /api/admin/peraturan (seam Worker)", () => {
	it("menolak tanpa sesi dan menolak sesi Bakal Calon", async () => {
		expect((await simpanPeraturan("", "# Peraturan")).status).toBe(401);
		const cookieBacalon = await sesiBacalon();
		expect((await simpanPeraturan(cookieBacalon, "# Peraturan")).status).toBe(401);
	});

	it("menyimpan Markdown untuk sesi Admin dan mencatat audit ubah_peraturan beraktor Admin bersama", async () => {
		const cookie = await sesiAdmin();
		const response = await simpanPeraturan(cookie, "# PKPU Muktamar XIV");
		expect(response.status).toBe(200);

		const baris = await env.DB.prepare('SELECT "isiMarkdown" FROM "peraturan" WHERE "id" = 1').first<{
			isiMarkdown: string;
		}>();
		expect(baris?.isiMarkdown).toBe("# PKPU Muktamar XIV");

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit" WHERE "tindakan" = ?')
			.bind("ubah_peraturan")
			.all();
		expect(audit.results).toEqual([{ aktor: "Admin bersama", tindakan: "ubah_peraturan", hasil: "berhasil" }]);
	});

	it("menimpa tanpa riwayat: simpan kedua mengganti isi simpan pertama", async () => {
		const cookie = await sesiAdmin();
		await simpanPeraturan(cookie, "Versi pertama");
		await simpanPeraturan(cookie, "Versi kedua");
		const baris = await env.DB.prepare('SELECT "isiMarkdown" FROM "peraturan" WHERE "id" = 1').first<{
			isiMarkdown: string;
		}>();
		expect(baris?.isiMarkdown).toBe("Versi kedua");
		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "peraturan"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(1);
	});

	it("acceptance 28: Markdown berisi <script>, atribut on*, dan javascript: tersimpan apa adanya dan tidak pernah dijawab sebagai HTML", async () => {
		const cookie = await sesiAdmin();
		const markdownBerbahaya =
			'# Judul\n\n<script>alert("xss")</script>\n\n<img src=x onerror="alert(1)">\n\n[tautan](javascript:alert(2))';
		const simpan = await simpanPeraturan(cookie, markdownBerbahaya);
		expect(simpan.status).toBe(200);

		const baca = await kirim(WAKTU_UJI, "/api/peraturan");
		expect(baca.headers.get("content-type")).toContain("application/json");
		const body = await baca.json<{ isiMarkdown: string }>();
		expect(body.isiMarkdown).toBe(markdownBerbahaya);
	});

	it("menolak Markdown lebih dari 400.000 karakter tanpa mengubah baris tersimpan", async () => {
		const cookie = await sesiAdmin();
		await simpanPeraturan(cookie, "Awal aman");
		const response = await simpanPeraturan(cookie, "a".repeat(400_001));
		expect(response.status).toBe(413);

		const baris = await env.DB.prepare('SELECT "isiMarkdown" FROM "peraturan" WHERE "id" = 1').first<{
			isiMarkdown: string;
		}>();
		expect(baris?.isiMarkdown).toBe("Awal aman");
	});

	it("dapat dilakukan di tahap mana pun selain Selesai, dan ditolak tepat pada tahap Selesai", async () => {
		const cookie = await sesiAdmin();
		const pemeriksaan = new Date("2026-10-05T00:00:00.000Z");
		await setelWaktuSesiAdmin(pemeriksaan);
		expect((await simpanPeraturan(cookie, "Pemeriksaan", pemeriksaan)).status).toBe(200);
		const terkunci = new Date("2026-10-12T00:00:00.000Z");
		await setelWaktuSesiAdmin(terkunci);
		expect((await simpanPeraturan(cookie, "Terkunci", terkunci)).status).toBe(200);
		const selesai = new Date("2027-01-24T17:00:00.000Z");
		await setelWaktuSesiAdmin(selesai);
		expect((await simpanPeraturan(cookie, "Selesai", selesai)).status).toBe(403);
	});
});

function unggahBerkasPublik(
	cookie: string,
	{
		judul = "Dokumen uji",
		kategori = "peraturan",
		urutan = 1,
		namaAsli = "dokumen.pdf",
		mime = "application/pdf",
	}: Partial<Record<"judul" | "kategori" | "urutan" | "namaAsli" | "mime", string | number>> = {},
	bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
	contentLength = String(bytes.byteLength),
) {
	const query = new URLSearchParams({
		judul: String(judul),
		kategori: String(kategori),
		urutan: String(urutan),
		namaAsli: String(namaAsli),
		mime: String(mime),
	});
	return kirim(WAKTU_UJI, `/api/admin/berkas-publik?${query}`, {
		method: "POST",
		headers: { cookie, "content-type": String(mime), "content-length": contentLength },
		body: bytes,
	});
}

describe("Berkas Publik (seam Worker)", () => {
	it("hanya menerima PDF/DOCX dengan Content-Length, ekstensi, MIME, dan signature yang cocok", async () => {
		const cookie = await sesiAdmin();
		expect((await unggahBerkasPublik(cookie, {}, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).status).toBe(201);
		expect(
			(
				await unggahBerkasPublik(
					cookie,
					{ namaAsli: "formulir.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
					new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]),
				)
			).status,
		).toBe(201);
		expect((await unggahBerkasPublik(cookie, {}, new Uint8Array([0x00]), "")).status).toBe(400);
		expect((await unggahBerkasPublik(cookie, {}, new Uint8Array(), "0")).status).toBe(400);
		expect((await unggahBerkasPublik(cookie, {}, new Uint8Array(), String(20 * 1024 * 1024 + 1))).status).toBe(400);
		expect((await unggahBerkasPublik(cookie, { namaAsli: "dokumen.docx" })).status).toBe(400);
		expect((await unggahBerkasPublik(cookie, {}, new Uint8Array([0x00, 0x50, 0x44, 0x46, 0x2d]))).status).toBe(400);
	});

	it("tanpa sesi dan sesi Bakal Calon ditolak", async () => {
		expect((await unggahBerkasPublik("")).status).toBe(401);
		expect((await unggahBerkasPublik(await sesiBacalon())).status).toBe(401);
	});

	it("acceptance 29: unduhan publik selalu attachment dengan nosniff", async () => {
		const id = await sisipBerkasPublik({
			kategori: "peraturan",
			namaAsli: "PKPU Muktamar XIV.pdf",
			r2Key: `publik/${crypto.randomUUID()}`,
		});
		const row = await env.DB.prepare('SELECT "r2Key" FROM "berkasPublik" WHERE "id" = ?').bind(id).first<{ r2Key: string }>();
		await env.BERKAS.put(row?.r2Key as string, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]));

		const response = await kirim(WAKTU_UJI, `/api/berkas-publik/${id}`);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toContain("attachment");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");

		const selesai = new Date("2027-01-24T17:00:00.000Z");
		const ditolak = await kirim(selesai, `/api/berkas-publik/${id}`);
		expect(ditolak.status).toBe(403);
		expect(await ditolak.json()).toEqual({ error: "tahap_tertutup", tahap: "Selesai" });
	});

	it("menghapus baris D1 dan objek R2 lalu mencatat hapus_berkas_publik", async () => {
		const cookie = await sesiAdmin();
		await unggahBerkasPublik(cookie, { judul: "Akan dihapus" });
		const row = await env.DB.prepare('SELECT "id", "r2Key" FROM "berkasPublik" WHERE "judul" = ?')
			.bind("Akan dihapus")
			.first<{ id: string; r2Key: string }>();

		const response = await kirim(WAKTU_UJI, `/api/admin/berkas-publik/${row?.id}`, { method: "DELETE", headers: { cookie } });
		expect(response.status).toBe(200);
		expect(await env.DB.prepare('SELECT 1 FROM "berkasPublik" WHERE "id" = ?').bind(row?.id).first()).toBeNull();
		expect(await env.BERKAS.get(row?.r2Key as string)).toBeNull();
		expect(
			await env.DB.prepare('SELECT "sasaranBerkasId" FROM "audit" WHERE "tindakan" = ?')
				.bind("hapus_berkas_publik")
				.first<{ sasaranBerkasId: string }>(),
		).toEqual({ sasaranBerkasId: row?.id });
	});

	it("membersihkan objek R2 bila INSERT gagal", async () => {
		const cookie = await sesiAdmin();
		const sebelum = new Set((await env.BERKAS.list({ prefix: "publik/" })).objects.map((object) => object.key));
		await env.DB.exec(
			`CREATE TRIGGER "berkasPublik_gagal" BEFORE INSERT ON "berkasPublik" BEGIN SELECT RAISE(FAIL, 'uji'); END`,
		);
		try {
			expect((await unggahBerkasPublik(cookie)).status).toBe(400);
		} finally {
			await env.DB.exec('DROP TRIGGER "berkasPublik_gagal"');
		}
		const sesudah = new Set((await env.BERKAS.list({ prefix: "publik/" })).objects.map((object) => object.key));
		expect(sesudah).toEqual(sebelum);
	});
});
