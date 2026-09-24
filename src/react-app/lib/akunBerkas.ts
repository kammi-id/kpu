// `vKelengkapan` adalah satu-satunya sumber Status Kelengkapan Berkas (spec
// "Skema D1"): `ambilKelengkapanBerkas` membaca bentuk yang sama dipakai
// sidebar (AkunLayout, dari /api/akun) dan /akun/berkas — tidak ada
// perhitungan kedua di klien.

export type KelengkapanBerkas = {
	userId: string;
	k1: number;
	k2: number;
	k3: number;
	k4: number;
	k5: number;
	k6: number;
	k7: number;
	k8: number;
	k9: number;
	jumlahHadir: number;
	lengkap: number;
};

export type JenisRekomendasi = "A3_PW" | "A4_PD";

export type BerkasItem = {
	id: string;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
	jenisRekomendasi: JenisRekomendasi | null;
	diunggahPada: string;
};

export async function ambilKelengkapanBerkas(signal?: AbortSignal): Promise<KelengkapanBerkas> {
	const response = await fetch("/api/akun/berkas", { signal });
	if (!response.ok) throw new Error("Status Kelengkapan Berkas tidak dapat dimuat");
	return (await response.json()) as KelengkapanBerkas;
}

export async function ambilBerkasKelompok(nomor: number, signal?: AbortSignal): Promise<BerkasItem[]> {
	const response = await fetch(`/api/akun/berkas/${nomor}`, { signal });
	if (!response.ok) throw new Error("Berkas tidak dapat dimuat");
	return ((await response.json()) as { data: BerkasItem[] }).data;
}

export function urlUnduhBerkas(nomor: number, id: string) {
	return `/api/akun/berkas/${nomor}/${encodeURIComponent(id)}/unduh`;
}

export function urlPratinjauBerkas(nomor: number, id: string) {
	return `/api/akun/berkas/${nomor}/${encodeURIComponent(id)}/pratinjau`;
}

/** MIME dari ekstensi nama berkas — dipakai klien sebelum unggah (server tervalidasi ulang di lib/unggahBerkas.ts). */
export function mimeDariNamaBerkas(namaAsli: string): string | null {
	const ekstensi = namaAsli.toLowerCase().split(".").pop();
	if (ekstensi === "pdf") return "application/pdf";
	if (ekstensi === "jpg" || ekstensi === "jpeg") return "image/jpeg";
	if (ekstensi === "png") return "image/png";
	return null;
}

export async function unggahBerkasKelompok(nomor: number, file: File, mime: string, jenisRekomendasi?: JenisRekomendasi): Promise<{ id: string }> {
	const query = new URLSearchParams({ namaAsli: file.name });
	if (jenisRekomendasi) query.set("jenisRekomendasi", jenisRekomendasi);
	const response = await fetch(`/api/akun/berkas/${nomor}?${query}`, {
		method: "POST",
		headers: { "content-type": mime },
		body: file,
	});
	if (!response.ok) throw new Error("Berkas tidak dapat diunggah");
	return (await response.json()) as { id: string };
}
