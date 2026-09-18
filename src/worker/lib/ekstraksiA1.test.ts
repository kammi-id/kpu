import { describe, expect, it } from "vitest";
import { base64Dari, ekstraksiA1 } from "./ekstraksiA1";

const SEKARANG = new Date("2026-09-20T00:00:00.000Z");

describe("base64Dari (tiket 23)", () => {
	it("mengonversi ArrayBuffer ke string base64 yang valid", () => {
		const bytes = new TextEncoder().encode("Halo KPU KAMMI 2026");
		const base64 = base64Dari(bytes.buffer);
		expect(atob(base64)).toBe("Halo KPU KAMMI 2026");
	});

	it("menangani buffer besar yang melebihi ukuran potongan 32 KiB tanpa error stack", () => {
		const ukuran = 70 * 1024;
		const bytes = new Uint8Array(ukuran);
		for (let i = 0; i < ukuran; i++) bytes[i] = i % 256;
		const base64 = base64Dari(bytes.buffer);
		expect(base64.length).toBeGreaterThan(ukuran);
	});
});

describe("ekstraksiA1 (tiket 23)", () => {
	it("mengembalikan data tervalidasi saat model AI mengembalikan JSON skema valid", async () => {
		const ai = {
			run: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify({
								namaPanggilan: "Ilham",
								tempatLahir: "Bandung",
								tanggalLahir: "1998-05-12",
								asalPw: "PW KAMMI Jawa Barat",
								asalPd: "PD KAMMI Bandung",
								tahunLulusDm3: 2022,
								tempatLulusDm3: "PW KAMMI Jawa Barat",
								instruktur: true,
								capaianHafalan: "5 Juz",
								bahasaAsing: "Arab, Inggris",
							}),
						},
					},
				],
			}),
		} as unknown as Ai;

		const hasil = await ekstraksiA1(ai, { bytesBase64: "dGVzdA==", mime: "application/pdf" }, SEKARANG);
		expect(hasil.sukses).toBe(true);
		if (!hasil.sukses) return;
		expect(hasil.data).toEqual({
			namaPanggilan: "Ilham",
			tempatLahir: "Bandung",
			tanggalLahir: "1998-05-12",
			asalPw: "PW KAMMI Jawa Barat",
			asalPd: "PD KAMMI Bandung",
			tahunLulusDm3: 2022,
			tempatLulusDm3: "PW KAMMI Jawa Barat",
			instruktur: true,
			capaianHafalan: "5 Juz",
			bahasaAsing: "Arab, Inggris",
		});
	});

	it("memvalidasi dan mengosongkan (null) tanggal/tahun/tipe data yang salah bentuk dari model", async () => {
		const ai = {
			run: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify({
								namaPanggilan: "   ",
								tempatLahir: "Jakarta",
								tanggalLahir: "2026-02-30", // tanggal tak sah
								asalPw: "PW KAMMI DKI Jakarta",
								asalPd: null,
								tahunLulusDm3: 1990, // di bawah batas 1998
								tempatLulusDm3: null,
								instruktur: "bukan boolean", // tipe salah
								capaianHafalan: null,
								bahasaAsing: "",
							}),
						},
					},
				],
			}),
		} as unknown as Ai;

		const hasil = await ekstraksiA1(ai, { bytesBase64: "dGVzdA==", mime: "image/png" }, SEKARANG);
		expect(hasil.sukses).toBe(true);
		if (!hasil.sukses) return;
		expect(hasil.data.namaPanggilan).toBeNull();
		expect(hasil.data.tanggalLahir).toBeNull();
		expect(hasil.data.tahunLulusDm3).toBeNull();
		expect(hasil.data.instruktur).toBeNull();
		expect(hasil.data.bahasaAsing).toBeNull();
		expect(hasil.data.tempatLahir).toBe("Jakarta");
	});

	it("mengembalikan { sukses: false } ketika model melempar galat (mis. timeout/jaringan)", async () => {
		const ai = {
			run: async () => {
				throw new Error("AI gateway timeout");
			},
		} as unknown as Ai;

		const hasil = await ekstraksiA1(ai, { bytesBase64: "dGVzdA==", mime: "image/jpeg" }, SEKARANG);
		expect(hasil.sukses).toBe(false);
	});

	it("mengembalikan { sukses: false } ketika respons model bukan JSON yang valid", async () => {
		const ai = {
			run: async () => ({
				choices: [{ message: { content: "Maaf, saya tidak dapat membaca dokumen ini." } }],
			}),
		} as unknown as Ai;

		const hasil = await ekstraksiA1(ai, { bytesBase64: "dGVzdA==", mime: "application/pdf" }, SEKARANG);
		expect(hasil.sukses).toBe(false);
	});

	it("mengembalikan { sukses: false } ketika choices kosong atau message content bukan string", async () => {
		const ai = {
			run: async () => ({ choices: [] }),
		} as unknown as Ai;

		const hasil = await ekstraksiA1(ai, { bytesBase64: "dGVzdA==", mime: "application/pdf" }, SEKARANG);
		expect(hasil.sukses).toBe(false);
	});
});
