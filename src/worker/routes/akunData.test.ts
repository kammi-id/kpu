import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "../index";
import { jaringan } from "../test/jaringan";
import { http, HttpResponse } from "msw";

const RAHASIA_UJI = {
	BETTER_AUTH_SECRET: "s".repeat(32),
	HMAC_SECRET: "h".repeat(32),
	TURNSTILE_SECRET_KEY: "turnstile-test-key",
	ONBOARD_TOKEN: "token-onboarding-uji",
};

type EnvUji = Env & Partial<typeof RAHASIA_UJI>;

// Batas tahap (lib/tahap.ts): Masa Pendaftaran mulai 16 Sep 2026 17.00Z,
// Pemeriksaan 26 Sep 17.00Z, Masa Perbaikan 29 Sep 17.00Z, Terkunci 3 Okt
// 17.00Z, Selesai 27 Jan 2027 17.00Z.
const BELUM_DIBUKA = new Date("2026-09-10T00:00:00.000Z");
const MASA_PENDAFTARAN = new Date("2026-09-20T00:00:00.000Z");
const PEMERIKSAAN = new Date("2026-09-28T00:00:00.000Z");
const MASA_PERBAIKAN = new Date("2026-10-01T00:00:00.000Z");
const TERKUNCI = new Date("2026-10-12T00:00:00.000Z");
const SELESAI = new Date("2027-01-28T00:00:00.000Z");

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

function json(body: Record<string, unknown>) {
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

let niaBerikutnya = 0;

/**
 * Mendaftarkan Bakal Calon lewat seam registrasi sungguhan (harus terjadi di
 * Masa Pendaftaran), lalu mengunci jam sesinya ke `waktu` supaya permintaan
 * berikutnya dapat memakai jam suntik apa pun tanpa kena batas sesi.
 */
async function daftarBacalon(email: string, whatsapp: string, waktu = MASA_PENDAFTARAN) {
	turnstileSelaluLolos();
	kammiIdSelaluLolos();
	niaBerikutnya += 1;
	const permintaan = json({
		name: "Bakal Calon",
		email,
		whatsapp,
		password: "kata-sandi-aman",
		persetujuan: "true",
		nia: `3020100${String(niaBerikutnya).padStart(4, "0")}`,
	});
	const response = await kirim(MASA_PENDAFTARAN, "/api/auth/sign-up/email", {
		...permintaan,
		headers: { ...permintaan.headers, "x-captcha-response": "token-turnstile-uji" },
	});
	expect(response.status).toBe(200);
	const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] as string;
	const user = await env.DB.prepare('SELECT "id" FROM "user" WHERE "email" = ?').bind(email).first<{ id: string }>();
	await env.DB.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ? WHERE "userId" = ?')
		.bind(waktu.toISOString(), waktu.toISOString(), user?.id)
		.run();
	return { cookie, userId: user?.id as string };
}

async function setelWaktuSesi(userId: string, waktu: Date) {
	await env.DB.prepare('UPDATE "session" SET "createdAt" = ?, "updatedAt" = ? WHERE "userId" = ?')
		.bind(waktu.toISOString(), waktu.toISOString(), userId)
		.run();
}

function payloadLengkap(overrides: Record<string, unknown> = {}) {
	return {
		name: "Bakal Calon Satu",
		whatsapp: "081234567890",
		namaPanggilan: "Calon",
		tempatLahir: "Jakarta",
		tanggalLahir: "2000-01-15",
		asalPw: "PW KAMMI DKI Jakarta",
		asalPd: "PD KAMMI Jakarta Selatan",
		tahunLulusDm3: 2020,
		tempatLulusDm3: "Jakarta",
		instruktur: true,
		capaianHafalan: "Juz 30",
		bahasaAsing: "Inggris",
		...overrides,
	};
}

async function simpanData(cookie: string, waktu: Date, payload: Record<string, unknown>) {
	return kirim(waktu, "/api/akun/data", { ...json(payload), method: "PUT", headers: { ...json(payload).headers, cookie } });
}

