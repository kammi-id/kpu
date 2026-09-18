import { describe, expect, it } from "vitest";
import { tahunLulusDm3Valid } from "./profil";

describe("tahunLulusDm3Valid (tiket 22, jam suntik)", () => {
	it("menolak di bawah 1998 apa pun tahun berjalan", () => {
		expect(tahunLulusDm3Valid(1997, new Date("2026-06-01T00:00:00.000Z"))).toBe(false);
		expect(tahunLulusDm3Valid(1998, new Date("2026-06-01T00:00:00.000Z"))).toBe(true);
	});

	it("batas atas mengikuti tahun berjalan, bukan angka tetap", () => {
		expect(tahunLulusDm3Valid(2026, new Date("2026-06-01T00:00:00.000Z"))).toBe(true);
		expect(tahunLulusDm3Valid(2027, new Date("2026-06-01T00:00:00.000Z"))).toBe(false);
		expect(tahunLulusDm3Valid(2027, new Date("2027-06-01T00:00:00.000Z"))).toBe(true);
	});

	it("batas 31 Desember 23.59 UTC → 1 Januari 00.00 UTC menggeser batas atas satu tahun", () => {
		const akhirTahun = new Date("2026-12-31T23:59:59.000Z");
		const awalTahunBaru = new Date("2027-01-01T00:00:00.000Z");
		expect(tahunLulusDm3Valid(2027, akhirTahun)).toBe(false);
		expect(tahunLulusDm3Valid(2027, awalTahunBaru)).toBe(true);
	});

	it("menolak nilai bukan bilangan bulat", () => {
		expect(tahunLulusDm3Valid(2020.5, new Date("2026-06-01T00:00:00.000Z"))).toBe(false);
	});
});
