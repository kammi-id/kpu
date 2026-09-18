import { describe, expect, it } from "vitest";
import { cocokkanStruktur } from "./strukturCocok";

const DAFTAR = [
	{ id: "pw-1", nama: "PW KAMMI Jawa Barat", slug: "jabar", jenis: "pw" },
	{ id: "pw-2", nama: "PW KAMMI DKI Jakarta", slug: "dki", jenis: "pw" },
];

describe("cocokkanStruktur (tiket 23)", () => {
	it("cocok persis", () => {
		expect(cocokkanStruktur("PW KAMMI Jawa Barat", DAFTAR)).toEqual(DAFTAR[0]);
	});

	it("mengabaikan huruf besar/kecil dan spasi berulang", () => {
		expect(cocokkanStruktur("pw   kammi   jawa barat", DAFTAR)).toEqual(DAFTAR[0]);
	});

	it("mengabaikan awalan umum PW/Pengurus Wilayah yang tidak ada di teks ekstraksi", () => {
		expect(cocokkanStruktur("KAMMI DKI Jakarta", DAFTAR)).toEqual(DAFTAR[1]);
		expect(cocokkanStruktur("Pengurus Wilayah KAMMI DKI Jakarta", DAFTAR)).toEqual(DAFTAR[1]);
	});

	it("null bila tidak ada kecocokan atau teks kosong", () => {
		expect(cocokkanStruktur("PW KAMMI Sumatera Utara", DAFTAR)).toBeNull();
		expect(cocokkanStruktur("   ", DAFTAR)).toBeNull();
	});
});
