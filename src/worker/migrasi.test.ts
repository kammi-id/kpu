import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { indukCascade, periksaCascadeMigrasi, type Migrasi } from "./test/analisisMigrasi";
import { BENIH, hashSetelahMigrasi } from "./test/replayMigrasi";

/**
 * Satu-satunya pelanggaran yang boleh ada: migrasi 0003 SUDAH dijalankan di
 * produksi (18 Sep 2026 10.57 UTC) dan menghapus seluruh baris "account",
 * "session", "profil", dan "berkas" lewat cascade. Riwayat tidak dapat
 * diubah, jadi ia dicatat di sini sebagai satu-satunya pengecualian.
 *
 * Migrasi BARU tidak boleh menambah entri ke daftar ini. Bila uji di bawah
 * gagal, migrasi yang baru ditulis akan menghapus data diam-diam — bangun
 * ulang tabel induk dengan pola simpan-dan-kembalikan, lihat analisisMigrasi.ts.
 */
const PELANGGARAN_HISTORIS = [
	{
		migrasi: "0003_migrasi_skema_nia.sql",
		induk: "user",
		anak: ["account", "berkas", "profil", "session"],
	},
];

describe("indukCascade", () => {
	it("menangkap foreign key kolom dengan ON DELETE CASCADE", () => {
		const badan = `"id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE`;
		expect(indukCascade(badan)).toEqual(["user"]);
	});

	it("mengabaikan referensi tanpa aksi hapus cascade", () => {
		const badan = `"userId" TEXT REFERENCES "user" ("id"), "b" TEXT REFERENCES "x" ("id") ON DELETE SET NULL`;
		expect(indukCascade(badan)).toEqual([]);
	});

	it("membedakan ON UPDATE CASCADE dari ON DELETE CASCADE", () => {
		const badan = `"userId" TEXT REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE RESTRICT`;
		expect(indukCascade(badan)).toEqual([]);
	});

	it("menangkap FOREIGN KEY tingkat tabel", () => {
		const badan = `"userId" TEXT NOT NULL, FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE`;
		expect(indukCascade(badan)).toEqual(["user"]);
	});
});

describe("periksaCascadeMigrasi", () => {
	const induk = `CREATE TABLE "user" ("id" TEXT NOT NULL PRIMARY KEY)`;
	const anak = `CREATE TABLE "account" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE)`;

	const jalankan = (queries: string[]): Migrasi[] => [{ name: "uji.sql", queries }];

	it("menandai pembangunan ulang tabel induk lewat DROP TABLE", () => {
		const hasil = periksaCascadeMigrasi(
			jalankan([
				induk,
				anak,
				`CREATE TABLE "user_baru" ("id" TEXT NOT NULL PRIMARY KEY, "nia" TEXT)`,
				`INSERT INTO "user_baru" SELECT "id", NULL FROM "user"`,
				`DROP TABLE "user"`,
				`ALTER TABLE "user_baru" RENAME TO "user"`,
			]),
		);
		expect(hasil).toEqual([{ migrasi: "uji.sql", induk: "user", anak: ["account"] }]);
	});

	it("membiarkan DROP TABLE atas tabel tanpa anak cascade", () => {
		expect(periksaCascadeMigrasi(jalankan([induk, anak, `DROP TABLE "account"`]))).toEqual([]);
	});

	it("membiarkan DROP TABLE setelah anaknya lebih dulu dijatuhkan", () => {
		expect(periksaCascadeMigrasi(jalankan([induk, anak, `DROP TABLE "account"`, `DROP TABLE "user"`]))).toEqual([]);
	});

	it("mengikuti anak yang berpindah saat induknya berganti nama", () => {
		const hasil = periksaCascadeMigrasi(
			jalankan([induk, anak, `ALTER TABLE "user" RENAME TO "pengguna"`, `DROP TABLE "pengguna"`]),
		);
		expect(hasil).toEqual([{ migrasi: "uji.sql", induk: "pengguna", anak: ["account"] }]);
	});

	it("tidak menghitung tabel sebagai anaknya sendiri", () => {
		const mandiri = `CREATE TABLE "simpul" ("id" TEXT PRIMARY KEY, "indukId" TEXT REFERENCES "simpul" ("id") ON DELETE CASCADE)`;
		expect(periksaCascadeMigrasi(jalankan([mandiri, `DROP TABLE "simpul"`]))).toEqual([]);
	});
});

describe("migrasi repositori", () => {
	it("tidak menjatuhkan tabel induk cascade selain pelanggaran historis", () => {
		expect(periksaCascadeMigrasi(env.TEST_MIGRATIONS)).toEqual(PELANGGARAN_HISTORIS);
	});
});

