export type BerkasPublik = {
	id: string;
	judul: string;
	urutan: number;
	namaAsli: string;
	mime: string;
	ukuranByte: number;
};

export type PeraturanPublik = {
	isiMarkdown: string | null;
	berkasPublik: BerkasPublik[];
};

export async function ambilPeraturan(signal?: AbortSignal): Promise<PeraturanPublik> {
	const response = await fetch("/api/peraturan", { signal });
	if (!response.ok) throw new Error("Peraturan tidak dapat dimuat");
	return (await response.json()) as PeraturanPublik;
}

export async function ambilUnduhan(signal?: AbortSignal): Promise<BerkasPublik[]> {
	const response = await fetch("/api/unduhan", { signal });
	if (!response.ok) throw new Error("Unduhan tidak dapat dimuat");
	return ((await response.json()) as { berkasPublik: BerkasPublik[] }).berkasPublik;
}

export function urlUnduhBerkasPublik(id: string) {
	return `/api/berkas-publik/${encodeURIComponent(id)}`;
}

/** Berkas Publik (Peraturan dan Formulir) hanya menerima PDF atau DOCX, sesuai `validasiUnggahPublik` di Worker. */
export const MAKS_UKURAN_BERKAS_PUBLIK = 20 * 1024 * 1024;

export function mimeDariNamaBerkasPublik(namaAsli: string): string | null {
	const bawah = namaAsli.toLowerCase();
	if (bawah.endsWith(".pdf")) return "application/pdf";
	if (bawah.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	return null;
}

export async function unggahBerkasPublik(params: {
	kategori: "peraturan" | "formulir";
	judul: string;
	urutan: number;
	file: File;
}): Promise<void> {
	const mime = mimeDariNamaBerkasPublik(params.file.name);
	if (!mime) throw new Error("Berkas harus berupa PDF atau DOCX.");
	if (params.file.size > MAKS_UKURAN_BERKAS_PUBLIK) throw new Error("Berkas tidak boleh lebih dari 20 MiB.");
	const query = new URLSearchParams({
		judul: params.judul,
		kategori: params.kategori,
		urutan: String(params.urutan),
		namaAsli: params.file.name,
	});
	const response = await fetch(`/api/admin/berkas-publik?${query}`, {
		method: "POST",
		headers: { "content-type": mime },
		body: params.file,
	});
	if (!response.ok) throw new Error("Berkas tidak dapat diunggah.");
}

export async function hapusBerkasPublik(id: string): Promise<void> {
	const response = await fetch(`/api/admin/berkas-publik/${encodeURIComponent(id)}`, { method: "DELETE" });
	if (!response.ok) throw new Error("Berkas tidak dapat dihapus.");
}
