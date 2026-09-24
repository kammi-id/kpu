import { tahunLulusDm3Valid, tanggalLahirValid } from "./profil";

// Isi otomatis Data pribadi dari Formulir A.1 (tiket 23): kapabilitas baru,
// tanpa preseden OCR/ekstraksi dokumen di kodebase ini. Model visi Workers AI
// gratis (`gemma-4-26b-a4b-it`, lihat komentar wrangler.json) dipanggil lewat
// binding `env.AI`, bukan REST API kammi.id-style — tidak butuh rahasia
// terpisah. Fungsi ini SENGAJA tidak dipanggil langsung dari route: route
// menyuntikkannya sebagai parameter (pola sama seperti `sekarang`) supaya uji
// dapat mengganti seluruh panggilan AI tanpa binding sungguhan maupun jaringan
// (binding AI Workers SELALU memanggil layanan nyata, bahkan saat dev lokal —
// lihat peringatan wrangler dev; tidak ada cara memalsukannya lewat `msw`
// seperti `ambilStruktur`/`verifikasiNia`).
const MODEL_VISI = "@cf/google/gemma-4-26b-a4b-it";

export type MimeBerkasA1 = "application/pdf" | "image/jpeg" | "image/png";

export type EkstraksiA1 = {
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPd: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
};

export type HasilEkstraksiA1 = { sukses: true; data: EkstraksiA1 } | { sukses: false };

// Tanpa "node" di tsconfig.worker.json types (disengaja, lihat komentar di
// sana): tidak ada `Buffer` global. `String.fromCharCode(...potongan)` per
// potongan 32 KiB menghindari "Maximum call stack size exceeded" yang muncul
// bila seluruh berkas (maks 20 MB, lib/unggahBerkas.ts) disebar sekaligus ke
// satu pemanggilan fungsi.
const UKURAN_POTONGAN_BASE64 = 0x8000;

export function base64Dari(bytes: ArrayBuffer): string {
	const larik = new Uint8Array(bytes);
	let biner = "";
	for (let i = 0; i < larik.length; i += UKURAN_POTONGAN_BASE64) {
		biner += String.fromCharCode(...larik.subarray(i, i + UKURAN_POTONGAN_BASE64));
	}
	return btoa(biner);
}

const SKEMA_EKSTRAKSI = {
	type: "object",
	additionalProperties: false,
	required: [
		"namaPanggilan",
		"tempatLahir",
		"tanggalLahir",
		"asalPw",
		"asalPd",
		"tahunLulusDm3",
		"tempatLulusDm3",
		"capaianHafalan",
		"bahasaAsing",
	],
	properties: {
		namaPanggilan: { type: ["string", "null"], description: "Nama panggilan, atau null bila tidak terbaca." },
		tempatLahir: { type: ["string", "null"] },
		tanggalLahir: { type: ["string", "null"], description: "Format YYYY-MM-DD, atau null bila tidak terbaca." },
		asalPw: { type: ["string", "null"], description: "Nama Pengurus Wilayah (PW) KAMMI asal, apa adanya di formulir." },
		asalPd: { type: ["string", "null"], description: "Nama Pengurus Daerah (PD) KAMMI asal, apa adanya di formulir." },
		tahunLulusDm3: { type: ["integer", "null"] },
		tempatLulusDm3: { type: ["string", "null"] },
		capaianHafalan: { type: ["string", "null"] },
		bahasaAsing: { type: ["string", "null"] },
	},
};

function teksAtauNull(nilai: unknown): string | null {
	if (typeof nilai !== "string") return null;
	const dipangkas = nilai.trim();
	return dipangkas === "" ? null : dipangkas;
}

/** Menolak field yang salah bentuk (dilempar model) alih-alih meloloskannya — kolom terkait dibiarkan kosong (poin 4 tiket 23), bukan diisi paksa. */
function validasi(mentah: Record<string, unknown>, sekarang: Date): EkstraksiA1 {
	const tanggalLahir = teksAtauNull(mentah.tanggalLahir);
	const tahunLulusDm3 = typeof mentah.tahunLulusDm3 === "number" ? mentah.tahunLulusDm3 : null;
	return {
		namaPanggilan: teksAtauNull(mentah.namaPanggilan),
		tempatLahir: teksAtauNull(mentah.tempatLahir),
		tanggalLahir: tanggalLahir !== null && tanggalLahirValid(tanggalLahir) ? tanggalLahir : null,
		asalPw: teksAtauNull(mentah.asalPw),
		asalPd: teksAtauNull(mentah.asalPd),
		tahunLulusDm3: tahunLulusDm3 !== null && tahunLulusDm3Valid(tahunLulusDm3, sekarang) ? tahunLulusDm3 : null,
		tempatLulusDm3: teksAtauNull(mentah.tempatLulusDm3),
		capaianHafalan: teksAtauNull(mentah.capaianHafalan),
		bahasaAsing: teksAtauNull(mentah.bahasaAsing),
	};
}

/**
 * Memanggil model visi dengan berkas A.1 (base64) dan skema JSON di atas,
 * mengembalikan field yang berhasil terbaca. Kegagalan apa pun (panggilan AI,
 * respons bukan JSON, bentuk tak terduga) menghasilkan `{ sukses: false }` —
 * pemanggil (route) menerjemahkannya jadi "isi manual seperti biasa", tidak
 * pernah gagal keras (poin 4).
 */
export async function ekstraksiA1(
	ai: Ai,
	berkas: { bytesBase64: string; mime: MimeBerkasA1 },
	sekarang: Date,
): Promise<HasilEkstraksiA1> {
	const dataUri = `data:${berkas.mime};base64,${berkas.bytesBase64}`;
	const bagianBerkas =
		berkas.mime === "application/pdf"
			? ({ type: "file", file: { file_data: dataUri, filename: "formulir-a1.pdf" } } as const)
			: ({ type: "image_url", image_url: { url: dataUri } } as const);

	try {
		const respons = await ai.run(
			MODEL_VISI,
			{
				messages: [
					{
						role: "system",
						content:
							"Anda mengekstrak data dari Formulir A.1 Bacalon Ketua Umum KAMMI. Balas HANYA JSON sesuai skema yang diberikan. Field yang tidak ada atau tidak terbaca di berkas diisi null, jangan mengarang nilai.",
					},
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Ekstrak dari Formulir A.1 terlampir: nama panggilan, tempat lahir, tanggal lahir, asal PW, asal PD, tahun lulus AB 3, tempat lulus AB 3, capaian hafalan, bahasa asing.",
							},
							bagianBerkas,
						],
					},
				],
				response_format: { type: "json_schema", json_schema: { name: "ekstraksi_formulir_a1", schema: SKEMA_EKSTRAKSI, strict: true } },
			},
			{ signal: AbortSignal.timeout(30_000) },
		);

		const isi = respons.choices?.[0]?.message?.content;
		if (typeof isi !== "string") return { sukses: false };
		const mentah: unknown = JSON.parse(isi);
		if (!mentah || typeof mentah !== "object") return { sukses: false };
		return { sukses: true, data: validasi(mentah as Record<string, unknown>, sekarang) };
	} catch {
		return { sukses: false };
	}
}