async function bacaData(cookie: string, waktu = MASA_PENDAFTARAN) {
	return kirim(waktu, "/api/akun/data", { headers: { cookie } });
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "profil"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("GET /api/akun/data (seam Worker)", () => {
	it("menolak tanpa sesi", async () => {
		expect((await bacaData("")).status).toBe(401);
	});

	it("membaca nama, whatsapp, email dari user dan kolom profil null sebelum pernah disimpan", async () => {
		const { cookie } = await daftarBacalon("baca@example.test", "081111111111");
		const response = await bacaData(cookie);
		expect(response.status).toBe(200);
		const body = await response.json<Record<string, unknown>>();
		expect(body).toMatchObject({
			name: "Bakal Calon",
			whatsapp: "6281111111111",
			email: "baca@example.test",
			namaPanggilan: null,
			tanggalLahir: null,
			tahunLulusDm3: null,
			instruktur: null,
		});
	});

	it("ditolak pada tahap Selesai (baris baca data sendiri)", async () => {
		const { cookie, userId } = await daftarBacalon("selesai@example.test", "081111111112");
		await setelWaktuSesi(userId, SELESAI);
		const response = await bacaData(cookie, SELESAI);
		expect(response.status).toBe(403);
		expect((await response.json<{ error: string }>()).error).toBe("layanan_selesai");
	});
});

describe("PUT /api/akun/data — simpan (seam Worker)", () => {
	it("menolak tanpa sesi", async () => {
		expect((await simpanData("", MASA_PENDAFTARAN, payloadLengkap())).status).toBe(401);
	});

	it("simpan pertama membuat baris profil; simpan berikutnya menimpa", async () => {
		const { cookie, userId } = await daftarBacalon("simpan@example.test", "081111111113");

		const pertama = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ namaPanggilan: "Panggilan Satu" }));
		expect(pertama.status).toBe(200);
		let jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "profil"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(1);
		let baris = await env.DB.prepare('SELECT "namaPanggilan" FROM "profil" WHERE "userId" = ?').bind(userId).first<{ namaPanggilan: string }>();
		expect(baris?.namaPanggilan).toBe("Panggilan Satu");

		const kedua = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ namaPanggilan: "Panggilan Dua" }));
		expect(kedua.status).toBe(200);
		jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "profil"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(1);
		baris = await env.DB.prepare('SELECT "namaPanggilan" FROM "profil" WHERE "userId" = ?').bind(userId).first<{ namaPanggilan: string }>();
		expect(baris?.namaPanggilan).toBe("Panggilan Dua");
	});

	it("semua kolom profil boleh kosong (null) dan berhasil menghapus nilai sebelumnya", async () => {
		const { cookie, userId } = await daftarBacalon("kosong@example.test", "081111111114");
		await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap());
		const bersih = await simpanData(
			cookie,
			MASA_PENDAFTARAN,
			payloadLengkap({
				namaPanggilan: "",
				tempatLahir: null,
				tanggalLahir: "",
				asalPw: null,
				asalPd: null,
				tahunLulusDm3: null,
				tempatLulusDm3: null,
				instruktur: null,
				capaianHafalan: null,
				bahasaAsing: null,
			}),
		);
		expect(bersih.status).toBe(200);
		const baris = await env.DB.prepare('SELECT * FROM "profil" WHERE "userId" = ?').bind(userId).first<Record<string, unknown>>();
		expect(baris).toMatchObject({
			namaPanggilan: null,
			tempatLahir: null,
			tanggalLahir: null,
			tahunLulusDm3: null,
			instruktur: null,
		});
	});

	it("menolak tanggal lahir yang bukan tanggal kalender sungguhan dan tahun lulus AB 3 di luar 1998–2026", async () => {
		const { cookie } = await daftarBacalon("tanggal@example.test", "081111111115");

		const tanggalSalahFormat = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ tanggalLahir: "15-01-2000" }));
		expect(tanggalSalahFormat.status).toBe(400);
		expect((await tanggalSalahFormat.json<{ error: string }>()).error).toBe("tanggal_lahir_tidak_valid");

		const tanggalTakAda = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ tanggalLahir: "2026-02-30" }));
		expect(tanggalTakAda.status).toBe(400);
		expect((await tanggalTakAda.json<{ error: string }>()).error).toBe("tanggal_lahir_tidak_valid");

		const tahunTerlaluAwal = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ tahunLulusDm3: 1997 }));
		expect(tahunTerlaluAwal.status).toBe(400);
		expect((await tahunTerlaluAwal.json<{ error: string }>()).error).toBe("tahun_lulus_tidak_valid");

		const tahunTerlaluAkhir = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ tahunLulusDm3: 2027 }));
		expect(tahunTerlaluAkhir.status).toBe(400);
		expect((await tahunTerlaluAkhir.json<{ error: string }>()).error).toBe("tahun_lulus_tidak_valid");

		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "profil"').first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(0);
	});

	it("menormalisasi WhatsApp dan menolak bila sudah dipakai akun lain", async () => {
		const satu = await daftarBacalon("wa-satu@example.test", "081111111116");
		const dua = await daftarBacalon("wa-dua@example.test", "081111111117");

		const berhasil = await simpanData(dua.cookie, MASA_PENDAFTARAN, payloadLengkap({ whatsapp: "081111111199" }));
		expect(berhasil.status).toBe(200);
		let pengguna = await env.DB.prepare('SELECT "whatsapp" FROM "user" WHERE "id" = ?').bind(dua.userId).first<{ whatsapp: string }>();
		expect(pengguna?.whatsapp).toBe("6281111111199");

		const bentrok = await simpanData(dua.cookie, MASA_PENDAFTARAN, payloadLengkap({ whatsapp: "081111111116" }));
		expect(bentrok.status).toBe(400);
		expect((await bentrok.json<{ error: string }>()).error).toBe("whatsapp_sudah_dipakai");
		pengguna = await env.DB.prepare('SELECT "whatsapp" FROM "user" WHERE "id" = ?').bind(dua.userId).first<{ whatsapp: string }>();
		expect(pengguna?.whatsapp).toBe("6281111111199");

		const formatSalah = await simpanData(satu.cookie, MASA_PENDAFTARAN, payloadLengkap({ whatsapp: "abc" }));
		expect(formatSalah.status).toBe(400);
		expect((await formatSalah.json<{ error: string }>()).error).toBe("whatsapp_tidak_valid");
	});

	it("nama tidak boleh kosong", async () => {
		const { cookie } = await daftarBacalon("nama@example.test", "081111111118");
		const kosong = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ name: "   " }));
		expect(kosong.status).toBe(400);
		expect((await kosong.json<{ error: string }>()).error).toBe("nama_wajib");
	});

	// Regresi tiket 17: name dan kolom teks bebas berakhir sebagai kolom CSV
	// Ekspor Harian (lib/ekspor.ts). CR/LF di tengahnya memecah baris CSV mentah
	// dan merusak baris berikutnya saat hapusBarisCsvBacalon menghapus satu baris.
	it("menolak karakter kontrol (CR/LF) pada nama dan kolom teks bebas lain, tanpa menyimpan apa pun", async () => {
		const { cookie, userId } = await daftarBacalon("kontrol@example.test", "081111111121");

		const namaBerisiBaris = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ name: "Budi\r\nAdmin" }));
		expect(namaBerisiBaris.status).toBe(400);
		expect((await namaBerisiBaris.json<{ error: string }>()).error).toBe("nama_tidak_valid");

		const bahasaBerisiBaris = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ bahasaAsing: "Inggris\r\nArab" }));
		expect(bahasaBerisiBaris.status).toBe(400);
		expect((await bahasaBerisiBaris.json<{ error: string }>()).error).toBe("bahasaAsing_tidak_valid");

		const jumlah = await env.DB.prepare('SELECT COUNT(*) AS jumlah FROM "profil" WHERE "userId" = ?').bind(userId).first<{ jumlah: number }>();
		expect(jumlah?.jumlah).toBe(0);
	});

	it("email tidak dapat diubah lewat API ini", async () => {
		const { cookie, userId } = await daftarBacalon("emailasli@example.test", "081111111119");
		const response = await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ email: "lain@example.test" }));
		expect(response.status).toBe(200);
		const pengguna = await env.DB.prepare('SELECT "email" FROM "user" WHERE "id" = ?').bind(userId).first<{ email: string }>();
		expect(pengguna?.email).toBe("emailasli@example.test");
	});

	it("ditolak server pada Belum dibuka, Pemeriksaan, dan Terkunci; diterima pada Masa Pendaftaran dan Masa Perbaikan, dengan alasan tahap", async () => {
		const { cookie, userId } = await daftarBacalon("tahap@example.test", "081111111120");

		for (const waktu of [BELUM_DIBUKA, PEMERIKSAAN, TERKUNCI, SELESAI]) {
			await setelWaktuSesi(userId, waktu);
			const response = await simpanData(cookie, waktu, payloadLengkap());
			expect(response.status).toBe(403);
			const body = await response.json<{ error: string; tahap: string }>();
			expect(body.error).toBe("tahap_tertutup");
			expect(body.tahap).toBeTruthy();
		}

		for (const waktu of [MASA_PENDAFTARAN, MASA_PERBAIKAN]) {
			await setelWaktuSesi(userId, waktu);
			const response = await simpanData(cookie, waktu, payloadLengkap());
			expect(response.status).toBe(200);
		}
	});

	it("Bakal Calon hanya membaca dan mengubah datanya sendiri", async () => {
		const satu = await daftarBacalon("isolasi-satu@example.test", "081111111121");
		const dua = await daftarBacalon("isolasi-dua@example.test", "081111111122");

		await simpanData(satu.cookie, MASA_PENDAFTARAN, payloadLengkap({ namaPanggilan: "Punya Satu", whatsapp: "081111111121" }));
		await simpanData(dua.cookie, MASA_PENDAFTARAN, payloadLengkap({ namaPanggilan: "Punya Dua", whatsapp: "081111111122" }));

		const bacaSatu = await (await bacaData(satu.cookie)).json<{ namaPanggilan: string }>();
		const bacaDua = await (await bacaData(dua.cookie)).json<{ namaPanggilan: string }>();
		expect(bacaSatu.namaPanggilan).toBe("Punya Satu");
		expect(bacaDua.namaPanggilan).toBe("Punya Dua");
	});

	it("mencatat audit ubah_data berhasil dan ditolak tanpa isi data pribadi", async () => {
		const { cookie, userId } = await daftarBacalon("audit@example.test", "081111111123");

		await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap());
		await simpanData(cookie, MASA_PENDAFTARAN, payloadLengkap({ tahunLulusDm3: 1900 }));

		const audit = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil", "sesiId", "aktorUserId" FROM "audit" WHERE "tindakan" = ? ORDER BY "waktu"',
		)
			.bind("ubah_data")
			.all<Record<string, unknown>>();
		expect(audit.results).toHaveLength(2);
		expect(audit.results[0]).toMatchObject({ aktor: "Bakal Calon Ketua Umum", hasil: "berhasil", aktorUserId: userId });
		expect(audit.results[1]).toMatchObject({ aktor: "Bakal Calon Ketua Umum", hasil: "ditolak", aktorUserId: userId });
		for (const baris of audit.results) {
			expect(Object.keys(baris as object).sort()).toEqual(["aktor", "aktorUserId", "hasil", "sesiId", "tindakan"].sort());
		}
	});
});
