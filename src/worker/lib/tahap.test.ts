import { describe, expect, it } from "vitest";
import {
	bolehRegistrasi,
	bolehUbahBacalon,
	layananAktif,
	tahapPada,
	type Tahap,
} from "./tahap";

const MS = 1000;

const BATAS: { nama: string; mulaiUtc: string; tahapBaru: Tahap }[] = [
	{ nama: "Masa Pendaftaran", mulaiUtc: "2026-09-16T17:00:00.000Z", tahapBaru: "MasaPendaftaran" },
	{ nama: "Pemeriksaan", mulaiUtc: "2026-10-04T17:00:00.000Z", tahapBaru: "Pemeriksaan" },
	{ nama: "Masa Perbaikan", mulaiUtc: "2026-10-07T17:00:00.000Z", tahapBaru: "MasaPerbaikan" },
	{ nama: "Terkunci", mulaiUtc: "2026-10-11T17:00:00.000Z", tahapBaru: "Terkunci" },
	{ nama: "Selesai", mulaiUtc: "2027-01-24T17:00:00.000Z", tahapBaru: "Selesai" },
];

const SEBELUM: Record<Tahap, Tahap> = {
	BelumDibuka: "BelumDibuka",
	MasaPendaftaran: "BelumDibuka",
	Pemeriksaan: "MasaPendaftaran",
	MasaPerbaikan: "Pemeriksaan",
	Terkunci: "MasaPerbaikan",
	Selesai: "Terkunci",
};

describe("tahapPada", () => {
	for (const batas of BATAS) {
		const mulai = new Date(batas.mulaiUtc);
		const sebelum = new Date(mulai.getTime() - MS);

		it(`tepat sebelum mulai ${batas.nama} masih tahap sebelumnya`, () => {
			expect(tahapPada(sebelum)).toBe(SEBELUM[batas.tahapBaru]);
		});

		it(`tepat pada mulai ${batas.nama} sudah berganti tahap`, () => {
			expect(tahapPada(mulai)).toBe(batas.tahapBaru);
		});
	}

	it("jauh sebelum peluncuran adalah Belum dibuka", () => {
		expect(tahapPada(new Date("2026-01-01T00:00:00.000Z"))).toBe("BelumDibuka");
	});

	it("jauh setelah Penghapusan Akhir tetap Selesai", () => {
		expect(tahapPada(new Date("2030-01-01T00:00:00.000Z"))).toBe("Selesai");
	});
});

describe("predikat turunan", () => {
	const kasus: { tahap: Tahap; registrasi: boolean; ubah: boolean; aktif: boolean }[] = [
		{ tahap: "BelumDibuka", registrasi: false, ubah: false, aktif: true },
		{ tahap: "MasaPendaftaran", registrasi: true, ubah: true, aktif: true },
		{ tahap: "Pemeriksaan", registrasi: false, ubah: false, aktif: true },
		{ tahap: "MasaPerbaikan", registrasi: false, ubah: true, aktif: true },
		{ tahap: "Terkunci", registrasi: false, ubah: false, aktif: true },
		{ tahap: "Selesai", registrasi: false, ubah: false, aktif: false },
	];

	for (const { tahap, registrasi, ubah, aktif } of kasus) {
		it(`${tahap}: registrasi=${registrasi} ubah=${ubah} aktif=${aktif}`, () => {
			expect(bolehRegistrasi(tahap)).toBe(registrasi);
			expect(bolehUbahBacalon(tahap)).toBe(ubah);
			expect(layananAktif(tahap)).toBe(aktif);
		});
	}
});
