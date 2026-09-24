import type { JenisRekomendasi } from "~/react-app/lib/akunBerkas";

export type RingkasanBacalonAdmin = {
	id: string;
	name: string;
	whatsapp: string;
	dibuatPada: string;
	jumlahHadir: number;
	lengkap: boolean;
	mintaDitutup: boolean;
};

export type DetailBacalonAdmin = RingkasanBacalonAdmin & {
	email: string;
	nia: string;
	namaPanggilan: string | null;
	tempatLahir: string | null;
	tanggalLahir: string | null;
	asalPw: string | null;
	asalPwManual?: boolean;
	asalPd: string | null;
	asalPdManual?: boolean;
	tahunLulusDm3: number | null;
	tempatLulusDm3: string | null;
	tempatLulusDm3Manual?: boolean;
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

export function urlPratinjauAdmin(userId: string, berkasId: string) {
	return `/api/admin/${encodeURIComponent(userId)}/berkas/${encodeURIComponent(berkasId)}/pratinjau`;
}

export type KategoriEkspor = "terkini" | "pemeriksaan";

export function urlEksporCsv(kategori: KategoriEkspor) {
	return `/api/admin/ekspor/${kategori}`;
}

export function urlEksporZip(userId: string, kategori: KategoriEkspor) {
	return `/api/admin/${encodeURIComponent(userId)}/ekspor/${kategori}`;
}

export async function resetPasswordAdmin(userId: string, password: string) {
	const response = await fetch(`/api/admin/${encodeURIComponent(userId)}/reset-password`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ password }),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(body?.error === "konfirmasi_kata_sandi_gagal" ? "Kata sandi Admin salah." : "Reset kata sandi gagal.");
	}
	return (await response.json() as { password: string }).password;
}

export async function hapusDataAkunAdmin(userId: string, password: string) {
	const response = await fetch(`/api/admin/${encodeURIComponent(userId)}/hapus-data`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ password }),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(body?.error === "konfirmasi_kata_sandi_gagal" ? "Kata sandi Admin salah." : "Hapus data akun gagal.");
	}
}
