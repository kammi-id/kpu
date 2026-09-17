import { env } from "cloudflare:workers";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { jaringan } from "../test/jaringan";
import { verifikasiNia } from "./nia";

const RAHASIA_UJI = { KAMMI_ID_TOKEN: "token-kammi-id-uji" };
type EnvUji = Env & typeof RAHASIA_UJI;

function envUji(): EnvUji {
	return { ...env, ...RAHASIA_UJI };
}

const URL_ANGGOTA = (nia: string) => `https://www.kammi.id/api/v1/members/${nia}`;

let niaBerikutnya = 0;
/** NIA baru yang valid-format dan belum dipakai baris lain, per uji. */
function niaBaru() {
	niaBerikutnya += 1;
	return `3020100${String(niaBerikutnya).padStart(4, "0")}`;
}

async function buatBacalonDenganNia(nia: string) {
	const id = crypto.randomUUID();
	const waktu = new Date("2026-09-20T00:00:00.000Z");
	await env.DB.prepare(
		`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role", "whatsapp", "persetujuanVersi", "persetujuanPada", "nia", "banned", "banReason")
		 VALUES (?, ?, ?, 1, ?, ?, 'bacalon', ?, 'persetujuan-v1', ?, ?, NULL, NULL)`,
	)
		.bind(
			id,
			"Bacalon Duplikat Uji",
			`${id}@example.test`,
			waktu.toISOString(),
			waktu.toISOString(),
			`6281234${String(niaBerikutnya).padStart(6, "0")}`,
			waktu.toISOString(),
			nia,
		)
		.run();
	return id;
}

beforeEach(async () => {
	niaBerikutnya = 0;
	await env.DB.prepare('DELETE FROM "user"').run();
});

describe("verifikasiNia (modul verifikasi NIA bersama)", () => {
	it("menolak NIA yang bukan persis 11 digit angka, tanpa memanggil API eksternal", async () => {
		for (const nia of ["1234567890", "123456789012", "1234567890a", "", "abcdefghijk"]) {
			const hasil = await verifikasiNia(nia, envUji());
			expect(hasil).toEqual({ sukses: false, alasan: "formatTidakValid" });
		}
		// Tidak ada jaringan.use terdaftar sama sekali di uji ini: kalau kode
		// sempat memanggil fetch, MSW akan menolak permintaan tak terdaftar.
	});

	it("mendeteksi NIA yang sudah dipakai akun bacalon lain di database lokal, tanpa memanggil API eksternal", async () => {
		const nia = niaBaru();
		await buatBacalonDenganNia(nia);

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "duplikatLokal" });
		// Sengaja tidak ada jaringan.use terdaftar: urutan format → duplikat lokal
		// → panggilan eksternal berarti duplikat yang sudah diketahui tidak boleh
		// memicu panggilan kammi.id sama sekali (ticket 02, butir urutan).
	});

	it("respons 404 dari kammi.id menghasilkan alasan gagal tidak ditemukan", async () => {
		const nia = niaBaru();
		jaringan.use(http.get(URL_ANGGOTA(nia), () => new HttpResponse(null, { status: 404 })));

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "tidakDitemukan" });
	});

	it("jenjangKaderisasi bukan AB3 (meski keadaanKader aktif) menghasilkan alasan gagal tidak memenuhi syarat", async () => {
		const nia = niaBaru();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), () =>
				HttpResponse.json({ nia, nama: "Kader Bukan AB3", jenjangKaderisasi: "AB2", keadaanKader: "aktif" })),
		);

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "tidakMemenuhiSyarat" });
	});

	it("keadaanKader bukan aktif (meski jenjangKaderisasi AB3) menghasilkan alasan gagal tidak memenuhi syarat", async () => {
		const nia = niaBaru();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), () =>
				HttpResponse.json({ nia, nama: "Kader Tidak Aktif", jenjangKaderisasi: "AB3", keadaanKader: "nonaktif" })),
		);

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "tidakMemenuhiSyarat" });
	});

	it("jenjangKaderisasi AB3 dan keadaanKader aktif menghasilkan hasil sukses berisi nama persis dari kammi.id", async () => {
		const nia = niaBaru();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), async ({ request }) => {
				expect(request.headers.get("authorization")).toBe(`Bearer ${RAHASIA_UJI.KAMMI_ID_TOKEN}`);
				return HttpResponse.json({
					nia,
					nama: "Nabila Putri Kader AB3",
					jenjangKaderisasi: "AB3",
					keadaanKader: "aktif",
					struktur: { nama: "PD KAMMI Uji", jenjang: "Daerah" },
				});
			}),
		);

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: true, nama: "Nabila Putri Kader AB3" });
	});

	it("kegagalan jaringan ke kammi.id menghasilkan alasan gagal upstream generik yang bisa dicoba ulang", async () => {
		const nia = niaBaru();
		jaringan.use(
			http.get(URL_ANGGOTA(nia), () => {
				throw new Error("jaringan uji: koneksi ke kammi.id gagal");
			}),
		);

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "gagalUpstream" });
	});

	it("status HTTP lain (bukan 404, bukan sukses) dari kammi.id menghasilkan alasan gagal upstream generik", async () => {
		const nia = niaBaru();
		jaringan.use(http.get(URL_ANGGOTA(nia), () => new HttpResponse(null, { status: 500 })));

		const hasil = await verifikasiNia(nia, envUji());

		expect(hasil).toEqual({ sukses: false, alasan: "gagalUpstream" });
	});
});
