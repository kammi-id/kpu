import type { EnvDenganRahasia } from "./auth";

// Struktur PW/PD kammi.id (tiket 21). Dipanggil manual dengan token non-prod
// untuk mendokumentasikan bentuk respons sebelum kontrak tipe ditulis:
//   GET https://www.kammi.id/api/v1/struktur?jenis=pw|pd|pk[&ancestor=<id>]
// (host kanonik "www.kammi.id" — "kammi.id" polos membalas 301, sama seperti
// KAMMI_ID_MEMBERS_URL di lib/nia.ts). Respons sukses (200) adalah array
// datar, TIDAK bersarang dan TANPA field induk/parent:
//   [{"id":"019eb0f7-a914-...", "nama":"PW KAMMI Aceh", "slug":"aceh", "jenis":"pw"}, ...]
// "ancestor" murni parameter query yang memfilter isi array (dicoba dengan id
// PW DKI Jakarta di atas jenis=pd: hasilnya 3 PD di bawahnya, dari total ~120
// PD nasional tanpa filter) — bukan field yang dikembalikan di setiap baris.
// jenis=pd TANPA ancestor tetap dibalas 200 berisi seluruh PD nasional;
// mewajibkan ancestor adalah keputusan aplikasi ini sendiri (lihat
// routes/struktur.ts), bukan syarat upstream. Upstream juga mengenal jenis
// "pk" (tidak dipakai aplikasi ini). Token salah/tidak ada -> 401 tanpa body.
// jenis tidak dikenal -> 400 {"error": "..."}.
const KAMMI_ID_STRUKTUR_URL = "https://www.kammi.id/api/v1/struktur";

export type JenisStruktur = "pw" | "pd";

/** Baris mentah dari kammi.id — diteruskan apa adanya, tidak dipetakan ulang. */
export type StrukturKammiId = { id: string; nama: string; slug: string; jenis: string };

export type HasilStruktur = { sukses: true; data: StrukturKammiId[] } | { sukses: false };

/**
 * Meneruskan permintaan struktur PW/PD ke kammi.id memakai `KAMMI_ID_TOKEN`
 * (tiket 21) — satu-satunya tempat token ini disisipkan untuk endpoint ini,
 * supaya peramban tidak pernah memanggil kammi.id langsung ataupun memegang
 * tokennya sendiri.
 */
export async function ambilStruktur(
	jenis: JenisStruktur,
	ancestor: string | undefined,
	env: EnvDenganRahasia,
): Promise<HasilStruktur> {
	const url = new URL(KAMMI_ID_STRUKTUR_URL);
	url.searchParams.set("jenis", jenis);
	if (ancestor) url.searchParams.set("ancestor", ancestor);

	try {
		const response = await fetch(url, {
			headers: { authorization: `Bearer ${env.KAMMI_ID_TOKEN}` },
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) return { sukses: false };
		return { sukses: true, data: (await response.json()) as StrukturKammiId[] };
	} catch {
		return { sukses: false };
	}
}
