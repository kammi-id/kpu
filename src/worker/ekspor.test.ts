import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { buatWorker } from "./index";

const encoder = new TextEncoder();

// MasaPendaftaran (bukan Selesai): Ekspor Harian berjalan normal.
const WAKTU_EKSPOR = new Date("2026-09-20T17:00:00.000Z");
// WIB 27 Sep 2026 00.00 — batas awal tahap Pemeriksaan dan pemicu Snapshot.
const WAKTU_PEMERIKSAAN_27_SEP = new Date("2026-09-26T17:00:00.000Z");
// WIB 28 Sep 2026 00.00 — sehari setelahnya; Snapshot tidak boleh ditimpa.
const WAKTU_PEMERIKSAAN_28_SEP = new Date("2026-09-27T17:00:00.000Z");
// Batas tahap Selesai (inklusif), lihat lib/tahap.ts MULAI_SELESAI.
const WAKTU_SELESAI = new Date("2027-01-27T17:00:00.000Z");

let whatsappBerikutnya = 0;
let niaBerikutnya = 0;

async function sha256(bytes: Uint8Array) {
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function jalankanTerjadwal(waktu: Date) {
	const ctx = createExecutionContext();
	await buatWorker().scheduled({ scheduledTime: waktu.getTime() } as ScheduledController, env, ctx);
	await waitOnExecutionContext(ctx);
}

/** String "per-byte" (bukan UTF-8) supaya pencarian substring ASCII selalu tepat walau isi ZIP biner. */
function teksByte(bytes: Uint8Array) {
	let hasil = "";
	for (const byte of bytes) hasil += String.fromCharCode(byte);
	return hasil;
}

const TANDA_LOKAL = [0x50, 0x4b, 0x03, 0x04];
const TANDA_DESKRIPTOR = [0x50, 0x4b, 0x07, 0x08];

function cariPola(bytes: Uint8Array, pola: number[], mulai: number) {
	cari: for (let i = mulai; i + pola.length <= bytes.length; i += 1) {
		for (let j = 0; j < pola.length; j += 1) if (bytes[i + j] !== pola[j]) continue cari;
		return i;
	}
	return -1;
}

/**
 * Pengurai ZIP store minimal untuk uji: baca local file header lalu ambil data
 * sampai data descriptor berikutnya (bit 3 dipakai oleh ZipStore di lib/ekspor.ts,
 * sehingga ukuran tidak diketahui di header dan harus dicari lewat tandanya).
 */
function entriZip(bytes: Uint8Array, nama: string): Uint8Array | null {
	const namaBytes = encoder.encode(nama);
	let posisi = 0;
	while (posisi <= bytes.length) {
		const awal = cariPola(bytes, TANDA_LOKAL, posisi);
		if (awal === -1) return null;
		const view = new DataView(bytes.buffer, bytes.byteOffset + awal, 30);
		const namaLen = view.getUint16(26, true);
		const extraLen = view.getUint16(28, true);
		const namaEntri = bytes.subarray(awal + 30, awal + 30 + namaLen);
		const dataStart = awal + 30 + namaLen + extraLen;
		const deskriptorAt = cariPola(bytes, TANDA_DESKRIPTOR, dataStart);
		const dataEnd = deskriptorAt === -1 ? bytes.length : deskriptorAt;
		if (namaEntri.length === namaBytes.length && namaEntri.every((byte, idx) => byte === namaBytes[idx])) {
			return bytes.subarray(dataStart, dataEnd);
		}
		posisi = dataEnd;
	}
	return null;
}

async function buatBacalon(nama: string, email: string, waktu: Date, opts: { banned?: 0 | 1; banReason?: string | null } = {}) {
	whatsappBerikutnya += 1;
	niaBerikutnya += 1;
	const id = crypto.randomUUID();
	await env.DB.prepare(
		`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada", "nia", "banned", "banReason")
		 VALUES (?, ?, ?, 1, ?, ?, 'bacalon', ?, 'persetujuan-v1', ?, ?, ?, ?)`,
	)
		.bind(
			id,
			nama,
			email,
			waktu.toISOString(),
			waktu.toISOString(),
			`62812345${String(whatsappBerikutnya).padStart(4, "0")}`,
			waktu.toISOString(),
			`3020100${String(niaBerikutnya).padStart(4, "0")}`,
			opts.banned ?? 0,
			opts.banReason ?? null,
		)
		.run();
	return id;
}

/** Menyimpan satu berkas kelompok 1 sungguhan di R2 dan baris D1 yang menunjuknya. */
async function buatBerkas(userId: string, waktu: Date, namaAsli: string, isi: Uint8Array) {
	const id = crypto.randomUUID();
	const r2Key = `berkas/${crypto.randomUUID()}`;
	await env.BERKAS.put(r2Key, isi);
	const digest = await sha256(isi);
	await env.DB.prepare(
		`INSERT INTO "berkas" ("id", "userId", "kelompok", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
		 VALUES (?, ?, 1, ?, ?, 'application/pdf', ?, ?, ?)`,
	)
		.bind(id, userId, r2Key, namaAsli, isi.byteLength, digest, waktu.toISOString())
		.run();
	return { id, r2Key, sha256: digest, namaAsli, isi };
}

/** Baris D1 kelompok 1 yang menunjuk R2 key TANPA objek sungguhan, supaya tulisZip melempar. */
async function buatBerkasHilang(userId: string, waktu: Date) {
	const id = crypto.randomUUID();
	const r2Key = `berkas/${crypto.randomUUID()}`;
	await env.DB.prepare(
		`INSERT INTO "berkas" ("id", "userId", "kelompok", "r2Key", "namaAsli", "mime", "ukuranByte", "sha256", "diunggahPada")
		 VALUES (?, ?, 1, ?, 'hilang.pdf', 'application/pdf', 1, ?, ?)`,
	)
		.bind(id, userId, r2Key, "0".repeat(64), waktu.toISOString())
		.run();
	return { id, r2Key };
}

beforeEach(async () => {
	whatsappBerikutnya = 0;
	niaBerikutnya = 0;
	const objects = await env.BERKAS.list();
	await env.BERKAS.delete(objects.objects.map((object) => object.key));
	await env.DB.batch([
		env.DB.prepare('DELETE FROM "audit"'),
		env.DB.prepare('DELETE FROM "berkas"'),
		env.DB.prepare('DELETE FROM "profil"'),
		env.DB.prepare('DELETE FROM "verification"'),
		env.DB.prepare('DELETE FROM "account"'),
		env.DB.prepare('DELETE FROM "session"'),
		env.DB.prepare('DELETE FROM "percobaanLogin"'),
		env.DB.prepare('DELETE FROM "user"'),
	]);
});

describe("Ekspor Harian (acceptance 24, 31)", () => {
	it("menulis CSV dan ZIP terkini tanpa data rahasia, manifest cocok dengan isi ZIP, lalu mencatat keberhasilan Sistem", async () => {
		const userId = await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_EKSPOR);
		const isi = encoder.encode("berkas identitas nabila");
		const berkas = await buatBerkas(userId, WAKTU_EKSPOR, "identitas.pdf", isi);

		// Data rahasia yang tidak boleh pernah ikut ke ekspor: hash kata sandi, token
		// sesi, isi account/session/verification, dan percobaanLogin (acceptance 24).
		const TANDA_PASSWORD = "RAHASIA-HASH-PASSWORD-9f21";
		const TANDA_TOKEN = "RAHASIA-TOKEN-SESI-7c44";
		const TANDA_VERIFIKASI = "RAHASIA-NILAI-VERIFIKASI-2ab1";
		const TANDA_PERCOBAAN = "rahasia:percobaan:login:marker";
		await env.DB.batch([
			env.DB.prepare(
				`INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
				 VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
			).bind(crypto.randomUUID(), userId, userId, TANDA_PASSWORD, WAKTU_EKSPOR.toISOString(), WAKTU_EKSPOR.toISOString()),
			env.DB.prepare(
				`INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId") VALUES (?, ?, ?, ?, ?, ?)`,
			).bind(crypto.randomUUID(), new Date(WAKTU_EKSPOR.getTime() + 86_400_000).toISOString(), TANDA_TOKEN, WAKTU_EKSPOR.toISOString(), WAKTU_EKSPOR.toISOString(), userId),
			env.DB.prepare(
				`INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)`,
			).bind(crypto.randomUUID(), "nabila@example.test", TANDA_VERIFIKASI, new Date(WAKTU_EKSPOR.getTime() + 86_400_000).toISOString(), WAKTU_EKSPOR.toISOString(), WAKTU_EKSPOR.toISOString()),
			env.DB.prepare(`INSERT INTO "percobaanLogin" ("kunci", "gagal", "kedaluwarsa") VALUES (?, 1, ?)`)
				.bind(TANDA_PERCOBAAN, new Date(WAKTU_EKSPOR.getTime() + 86_400_000).toISOString()),
		]);

		await jalankanTerjadwal(WAKTU_EKSPOR);

		const csv = await env.BERKAS.get("ekspor/terkini/bacalon.csv");
		const teksCsv = await csv?.text();
		expect(teksCsv).toContain("Nabila Putri");
		expect(teksCsv).toContain("Minta ditutup");
		expect(teksCsv).not.toContain(TANDA_PASSWORD);
		expect(teksCsv).not.toContain(TANDA_TOKEN);
		expect(teksCsv).not.toContain(TANDA_VERIFIKASI);
		expect(teksCsv).not.toContain(TANDA_PERCOBAAN);

		const zip = await env.BERKAS.get(`ekspor/terkini/${userId}.zip`);
		const zipBytes = new Uint8Array(await zip!.arrayBuffer());
		const zipTeks = teksByte(zipBytes);
		expect(zipTeks).not.toContain("password");
		expect(zipTeks).not.toContain(TANDA_PASSWORD);
		expect(zipTeks).not.toContain(TANDA_TOKEN);
		expect(zipTeks).not.toContain(TANDA_VERIFIKASI);
		expect(zipTeks).not.toContain(TANDA_PERCOBAAN);

		// Manifest SHA-256 harus cocok dengan D1 dan dengan byte sesungguhnya di ZIP.
		const namaEntriBerkas = `berkas/${berkas.id}-${berkas.namaAsli}`;
		const isiDiZip = entriZip(zipBytes, namaEntriBerkas);
		expect(isiDiZip).not.toBeNull();
		expect(new Uint8Array(isiDiZip as Uint8Array)).toEqual(isi);
		expect(await sha256(isiDiZip as Uint8Array)).toBe(berkas.sha256);

		const manifestBytes = entriZip(zipBytes, "manifest.json");
		expect(manifestBytes).not.toBeNull();
		const manifest = JSON.parse(new TextDecoder().decode(manifestBytes as Uint8Array)) as { berkas: Array<{ nama: string; sha256: string }> };
		expect(manifest.berkas).toEqual([expect.objectContaining({ nama: namaEntriBerkas, sha256: berkas.sha256 })]);

		expect(
			await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit" WHERE "tindakan" = ?').bind("ekspor_harian").first(),
		).toEqual({ aktor: "Sistem", tindakan: "ekspor_harian", hasil: "berhasil" });
	});

	it("kolom Minta ditutup hanya 'ya' bila banned DAN banReason 'penutupan_akun' bersamaan (spec Permintaan Penutupan Akun)", async () => {
		const mintaTutup = await buatBacalon("Dewi Lestari", "dewi@example.test", WAKTU_EKSPOR, { banned: 1, banReason: "penutupan_akun" });
		const bannedLain = await buatBacalon("Fajar Nugroho", "fajar@example.test", WAKTU_EKSPOR, { banned: 1, banReason: "alasan_lain" });
		const biasa = await buatBacalon("Gita Wulan", "gita@example.test", WAKTU_EKSPOR);
		for (const id of [mintaTutup, bannedLain, biasa]) await buatBerkas(id, WAKTU_EKSPOR, "identitas.pdf", encoder.encode(`isi ${id}`));

		await jalankanTerjadwal(WAKTU_EKSPOR);

		const baris = (await (await env.BERKAS.get("ekspor/terkini/bacalon.csv"))?.text())?.trim().split("\r\n").slice(1) ?? [];
		const kolomNama = (id: string) => baris.find((b) => b.startsWith(`${id},`))?.split(",").pop();
		expect(kolomNama(mintaTutup)).toBe("ya");
		expect(kolomNama(bannedLain)).toBe("tidak");
		expect(kolomNama(biasa)).toBe("tidak");
	});

	it("pengecualian yang tertangkap selama run menghasilkan audit ekspor_harian dengan hasil gagal", async () => {
		const userId = await buatBacalon("Raka Pratama", "raka@example.test", WAKTU_EKSPOR);
		await buatBerkasHilang(userId, WAKTU_EKSPOR);

		await jalankanTerjadwal(WAKTU_EKSPOR);

		const baris = await env.DB.prepare(
			'SELECT "aktor", "tindakan", "hasil" FROM "audit" WHERE "tindakan" = ?',
		).bind("ekspor_harian").all();
		expect(baris.results).toEqual([{ aktor: "Sistem", tindakan: "ekspor_harian", hasil: "gagal" }]);
	});

	it("run bertanggal WIB 27 September 2026 menyalin ke ekspor/pemeriksaan sekali, run 28 September tidak menimpanya", async () => {
		const userId = await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_PEMERIKSAAN_27_SEP);
		await buatBerkas(userId, WAKTU_PEMERIKSAAN_27_SEP, "identitas.pdf", encoder.encode("berkas identitas 5 okt"));

		await jalankanTerjadwal(WAKTU_PEMERIKSAAN_27_SEP);

		const snapshotCsv = await (await env.BERKAS.get("ekspor/pemeriksaan/bacalon.csv"))?.text();
		const snapshotZip = new Uint8Array(await (await env.BERKAS.get(`ekspor/pemeriksaan/${userId}.zip`))?.arrayBuffer() as ArrayBuffer);
		expect(snapshotCsv).toContain("Nabila Putri");

		// Roster berubah sebelum run berikutnya: akun baru masuk.
		const userBaru = await buatBacalon("Siti Aminah", "siti@example.test", WAKTU_PEMERIKSAAN_28_SEP);
		await buatBerkas(userBaru, WAKTU_PEMERIKSAAN_28_SEP, "identitas.pdf", encoder.encode("berkas identitas siti"));

		await jalankanTerjadwal(WAKTU_PEMERIKSAAN_28_SEP);

		// Snapshot Pemeriksaan tidak berubah sama sekali.
		const snapshotCsvSetelah = await (await env.BERKAS.get("ekspor/pemeriksaan/bacalon.csv"))?.text();
		const snapshotZipSetelah = new Uint8Array(await (await env.BERKAS.get(`ekspor/pemeriksaan/${userId}.zip`))?.arrayBuffer() as ArrayBuffer);
		expect(snapshotCsvSetelah).toBe(snapshotCsv);
		expect(snapshotCsvSetelah).not.toContain("Siti Aminah");
		expect(snapshotZipSetelah).toEqual(snapshotZip);
		expect(await env.BERKAS.head(`ekspor/pemeriksaan/${userBaru}.zip`)).toBeNull();

		// Terkini sebaliknya sudah memuat akun baru.
		const terkiniCsvSetelah = await (await env.BERKAS.get("ekspor/terkini/bacalon.csv"))?.text();
		expect(terkiniCsvSetelah).toContain("Siti Aminah");
	});

	it("run berikutnya menimpa ekspor/terkini, dan akun yang sudah tidak ada tidak tersisa di CSV maupun ZIP", async () => {
		const userA = await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_EKSPOR);
		await buatBerkas(userA, WAKTU_EKSPOR, "identitas-a.pdf", encoder.encode("isi awal A"));
		const userB = await buatBacalon("Raka Pratama", "raka@example.test", WAKTU_EKSPOR);
		await buatBerkas(userB, WAKTU_EKSPOR, "identitas-b.pdf", encoder.encode("isi B"));

		await jalankanTerjadwal(WAKTU_EKSPOR);
		expect(await env.BERKAS.head(`ekspor/terkini/${userA}.zip`)).not.toBeNull();
		expect(await env.BERKAS.head(`ekspor/terkini/${userB}.zip`)).not.toBeNull();

		// B keluar dari roster; A berubah isi berkasnya sehingga ZIP-nya pasti berubah pada run kedua.
		await env.DB.prepare('DELETE FROM "user" WHERE "id" = ?').bind(userB).run();
		await env.DB.prepare('DELETE FROM "berkas" WHERE "userId" = ?').bind(userA).run();
		await buatBerkas(userA, WAKTU_EKSPOR, "identitas-a-baru.pdf", encoder.encode("isi baru A"));

		await jalankanTerjadwal(WAKTU_EKSPOR);

		const csvSetelah = await (await env.BERKAS.get("ekspor/terkini/bacalon.csv"))?.text();
		expect(csvSetelah).toContain("Nabila Putri");
		expect(csvSetelah).not.toContain("Raka Pratama");
		expect(await env.BERKAS.head(`ekspor/terkini/${userB}.zip`)).toBeNull();

		const zipASetelah = new Uint8Array(await (await env.BERKAS.get(`ekspor/terkini/${userA}.zip`))?.arrayBuffer() as ArrayBuffer);
		const teksZipASetelah = teksByte(zipASetelah);
		expect(teksZipASetelah).toContain("isi baru A");
		expect(teksZipASetelah).not.toContain("isi awal A");
	});

	it("tahap Selesai menjalankan Penghapusan Akhir alih-alih Ekspor Harian (tiket 18), bukan sekadar tidak menulis", async () => {
		const userId = await buatBacalon("Nabila Putri", "nabila@example.test", WAKTU_EKSPOR);
		await buatBerkas(userId, WAKTU_EKSPOR, "identitas.pdf", encoder.encode("isi awal"));
		await jalankanTerjadwal(WAKTU_EKSPOR);
		expect(await env.BERKAS.head("ekspor/terkini/bacalon.csv")).not.toBeNull();

		await jalankanTerjadwal(WAKTU_SELESAI);

		// Bukan hanya "tidak menulis lagi": Penghapusan Akhir mengosongkan objek lama juga.
		expect(await env.BERKAS.head("ekspor/terkini/bacalon.csv")).toBeNull();
		expect(await env.BERKAS.head(`ekspor/terkini/${userId}.zip`)).toBeNull();
		expect(await env.DB.prepare('SELECT 1 FROM "user" WHERE "id" = ?').bind(userId).first()).toBeNull();

		const audit = await env.DB.prepare('SELECT "aktor", "tindakan", "hasil" FROM "audit"').all();
		expect(audit.results).toEqual([{ aktor: "Sistem", tindakan: "hapus_data", hasil: "berhasil" }]);
	});
});
