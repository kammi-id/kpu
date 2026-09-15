import type { JenisRekomendasi } from "~/react-app/lib/akunBerkas";

export type RingkasanBacalonAdmin = {
	id: string;
	name: string;
	whatsapp: string;
	dibuatPada: string;
	jumlahHadir: number;
	lengkap: boolean;
};

export type DetailBacalonAdmin = RingkasanBacalonAdmin & {
	email: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPd: string | null;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	instruktur: boolean | null;
	capaianHafalan: string | null;
	bahasaAsing: string | null;
	berkas: Array<{
		id: string;
		kelompok: number;
		namaAsli: string;
		mime: string;
		ukuranByte: number;
		jenisRekomendasi: JenisRekomendasi | null;
		diunggahPada: string;
	}>;
};

export async function ambilBacalonAdmin(query: string, signal?: AbortSignal) {
	const parameter = new URLSearchParams();
	if (query) parameter.set("q", query);
	const response = await fetch(`/api/admin${parameter.size ? `?${parameter}` : ""}`, { signal });
	if (!response.ok) throw new Error("Tabel Bakal Calon tidak dapat dimuat");
	return (await response.json() as { data: RingkasanBacalonAdmin[] }).data;
}

export async function ambilDetailBacalonAdmin(id: string, signal?: AbortSignal) {
	const response = await fetch(`/api/admin/${encodeURIComponent(id)}`, { signal });
	if (response.status === 404) return null;
	if (!response.ok) throw new Error("Detail Bakal Calon tidak dapat dimuat");
	return await response.json() as DetailBacalonAdmin;
}

export function urlUnduhAdmin(userId: string, berkasId: string) {
	return `/api/admin/${encodeURIComponent(userId)}/berkas/${encodeURIComponent(berkasId)}/unduh`;
}