/**
 * Invarian sesungguhnya, dan satu-satunya yang tidak bergantung pada tebakan
 * bentuk SQL berbahaya: akun yang SUDAH ADA sebelum sebuah migrasi harus
 * tetap ada — beserta hash kata sandinya — setelah migrasi itu dijalankan.
 *
 * Analisis statis di atas hanya mengenali satu pola (DROP TABLE atas induk
 * cascade). Uji ini menangkap seluruh sisanya: DROP TABLE "account" langsung,
 * DELETE FROM "user", maupun pembangunan ulang yang lupa menyalin kolom
 * "password" — semuanya melewati analisis statis tanpa keluhan.
 *
 * Setiap batas migrasi diuji terpisah, bukan hanya yang terakhir, supaya satu
 * PR yang menambah beberapa migrasi sekaligus tetap terjaga seluruhnya.
 */
describe("migrasi mempertahankan akun yang sudah ada", () => {
	const migrasi = env.TEST_MIGRATIONS;

	/**
	 * Pemutaran ulang dimulai SETELAH migrasi rusak terakhir yang sudah
	 * terlanjur dijalankan di produksi. Membenihkan lebih awal dari itu selalu
	 * gagal karena 0003 — kegagalan yang nyata tetapi sudah terjadi dan tidak
	 * dapat diperbaiki lagi; yang dijaga di sini adalah migrasi BERIKUTNYA.
	 * Batas ini diturunkan dari PELANGGARAN_HISTORIS, jadi ia ikut bergeser
	 * hanya bila daftar itu sendiri berubah.
	 */
	const awal = Math.max(
		1,
		...PELANGGARAN_HISTORIS.map(({ migrasi: nama }) => migrasi.findIndex((m) => m.name === nama) + 1),
	);

	for (let batas = awal; batas < migrasi.length; batas++) {
		const sesudahnya = migrasi.slice(batas).map((m) => m.name).join(", ");
		it(`hash kata sandi bertahan melewati ${sesudahnya}`, async () => {
			expect(await hashSetelahMigrasi(env.DB, migrasi, batas)).toBe(BENIH.hash);
		});
	}

	it("menjaga setidaknya satu batas migrasi", () => {
		expect(migrasi.length).toBeGreaterThan(awal);
	});
});

/**
 * Asumsi yang menjadi dasar seluruh pemeriksaan di atas, diuji langsung
 * terhadap D1 supaya perubahan perilaku platform ketahuan, bukan diam-diam
 * membuat guard ini mubazir atau justru terlalu ketat.
 */
describe("perilaku foreign key D1", () => {
	it("menegakkan foreign key dan menolak mematikannya", async () => {
		await env.DB.prepare("PRAGMA foreign_keys = OFF").run();
		const hasil = await env.DB.prepare("PRAGMA foreign_keys").first<{ foreign_keys: number }>();
		expect(hasil?.foreign_keys).toBe(1);
	});

	it("menghapus baris anak saat tabel induk dijatuhkan", async () => {
		await env.DB.batch([
			env.DB.prepare(`CREATE TABLE "ujiInduk" ("id" TEXT PRIMARY KEY)`),
			env.DB.prepare(
				`CREATE TABLE "ujiAnak" ("id" TEXT PRIMARY KEY, "indukId" TEXT NOT NULL REFERENCES "ujiInduk" ("id") ON DELETE CASCADE)`,
			),
			env.DB.prepare(`INSERT INTO "ujiInduk" VALUES ('i1')`),
			env.DB.prepare(`INSERT INTO "ujiAnak" VALUES ('a1', 'i1')`),
		]);

		// Saran dokumentasi D1 untuk migrasi; tidak menunda AKSI cascade.
		await env.DB.prepare("PRAGMA defer_foreign_keys = true").run();
		await env.DB.batch([
			env.DB.prepare(`CREATE TABLE "ujiIndukBaru" ("id" TEXT PRIMARY KEY, "tambahan" TEXT)`),
			env.DB.prepare(`INSERT INTO "ujiIndukBaru" SELECT "id", NULL FROM "ujiInduk"`),
			env.DB.prepare(`DROP TABLE "ujiInduk"`),
			env.DB.prepare(`ALTER TABLE "ujiIndukBaru" RENAME TO "ujiInduk"`),
		]);

		const induk = await env.DB.prepare(`SELECT COUNT(*) AS "n" FROM "ujiInduk"`).first<{ n: number }>();
		const anak = await env.DB.prepare(`SELECT COUNT(*) AS "n" FROM "ujiAnak"`).first<{ n: number }>();
		expect(induk?.n).toBe(1);
		expect(anak?.n).toBe(0);

		await env.DB.batch([
			env.DB.prepare(`DROP TABLE "ujiAnak"`),
			env.DB.prepare(`DROP TABLE "ujiInduk"`),
		]);
	});
});
